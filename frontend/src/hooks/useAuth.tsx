/**
 * Auth context — manages authentication state.
 * Access token is held in-memory only (XSS-safe).
 * Refresh token is handled via httpOnly cookie by the browser.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, type User } from '../api/auth';
import { setAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Attempt silent refresh on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await authApi.refresh();
        setAccessToken(data.access_token);
        const { data: userData } = await authApi.getMe();
        setUser(userData);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    setAccessToken(data.access_token);
    const { data: userData } = await authApi.getMe();
    setUser(userData);
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    const { data } = await authApi.signup({ email, password, full_name: fullName });
    setAccessToken(data.access_token);
    const { data: userData } = await authApi.getMe();
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
