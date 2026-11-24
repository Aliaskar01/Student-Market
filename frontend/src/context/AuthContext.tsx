import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  apiFetch,
  clearTokens,
  getStoredRefreshToken,
  refreshAccessToken,
  saveTokens,
} from '../lib/api';
import type { AuthConfig, AuthResponse, User } from '../types';

interface RegisterPayload {
  full_name: string;
  university_email: string;
  university: string;
  password: string;
  telegram_handle?: string;
  phone_number?: string;
  remember_me?: boolean;
}

interface LoginPayload {
  university_email: string;
  password: string;
  remember_me?: boolean;
}

interface AuthContextValue {
  user: User | null;
  authConfig: AuthConfig | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrapAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const cfg = await apiFetch<AuthConfig>('/api/auth/config', { skipAuth: true });
      setAuthConfig(cfg);
    } catch {
      setAuthConfig({
        provider: 'local',
        allow_registration: true,
        password_min_length: 8,
        keycloak: null,
      });
    }

    const storedRefresh = getStoredRefreshToken();
    if (!storedRefresh) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const token = await refreshAccessToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await apiFetch<User>('/api/auth/me');
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload),
    });
    saveTokens(data.access_token, data.refresh_token, payload.remember_me ?? true);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<User> => {
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload),
    });
    saveTokens(data.access_token, data.refresh_token, payload.remember_me ?? true);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Clear local session regardless of network errors
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout-all', { method: 'POST' });
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const me = await apiFetch<User>('/api/auth/me');
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authConfig,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
