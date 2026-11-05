import { createContext, useContext, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  getMaximumPurchase,
  getProductPrice,
  getProductStock,
} from '../data/products';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartsByUserId, setCartsByUserId] = useState({});
  const userId = user?.role === 'CLIENTE' ? user.id : null;
  const items = userId ? cartsByUserId[userId] ?? [] : [];

  function addItem(product, variant = null, quantity = 1) {
    if (!userId) {
      return { ok: false, message: 'Entre como cliente para usar a sacola.' };
    }

    if (!product || product.active === false) {
      return { ok: false, message: 'Este produto está indisponível no momento.' };
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, message: 'Informe uma quantidade válida.' };
    }

    const stock = getProductStock(product, variant);
    if (stock <= 0) {
      return { ok: false, message: 'Esta opção está indisponível no momento.' };
    }

    const key = `${product.id}:${variant?.id ?? 'default'}`;
    const existing = items.find((item) => item.key === key);
    const maximum = getMaximumPurchase(product, variant);
    const requestedQuantity = product.type === 'UNITÁRIO'
      ? 1
      : (existing?.quantity ?? 0) + quantity;

    if (requestedQuantity > maximum) {
      return {
        ok: false,
        message: 'A quantidade máxima disponível para este item já foi atingida.',
      };
    }

    setCartsByUserId((currentCarts) => {
      const currentItems = currentCarts[userId] ?? [];
      const currentItem = currentItems.find((item) => item.key === key);
      if (currentItem) {
        return {
          ...currentCarts,
          [userId]: currentItems.map((item) =>
            item.key === key ? { ...item, quantity: requestedQuantity } : item,
          ),
        };
      }

      return {
        ...currentCarts,
        [userId]: [
          ...currentItems,
          {
            key,
            product,
            variant,
            quantity: requestedQuantity,
            unitPrice: getProductPrice(product, variant),
            maximum,
          },
        ],
      };
    });

    return { ok: true, message: 'Produto adicionado à sacola.' };
  }

  function updateQuantity(key, nextQuantity) {
    if (!userId) {
      return { ok: false, message: 'Entre como cliente para usar a sacola.' };
    }

    const item = items.find((entry) => entry.key === key);
    if (!item) {
      return { ok: false, message: 'Este item não está mais na sacola.' };
    }

    if (item.product.type === 'UNITÁRIO') {
      return { ok: false, message: 'Peças unitárias ficam limitadas a uma unidade.' };
    }

    if (
      !Number.isInteger(nextQuantity) ||
      nextQuantity < 1 ||
      nextQuantity > item.maximum
    ) {
      return { ok: false, message: 'Quantidade fora da disponibilidade deste item.' };
    }

    setCartsByUserId((currentCarts) => ({
      ...currentCarts,
      [userId]: (currentCarts[userId] ?? []).map((entry) =>
        entry.key === key ? { ...entry, quantity: nextQuantity } : entry,
      ),
    }));
    return { ok: true };
  }

  function removeItem(key) {
    if (!userId) return;

    setCartsByUserId((currentCarts) => ({
      ...currentCarts,
      [userId]: (currentCarts[userId] ?? []).filter((item) => item.key !== key),
    }));
  }

  function clearCart() {
    if (!userId) return;

    setCartsByUserId((currentCarts) => ({
      ...currentCarts,
      [userId]: [],
    }));
  }

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      ),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, userId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de CartProvider.');
  }
  return context;
}
