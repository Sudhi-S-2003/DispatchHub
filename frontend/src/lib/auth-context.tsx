'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, ApiError } from './api';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  walletBalance: number;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: UserAccount | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, apiKey?: string) => Promise<void>;
  logout: () => void;
  refreshAccount: () => Promise<void>;
  quickLoginAs: (type: 'admin' | 'client') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAccount = async () => {
    try {
      const res = await authApi.getMe();
      if (res && res.data) {
        setUser(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('dispatchhub_token');
    const storedUser = localStorage.getItem('dispatchhub_user');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore parsing error
        }
      }
      // Re-fetch latest from server
      authApi
        .getMe()
        .then((res) => {
          if (res?.data) {
            setUser(res.data);
            localStorage.setItem('dispatchhub_user', JSON.stringify(res.data));
          }
        })
        .catch(() => {
          // Token might be expired or backend not ready
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, apiKey?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, apiKey);
      const token = res?.accessToken || res?.data?.accessToken || res?.token || res?.data?.token;
      const account = res?.account || res?.data?.account || res?.data;

      if (token && account) {
        setToken(token);
        setUser(account);
        localStorage.setItem('dispatchhub_token', token);
        localStorage.setItem('dispatchhub_user', JSON.stringify(account));
        localStorage.setItem('dispatchhub_api_key', account.apiKey);
      }
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const quickLoginAs = async (type: 'admin' | 'client') => {
    const email = type === 'admin' ? 'admin@dispatchhub.com' : 'client@acme.com';
    await login(email);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('dispatchhub_token');
    localStorage.removeItem('dispatchhub_user');
    localStorage.removeItem('dispatchhub_api_key');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshAccount,
        quickLoginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
