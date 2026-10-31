import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

function getAvailability(product, variant) {
  return variant?.stock ?? product.stock;
}

function getUnitPrice(product, variant) {
  return variant?.price ?? product.price;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  function addItem(product, variant = null, quantity = 1) {
    if (!product || product.active === false) {
      return { ok: false, message: 'Este produto está indisponível no momento.' };
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, message: 'Informe uma quantidade válida.' };
    }

    const stock = getAvailability(product, variant);
    if (stock <= 0) {
      return { ok: false, message: 'Esta opção está indisponível no momento.' };
    }

    const key = `${product.id}:${variant?.id ?? 'default'}`;
    const existing = items.find((item) => item.key === key);
    const maximum = Math.min(stock, product.maxPurchase ?? stock);
    const requestedQuantity = product.type === 'UNITÁRIO'
      ? 1
      : (existing?.quantity ?? 0) + quantity;

    if (requestedQuantity > maximum) {
      return {
        ok: false,
        message: 'A quantidade máxima disponível para este item já foi atingida.',
      };
    }

    setItems((currentItems) => {
      const currentItem = currentItems.find((item) => item.key === key);
      if (currentItem) {
        return currentItems.map((item) =>
          item.key === key ? { ...item, quantity: requestedQuantity } : item,
        );
      }

      return [
        ...currentItems,
        {
          key,
          product,
          variant,
          quantity: requestedQuantity,
          unitPrice: getUnitPrice(product, variant),
          maximum,
        },
      ];
    });

    return { ok: true, message: 'Produto adicionado à sacola.' };
  }

  function updateQuantity(key, nextQuantity) {
    const item = items.find((entry) => entry.key === key);
    if (!item) {
      return { ok: false, message: 'Este item não está mais na sacola.' };
    }

    if (item.product.type === 'UNITÁRIO') {
      return { ok: false, message: 'Peças unitárias ficam limitadas a uma unidade.' };
    }

    if (nextQuantity < 1 || nextQuantity > item.maximum) {
      return { ok: false, message: 'Quantidade fora da disponibilidade deste item.' };
    }

    setItems((currentItems) =>
      currentItems.map((entry) =>
        entry.key === key ? { ...entry, quantity: nextQuantity } : entry,
      ),
    );
    return { ok: true };
  }

  function removeItem(key) {
    setItems((currentItems) => currentItems.filter((item) => item.key !== key));
  }

  function clearCart() {
    setItems([]);
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
    [items],
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
