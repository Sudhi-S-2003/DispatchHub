import { AccountSession } from '../types/account-session.types';

const STORAGE_KEYS = {
  ACCOUNTS: 'dispatchhub_accounts',
  ACTIVE_ID: 'dispatchhub_active_account_id',
  LEGACY_TOKEN: 'dispatchhub_token',
  LEGACY_USER: 'dispatchhub_user',
  LEGACY_API_KEY: 'dispatchhub_api_key',
};

class AccountSessionService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  getSavedAccounts(): AccountSession[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse saved account sessions:', err);
      return [];
    }
  }

  getActiveAccountId(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  }

  getActiveSession(): AccountSession | null {
    const accounts = this.getSavedAccounts();
    const activeId = this.getActiveAccountId();
    if (!activeId) return accounts[0] || null;
    return accounts.find((a) => a.id === activeId) || accounts[0] || null;
  }

  saveAccountSession(session: AccountSession, makeActive: boolean = true): void {
    if (!this.isBrowser()) return;

    const accounts = this.getSavedAccounts();
    const existingIndex = accounts.findIndex((a) => a.id === session.id);

    const updatedSession: AccountSession = {
      ...session,
      lastActiveAt: Date.now(),
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = updatedSession;
    } else {
      accounts.push(updatedSession);
    }

    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

    if (makeActive) {
      this.syncActiveCredentials(updatedSession);
    }
  }

  switchActiveAccount(accountId: string): AccountSession | null {
    if (!this.isBrowser()) return null;

    const accounts = this.getSavedAccounts();
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return null;

    target.lastActiveAt = Date.now();
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    this.syncActiveCredentials(target);
    return target;
  }

  updateSessionProfile(accountId: string, updates: Partial<AccountSession>): void {
    if (!this.isBrowser()) return;

    const accounts = this.getSavedAccounts();
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    Object.assign(target, updates);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

    if (this.getActiveAccountId() === accountId) {
      this.syncActiveCredentials(target);
    }
  }

  removeAccountSession(accountId: string): { remaining: AccountSession[]; newActive: AccountSession | null } {
    if (!this.isBrowser()) return { remaining: [], newActive: null };

    const accounts = this.getSavedAccounts().filter((a) => a.id !== accountId);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

    const currentActiveId = this.getActiveAccountId();
    let newActive: AccountSession | null = null;

    if (currentActiveId === accountId) {
      if (accounts.length > 0) {
        // Pick the most recently active remaining account
        accounts.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
        newActive = accounts[0];
        this.syncActiveCredentials(newActive);
      } else {
        this.clearActiveCredentials();
      }
    } else {
      newActive = this.getActiveSession();
    }

    return { remaining: accounts, newActive };
  }

  clearAllSessions(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
    this.clearActiveCredentials();
  }

  private syncActiveCredentials(session: AccountSession): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, session.id);
    localStorage.setItem(STORAGE_KEYS.LEGACY_TOKEN, session.token);
    localStorage.setItem(STORAGE_KEYS.LEGACY_API_KEY, session.apiKey);
    localStorage.setItem(
      STORAGE_KEYS.LEGACY_USER,
      JSON.stringify({
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        walletBalance: session.walletBalance,
        apiKey: session.apiKey,
        isActive: session.isActive,
      }),
    );
  }

  private clearActiveCredentials(): void {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_USER);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_API_KEY);
  }
}

export const accountSessionService = new AccountSessionService();
