import { createContext, useContext, useMemo, useState } from 'react';
import { authenticateMockUser } from '../services/mockAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  function signIn(email, password) {
    const authenticatedUser = authenticateMockUser(email, password);
    if (!authenticatedUser) {
      return { ok: false };
    }

    setUser(authenticatedUser);
    return { ok: true };
  }

  function signOut() {
    setUser(null);
  }

  const value = useMemo(() => ({ user, signIn, signOut }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}
