'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from './api';
import { accountSessionService } from '@/features/auth/services/account-session.service';
import { AccountSession } from '@/features/auth/types/account-session.types';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  walletBalance: number;
  apiKey: string;
  isActive: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: UserAccount | null;
  token: string | null;
  accounts: AccountSession[];
  isLoading: boolean;
  login: (email: string, apiKey?: string) => Promise<void>;
  logout: () => void;
  switchAccount: (accountId: string) => Promise<boolean>;
  removeAccount: (accountId: string) => void;
  signOutCurrent: () => Promise<void>;
  signOutAll: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  quickLoginAs: (type: 'admin' | 'client') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncStateFromStorage = useCallback(() => {
    const saved = accountSessionService.getSavedAccounts();
    setAccounts(saved);
    const active = accountSessionService.getActiveSession();

    if (active) {
      setToken(active.token);
      setUser({
        id: active.id,
        name: active.name,
        email: active.email,
        role: active.role,
        walletBalance: active.walletBalance,
        apiKey: active.apiKey,
        isActive: active.isActive,
      });
      return active;
    } else {
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  const refreshAccount = async () => {
    try {
      const res = await authApi.getMe();
      const accountData = res?.data || res;
      if (accountData && accountData.id) {
        const balance =
          accountData.walletBalance !== undefined
            ? Number(accountData.walletBalance)
            : accountData.wallet?.balance !== undefined
            ? Number(accountData.wallet.balance)
            : user?.walletBalance || 0;

        const updatedProfile: UserAccount = {
          id: accountData.id,
          name: accountData.name || accountData.email.split('@')[0],
          email: accountData.email,
          role: accountData.role || 'CLIENT',
          walletBalance: balance,
          apiKey: accountData.apiKey || user?.apiKey || '',
          isActive: accountData.isActive !== false,
          createdAt: accountData.createdAt,
        };

        setUser(updatedProfile);
        accountSessionService.updateSessionProfile(accountData.id, {
          name: updatedProfile.name,
          role: updatedProfile.role,
          walletBalance: updatedProfile.walletBalance,
          apiKey: updatedProfile.apiKey,
        });
        setAccounts(accountSessionService.getSavedAccounts());
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  useEffect(() => {
    // 1. Check for legacy single-account token and migrate if not in accounts list
    const legacyToken = localStorage.getItem('dispatchhub_token');
    const legacyUserRaw = localStorage.getItem('dispatchhub_user');
    const savedAccounts = accountSessionService.getSavedAccounts();

    if (savedAccounts.length === 0 && legacyToken && legacyUserRaw) {
      try {
        const parsed = JSON.parse(legacyUserRaw);
        if (parsed.id && parsed.email) {
          const initialSession: AccountSession = {
            id: parsed.id,
            email: parsed.email,
            name: parsed.name || parsed.email.split('@')[0],
            role: parsed.role || 'CLIENT',
            token: legacyToken,
            apiKey: parsed.apiKey || localStorage.getItem('dispatchhub_api_key') || '',
            walletBalance: Number(parsed.walletBalance || 0),
            isActive: true,
            lastActiveAt: Date.now(),
          };
          accountSessionService.saveAccountSession(initialSession, true);
        }
      } catch {
        // ignore
      }
    }

    // 2. Synchronize current active account state
    const active = syncStateFromStorage();

    if (active) {
      authApi
        .getMe()
        .then((res) => {
          const accountData = res?.data || res;
          if (accountData?.id) {
            const balance =
              accountData.walletBalance !== undefined
                ? Number(accountData.walletBalance)
                : accountData.wallet?.balance !== undefined
                ? Number(accountData.wallet.balance)
                : active.walletBalance;

            accountSessionService.updateSessionProfile(accountData.id, {
              walletBalance: balance,
              name: accountData.name,
              role: accountData.role,
            });
            syncStateFromStorage();
          }
        })
        .catch(() => {
          // Token expired or server unreachable
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [syncStateFromStorage]);

  const login = async (email: string, apiKey?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, apiKey);
      const resData = res?.data || res;
      const accessToken = resData?.accessToken || res?.accessToken;
      const account = resData?.account || res?.account || resData;

      if (accessToken && account && account.id) {
        const balance =
          account.walletBalance !== undefined
            ? Number(account.walletBalance)
            : account.wallet?.balance !== undefined
            ? Number(account.wallet.balance)
            : 0;

        const newSession: AccountSession = {
          id: account.id,
          email: account.email,
          name: account.name || account.email.split('@')[0],
          role: account.role || 'CLIENT',
          token: accessToken,
          apiKey: account.apiKey,
          walletBalance: balance,
          isActive: true,
          lastActiveAt: Date.now(),
        };

        accountSessionService.saveAccountSession(newSession, true);
        syncStateFromStorage();
      }
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async (accountId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const all = accountSessionService.getSavedAccounts();
      const target = all.find((a) => a.id === accountId);
      if (!target) throw new Error('Account session not found');

      // Validate session with backend
      const res = await authApi.validateSession(target.token);
      const verified = res?.data || res;

      if (!verified || !verified.id) {
        throw new Error('Session has expired. Please re-authenticate.');
      }

      // Update balance & role if changed on server
      const balance =
        verified.walletBalance !== undefined
          ? Number(verified.walletBalance)
          : verified.wallet?.balance !== undefined
          ? Number(verified.wallet.balance)
          : target.walletBalance;

      accountSessionService.updateSessionProfile(target.id, {
        walletBalance: balance,
        name: verified.name || target.name,
        role: verified.role || target.role,
      });

      // Activate the account
      accountSessionService.switchActiveAccount(accountId);
      syncStateFromStorage();

      // Clear any route or component caches by hard reload or route push
      window.location.href = '/';
      return true;
    } catch (err: any) {
      console.error('Account switch failed:', err);
      setIsLoading(false);
      throw err;
    }
  };

  const removeAccount = (accountId: string) => {
    const { remaining, newActive } = accountSessionService.removeAccountSession(accountId);
    setAccounts(remaining);

    if (user?.id === accountId) {
      if (newActive) {
        syncStateFromStorage();
        window.location.href = '/';
      } else {
        setUser(null);
        setToken(null);
        window.location.href = '/login';
      }
    }
  };

  const signOutCurrent = async () => {
    if (!user) return;
    removeAccount(user.id);
  };

  const signOutAll = async () => {
    accountSessionService.clearAllSessions();
    setUser(null);
    setToken(null);
    setAccounts([]);
    window.location.href = '/login';
  };

  const logout = () => {
    signOutCurrent();
  };

  const quickLoginAs = async (type: 'admin' | 'client') => {
    const email = type === 'admin' ? 'admin@dispatchhub.com' : 'client@acme.com';
    await login(email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        accounts,
        isLoading,
        login,
        logout,
        switchAccount,
        removeAccount,
        signOutCurrent,
        signOutAll,
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
