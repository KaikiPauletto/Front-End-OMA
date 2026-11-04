import { createContext, useContext, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const OrdersContext = createContext(null);
let orderSequence = 0;

export function OrdersProvider({ children }) {
  const { user } = useAuth();
  const [ordersByUserId, setOrdersByUserId] = useState({});
  const userId = user?.role === 'CLIENTE' ? user.id : null;
  const orders = userId ? ordersByUserId[userId] ?? [] : [];

  function addOrder({ items, subtotal, address, postalCode }) {
    if (!userId || items.length === 0) {
      return { ok: false };
    }

    const order = {
      id: `demo-order-${Date.now()}-${++orderSequence}`,
      customerId: userId,
      status: 'AGUARDANDO_PAGAMENTO',
      createdAt: new Date().toISOString(),
      subtotal,
      items: items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        variantId: item.variant?.id ?? null,
        variantName: item.variant?.name ?? null,
        lineTotal: item.unitPrice * item.quantity,
      })),
      address: { ...address, postalCode },
    };

    setOrdersByUserId((currentOrders) => ({
      ...currentOrders,
      [userId]: [order, ...(currentOrders[userId] ?? [])],
    }));

    return { ok: true };
  }

  const value = useMemo(() => ({ orders, addOrder }), [orders, userId]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders deve ser usado dentro de OrdersProvider.');
  }
  return context;
}
