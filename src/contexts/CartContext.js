import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../services/apiClient.js';
import {
  addCartItem,
  getCart,
  InvalidCartResponseError,
  removeCartItem,
  updateCartItemQuantity,
} from '../services/cartService.js';
import { normalizeNonNegativeInt64, normalizePositiveInt64 } from '../services/int64.js';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const MAX_CART_QUANTITY = 2147483647;

function getQuantityLimit(availableQuantity) {
  const available = normalizeNonNegativeInt64(availableQuantity);
  if (!available || available === '0') {
    return 0;
  }

  const maximumQuantity = String(MAX_CART_QUANTITY);
  if (
    available.length > maximumQuantity.length ||
    (available.length === maximumQuantity.length && available > maximumQuantity)
  ) {
    return MAX_CART_QUANTITY;
  }

  return Number(available);
}

function quantityFitsAvailability(quantity, availableQuantity) {
  const available = normalizeNonNegativeInt64(availableQuantity);
  if (!available) {
    return false;
  }

  const requested = String(quantity);
  return requested.length < available.length ||
    (requested.length === available.length && requested <= available);
}

function getCartErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'A quantidade informada não é válida para este produto.';
    }
    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente para acessar a sacola.';
    }
    if (error.status === 403) {
      return 'Sua conta não tem autorização para acessar a sacola de cliente.';
    }
    if (error.status === 404) {
      return 'O produto ou item não foi encontrado. Atualize a sacola antes de tentar novamente.';
    }
    if (error.status === 409) {
      return 'A quantidade não está mais disponível. Atualize a sacola para conferir o estoque.';
    }
    if (error.status === 502 || error.status === 503) {
      return 'O serviço de catálogo ou estoque está indisponível. Tente novamente mais tarde.';
    }
    return `Não foi possível atualizar a sacola (HTTP ${error.status}).`;
  }

  if (error instanceof InvalidCartResponseError) {
    return 'A API retornou dados de sacola inválidos. Atualize para tentar novamente.';
  }

  if (
    error instanceof Error &&
    (error.message.startsWith('API não configurada.') ||
      error.message.startsWith('Sua sessão não está válida.'))
  ) {
    return error.message;
  }

  return 'Falha de comunicação com a sacola. Verifique a conexão e tente novamente.';
}

function needsReconciliation(error) {
  if (!(error instanceof ApiError)) {
    return true;
  }
  return error.status === 404 ||
    error.status === 408 ||
    error.status === 409 ||
    error.status === 429 ||
    error.status >= 500;
}

function mapCartItem(item) {
  return {
    key: String(item.productId),
    productId: String(item.productId),
    productType: item.productType,
    product: {
      id: String(item.productId),
      name: item.name,
      brand: item.brand,
      model: item.model,
      image: item.image ? { uri: item.image } : null,
      type: item.productType === 'SINGLE_UNIT'
        ? 'UNITÁRIO'
        : item.productType === 'MULTI_UNIT'
          ? 'QUANTITATIVO'
          : null,
      active: item.active,
      productAvailable: item.productAvailable,
      available: item.available,
    },
    variant: null,
    quantity: item.desiredQuantity,
    maximum: getQuantityLimit(item.availableQuantity),
    quantityOnHand: item.quantityOnHand,
    quantityReserved: item.quantityReserved,
    availableQuantity: item.availableQuantity,
    active: item.active,
    productAvailable: item.productAvailable,
    available: item.available,
    unitPrice: item.unitPrice,
    estimatedSubtotal: item.estimatedSubtotal,
    addedAt: item.addedAt,
    updatedAt: item.updatedAt,
  };
}

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const hasCustomerRole = user?.role === 'CLIENTE';
  const isCustomer = hasCustomerRole && typeof token === 'string' && token.trim().length > 0;
  const sessionKey = isCustomer ? token : null;
  const [state, setState] = useState({
    sessionKey: null,
    status: 'idle',
    cart: null,
    error: '',
    reconciliationRequired: false,
    pendingOperation: null,
    pendingItemKey: null,
  });
  const stateRef = useRef(state);
  const activeSessionRef = useRef(sessionKey);
  const sessionGenerationRef = useRef(0);
  const requestGenerationRef = useRef(0);
  const mutationLockRef = useRef(false);
  stateRef.current = state;
  activeSessionRef.current = sessionKey;

  useEffect(() => {
    const sessionGeneration = ++sessionGenerationRef.current;
    const requestGeneration = ++requestGenerationRef.current;
    mutationLockRef.current = false;

    if (!sessionKey || !token || !isCustomer) {
      setState({
        sessionKey: null,
        status: hasCustomerRole ? 'error' : 'idle',
        cart: null,
        error: hasCustomerRole
          ? 'Sua sessão não está válida. Entre novamente para acessar a sacola.'
          : '',
        reconciliationRequired: false,
        pendingOperation: null,
        pendingItemKey: null,
      });
      return undefined;
    }

    let active = true;
    setState({
      sessionKey,
      status: 'loading',
      cart: null,
      error: '',
      reconciliationRequired: false,
      pendingOperation: null,
      pendingItemKey: null,
    });

    getCart(token)
      .then((cart) => {
        if (
          active &&
          sessionGenerationRef.current === sessionGeneration &&
          requestGenerationRef.current === requestGeneration
        ) {
          setState({
            sessionKey,
            status: 'ready',
            cart,
            error: '',
            reconciliationRequired: false,
            pendingOperation: null,
            pendingItemKey: null,
          });
        }
      })
      .catch((error) => {
        if (
          active &&
          sessionGenerationRef.current === sessionGeneration &&
          requestGenerationRef.current === requestGeneration
        ) {
          setState({
            sessionKey,
            status: 'error',
            cart: null,
            error: getCartErrorMessage(error),
            reconciliationRequired: false,
            pendingOperation: null,
            pendingItemKey: null,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [hasCustomerRole, isCustomer, sessionKey, token]);

  const refreshCart = useCallback(async () => {
    if (!sessionKey || !token || activeSessionRef.current !== sessionKey) {
      return { ok: false, message: 'Entre como cliente para atualizar a sacola.' };
    }

    if (mutationLockRef.current) {
      return { ok: false, message: 'Aguarde a operação atual antes de atualizar a sacola.' };
    }

    const currentState = stateRef.current;
    if (
      currentState.sessionKey === sessionKey &&
      ['loading', 'refreshing'].includes(currentState.status)
    ) {
      return { ok: false, message: 'A sacola já está sendo atualizada.' };
    }

    const sessionGeneration = sessionGenerationRef.current;
    const requestGeneration = ++requestGenerationRef.current;
    const currentCart = currentState.sessionKey === sessionKey ? currentState.cart : null;
    setState({
      sessionKey,
      status: currentCart ? 'refreshing' : 'loading',
      cart: currentCart,
      error: '',
      reconciliationRequired: currentState.sessionKey === sessionKey
        ? currentState.reconciliationRequired
        : false,
      pendingOperation: null,
      pendingItemKey: null,
    });

    try {
      const cart = await getCart(token);
      if (
        sessionGenerationRef.current !== sessionGeneration ||
        requestGenerationRef.current !== requestGeneration ||
        activeSessionRef.current !== sessionKey
      ) {
        return { ok: false, message: 'A sessão mudou durante a atualização da sacola.' };
      }

      setState({
        sessionKey,
        status: 'ready',
        cart,
        error: '',
        reconciliationRequired: false,
        pendingOperation: null,
        pendingItemKey: null,
      });
      return { ok: true };
    } catch (error) {
      if (
        sessionGenerationRef.current === sessionGeneration &&
        requestGenerationRef.current === requestGeneration &&
        activeSessionRef.current === sessionKey
      ) {
        setState({
          sessionKey,
          status: 'error',
          cart: currentCart,
          error: getCartErrorMessage(error),
          reconciliationRequired: currentState.sessionKey === sessionKey
            ? currentState.reconciliationRequired
            : false,
          pendingOperation: null,
          pendingItemKey: null,
        });
      }
      return { ok: false, message: getCartErrorMessage(error) };
    }
  }, [sessionKey, token]);

  const runMutation = useCallback(async (
    operation,
    itemKey,
    request,
    confirmedCart,
  ) => {
    if (!sessionKey || !token || activeSessionRef.current !== sessionKey) {
      return { ok: false, message: 'Entre como cliente para usar a sacola.' };
    }
    if (mutationLockRef.current) {
      return { ok: false, message: 'Aguarde a operação atual da sacola.' };
    }

    const currentState = stateRef.current;
    if (currentState.sessionKey !== sessionKey || currentState.status !== 'ready' || !currentState.cart) {
      return {
        ok: false,
        message: currentState.reconciliationRequired
          ? 'Atualize a sacola para confirmar o resultado anterior antes de tentar novamente.'
          : 'Aguarde o carregamento ou atualize a sacola antes de continuar.',
      };
    }
    if (currentState.reconciliationRequired) {
      return {
        ok: false,
        message: 'Atualize a sacola para confirmar o resultado anterior antes de tentar novamente.',
      };
    }

    mutationLockRef.current = true;
    const sessionGeneration = sessionGenerationRef.current;
    const requestGeneration = ++requestGenerationRef.current;
    setState({
      ...currentState,
      status: 'mutating',
      error: '',
      pendingOperation: operation,
      pendingItemKey: itemKey,
    });

    try {
      const cart = await request();
      if (
        sessionGenerationRef.current !== sessionGeneration ||
        requestGenerationRef.current !== requestGeneration ||
        activeSessionRef.current !== sessionKey
      ) {
        return { ok: false, message: 'A sessão mudou durante a operação da sacola.' };
      }

      const nextCart = confirmedCart
        ? confirmedCart(currentState.cart, cart)
        : cart;
      setState({
        sessionKey,
        status: 'ready',
        cart: nextCart,
        error: '',
        reconciliationRequired: false,
        pendingOperation: null,
        pendingItemKey: null,
      });
      return { ok: true };
    } catch (error) {
      if (
        sessionGenerationRef.current === sessionGeneration &&
        requestGenerationRef.current === requestGeneration &&
        activeSessionRef.current === sessionKey
      ) {
        setState({
          ...currentState,
          status: 'error',
          error: getCartErrorMessage(error),
          reconciliationRequired: needsReconciliation(error),
          pendingOperation: null,
          pendingItemKey: null,
        });
      }
      return {
        ok: false,
        message: getCartErrorMessage(error),
        uncertain: needsReconciliation(error),
      };
    } finally {
      if (sessionGenerationRef.current === sessionGeneration) {
        mutationLockRef.current = false;
      }
    }
  }, [sessionKey, token]);

  const addItem = useCallback(async (product, variant = null, quantity = 1) => {
    if (!isCustomer) {
      return { ok: false, message: 'Entre como cliente para usar a sacola.' };
    }
    if (variant) {
      return {
        ok: false,
        message: 'Produtos demonstrativos com variantes ainda não podem ser adicionados à sacola persistente.',
      };
    }
    if (!product || product.active === false) {
      return { ok: false, message: 'Este produto está indisponível no momento.' };
    }

    const productId = normalizePositiveInt64(product.id);
    if (!productId) {
      return {
        ok: false,
        message: 'Produtos demonstrativos fora do catálogo da API não podem ser adicionados à sacola persistente.',
      };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) {
      return { ok: false, message: 'Informe uma quantidade inteira positiva válida.' };
    }

    const productType = product.productType;
    if (!['SINGLE_UNIT', 'MULTI_UNIT'].includes(productType)) {
      return { ok: false, message: 'O tipo deste produto não é compatível com a sacola.' };
    }

    const currentState = stateRef.current;
    if (
      currentState.sessionKey !== sessionKey ||
      currentState.status !== 'ready' ||
      !currentState.cart
    ) {
      return {
        ok: false,
        message: 'Aguarde o carregamento da sacola ou tente atualizá-la antes de adicionar.',
      };
    }
    const existing = currentState.cart.items.find(
      (item) => String(item.productId) === productId,
    );
    const requestedQuantity = productType === 'SINGLE_UNIT'
      ? 1
      : (existing?.desiredQuantity ?? 0) + quantity;

    if (requestedQuantity > MAX_CART_QUANTITY) {
      return { ok: false, message: 'A quantidade máxima permitida para este produto foi atingida.' };
    }

    return runMutation(
      'add',
      productId,
      () => addCartItem(productId, requestedQuantity, token),
    );
  }, [isCustomer, runMutation, sessionKey, token]);

  const updateQuantity = useCallback(async (productId, nextQuantity) => {
    const normalizedProductId = normalizePositiveInt64(productId);
    if (!normalizedProductId) {
      return { ok: false, message: 'O identificador do produto é inválido.' };
    }
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > MAX_CART_QUANTITY) {
      return { ok: false, message: 'Informe uma quantidade inteira positiva válida.' };
    }

    const currentState = stateRef.current;
    const item = currentState.sessionKey === sessionKey
      ? currentState.cart?.items.find(
        (cartItem) => String(cartItem.productId) === normalizedProductId,
      )
      : null;
    if (!item) {
      return { ok: false, message: 'Este item não está mais na sacola. Atualize para conferir.' };
    }
    if (item.productType === 'SINGLE_UNIT') {
      return { ok: false, message: 'Produtos SINGLE_UNIT permanecem limitados a uma unidade.' };
    }
    if (item.productType !== 'MULTI_UNIT') {
      return { ok: false, message: 'A quantidade deste item não pode ser alterada.' };
    }
    if (!quantityFitsAvailability(nextQuantity, item.availableQuantity)) {
      return { ok: false, message: 'A quantidade excede a disponibilidade atual do estoque.' };
    }

    return runMutation(
      'update',
      normalizedProductId,
      () => updateCartItemQuantity(normalizedProductId, nextQuantity, token),
    );
  }, [runMutation, sessionKey, token]);

  const removeItem = useCallback(async (productId) => {
    const normalizedProductId = normalizePositiveInt64(productId);
    if (!normalizedProductId) {
      return { ok: false, message: 'O identificador do produto é inválido.' };
    }

    return runMutation(
      'remove',
      normalizedProductId,
      async () => {
        await removeCartItem(normalizedProductId, token);
        return null;
      },
      (currentCart) => ({
        ...currentCart,
        items: currentCart.items.filter(
          (item) => String(item.productId) !== normalizedProductId,
        ),
        estimatedSubtotal: null,
        estimateComplete: false,
      }),
    );
  }, [runMutation, token]);

  const currentState = state.sessionKey === sessionKey && sessionKey
    ? state
    : {
      sessionKey,
      status: isCustomer ? 'loading' : hasCustomerRole ? 'error' : 'idle',
      cart: null,
      error: hasCustomerRole && !isCustomer
        ? 'Sua sessão não está válida. Entre novamente para acessar a sacola.'
        : '',
      reconciliationRequired: false,
      pendingOperation: null,
      pendingItemKey: null,
    };
  const items = currentState.cart?.items.map(mapCartItem) ?? [];
  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: currentState.cart?.estimatedSubtotal ?? null,
    estimateComplete: currentState.cart?.estimateComplete ?? false,
    status: currentState.status,
    error: currentState.error,
    isLoading: currentState.status === 'loading',
    isRefreshing: currentState.status === 'refreshing',
    isMutating: currentState.status === 'mutating',
    hasCart: Boolean(currentState.cart),
    reconciliationRequired: currentState.reconciliationRequired,
    pendingOperation: currentState.pendingOperation,
    pendingItemKey: currentState.pendingItemKey,
    refreshCart,
    addItem,
    updateQuantity,
    removeItem,
  }), [
    addItem,
    currentState,
    items,
    refreshCart,
    removeItem,
    updateQuantity,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de CartProvider.');
  }
  return context;
}
