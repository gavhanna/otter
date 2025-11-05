import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type AuthUser } from './api';

type AuthStatus = 'checking' | 'idle' | 'authenticating' | 'authenticated' | 'error';

type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  error?: string;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: 'checking' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { user } = await api.me();
        if (!active) return;
        setState({ user, status: 'authenticated' });
      } catch (error) {
        if (!active) return;
        setState({ user: null, status: 'idle' });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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
      setUser: (user) =>
        setState((prev) => ({
          user,
          status: user ? 'authenticated' : prev.status === 'checking' ? 'checking' : 'idle'
        }))
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
