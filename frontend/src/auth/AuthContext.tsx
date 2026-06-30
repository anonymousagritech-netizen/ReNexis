import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/types/models';
import { storage } from '@/utils/storage';
import { setAuthTokens, setUnauthorizedHandler } from '@/api/client';
import { loginRequest, getMeRequest } from '@/api/auth.api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_KEY = 'renexis_access_token';
const REFRESH_KEY = 'renexis_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    setUser(null);
    setAuthTokens({ accessToken: null, refreshToken: null });
    await storage.removeItem(ACCESS_KEY);
    await storage.removeItem(REFRESH_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    (async () => {
      try {
        const [storedAccess, storedRefresh] = await Promise.all([
          storage.getItem(ACCESS_KEY),
          storage.getItem(REFRESH_KEY),
        ]);
        if (storedAccess && storedRefresh) {
          setAuthTokens({ accessToken: storedAccess, refreshToken: storedRefresh });
          const me = await getMeRequest();
          setUser(me);
        }
      } catch {
        await logout();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    setAuthTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    await storage.setItem(ACCESS_KEY, result.accessToken);
    await storage.setItem(REFRESH_KEY, result.refreshToken);
    setUser(result.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: !!user, login, logout }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
