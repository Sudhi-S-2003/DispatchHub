export interface AccountSession {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT';
  token: string;
  apiKey: string;
  walletBalance: number;
  isActive: boolean;
  lastActiveAt: number;
}

export interface MultiAccountState {
  activeAccountId: string | null;
  accounts: AccountSession[];
}

export interface SwitchAccountResult {
  success: boolean;
  account?: AccountSession;
  error?: string;
}
