import { createContext, useContext, useMemo, useState } from 'react';
import { authenticateUser, revokeToken } from '../services/authService';
import {
  clearAuthSession,
  clearPendingPaymentReturn,
  loadAuthSession,
  saveAuthSession,
} from '../services/browserSession';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Na web, restaura a sessão do sessionStorage (sobrevive ao reload da volta
  // do Stripe). No celular, loadAuthSession devolve null e a sessão segue em memória.
  const [session, setSession] = useState(() => loadAuthSession());
  const user = session?.user ?? null;
  const token = session?.token ?? null;

  async function signIn(email, password) {
    const nextSession = await authenticateUser({ email, password });
    saveAuthSession(nextSession);
    setSession(nextSession);
  }

  async function signOut() {
    try {
      if (!token) {
        return {
          serverRevoked: false,
          error: new Error('Não há token de sessão disponível para revogação.'),
        };
      }

      await revokeToken(token);
      return { serverRevoked: true };
    } catch (error) {
      return { serverRevoked: false, error };
    } finally {
      clearAuthSession();
      clearPendingPaymentReturn();
      setSession(null);
    }
  }

  const value = useMemo(
    () => ({ user, token, signIn, signOut }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}
