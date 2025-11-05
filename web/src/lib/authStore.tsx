import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, type AuthUser } from './api';

type AuthState = {
  user: AuthUser | null;
  status: 'idle' | 'authenticating' | 'authenticated' | 'error';
  error?: string;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: 'idle' });

  async function login(email: string, password: string) {
    setState((prev) => ({ ...prev, status: 'authenticating', error: undefined }));
    try {
      const { user } = await api.login(email, password);
      setState({ user, status: 'authenticated' });
    } catch (error) {
      setState({
        user: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to login'
      });
    }
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setState({ user: null, status: 'idle' });
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      setUser: (user) => setState({ user, status: user ? 'authenticated' : 'idle' })
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
