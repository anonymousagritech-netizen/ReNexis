import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { RouteKey } from './routes';

interface NavState {
  route: RouteKey;
  params?: Record<string, any>;
}

interface NavigationContextValue {
  current: NavState;
  navigate: (route: RouteKey, params?: Record<string, any>) => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<NavState>({ route: 'dashboard' });

  const navigate = useCallback((route: RouteKey, params?: Record<string, any>) => {
    setCurrent({ route, params });
  }, []);

  const value = useMemo(() => ({ current, navigate }), [current, navigate]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useAppNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useAppNavigation must be used within NavigationProvider');
  return ctx;
}
