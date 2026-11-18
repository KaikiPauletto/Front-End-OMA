import { createContext, useContext, useMemo, useState } from 'react';
import { authenticateUser, revokeToken } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  async function signIn(email, password) {
    const session = await authenticateUser({ email, password });
    setUser(session.user);
    setToken(session.token);
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
      setUser(null);
      setToken(null);
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
