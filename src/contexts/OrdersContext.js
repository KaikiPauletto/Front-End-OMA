import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { listOrders } from '../services/ordersService.js';
import { useAuth } from './AuthContext';

const OrdersContext = createContext(null);

function getOrdersErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Não foi possível carregar seus pedidos. Tente novamente.';
}

export function OrdersProvider({ children }) {
  const { user, token } = useAuth();
  const isCustomer = user?.role === 'CLIENTE' && typeof token === 'string' && token.trim();
  const sessionKey = isCustomer ? token : null;
  const [state, setState] = useState({
    sessionKey: null,
    status: 'idle',
    orders: [],
    error: '',
  });
  const stateRef = useRef(state);
  const generationRef = useRef(0);
  const activeSessionRef = useRef(sessionKey);
  stateRef.current = state;
  activeSessionRef.current = sessionKey;

  const refreshOrders = useCallback(async () => {
    if (!sessionKey || activeSessionRef.current !== sessionKey) {
      return { ok: false, message: 'Entre como cliente para consultar seus pedidos.' };
    }

    const generation = ++generationRef.current;
    const currentState = stateRef.current;
    const currentOrders = currentState.sessionKey === sessionKey
      ? currentState.orders
      : [];
    setState({
      sessionKey,
      status: currentOrders.length > 0 ? 'refreshing' : 'loading',
      orders: currentOrders,
      error: '',
    });

    try {
      const orders = await listOrders(token);
      if (
        generationRef.current !== generation ||
        activeSessionRef.current !== sessionKey
      ) {
        return { ok: false, message: 'A sessão mudou durante a consulta dos pedidos.' };
      }
      setState({
        sessionKey,
        status: 'ready',
        orders,
        error: '',
      });
      return { ok: true };
    } catch (error) {
      const message = getOrdersErrorMessage(error);
      if (
        generationRef.current === generation &&
        activeSessionRef.current === sessionKey
      ) {
        setState({
          sessionKey,
          status: 'error',
          orders: currentOrders,
          error: message,
        });
      }
      return { ok: false, message };
    }
  }, [sessionKey, token]);

  useEffect(() => {
    if (!sessionKey) {
      generationRef.current += 1;
      setState({
        sessionKey: null,
        status: 'idle',
        orders: [],
        error: '',
      });
      return;
    }
    setState({
      sessionKey,
      status: 'loading',
      orders: [],
      error: '',
    });
    refreshOrders();
  }, [refreshOrders, sessionKey]);

  const currentState = state.sessionKey === sessionKey
    ? state
    : {
      sessionKey,
      status: isCustomer ? 'loading' : 'idle',
      orders: [],
      error: '',
    };
  const value = useMemo(() => ({
    orders: currentState.orders,
    status: currentState.status,
    error: currentState.error,
    refreshOrders,
  }), [currentState, refreshOrders]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders deve ser usado dentro de OrdersProvider.');
  }
  return context;
}
