// DispatchHub API Client - Production Grade
// In browser, defaults to relative /api/v1 which is handled by Next.js proxy & rewrites
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:4000/api/v1');

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dispatchhub_token');
}

function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dispatchhub_api_key');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const apiKey = getStoredApiKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message || data.error || `HTTP ${response.status}: Request failed`,
      data,
    );
  }

  return data as T;
}

// Auth API
export const authApi = {
  login: (email: string, apiKey?: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, apiKey }),
    }),
  getMe: () => request<any>('/auth/me'),
  validateSession: (token: string) =>
    request<any>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => request<any>('/analytics/dashboard'),
};

// Accounts API
export const accountsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<any>(`/accounts?${query.toString()}`);
  },
  create: (data: { name: string; email: string; initialBalance?: number }) =>
    request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Domains API
export const domainsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<any>(`/domains?${query.toString()}`);
  },
  create: (name: string) =>
    request<any>('/domains', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  verify: (id: string) =>
    request<any>(`/domains/${id}/verify`, {
      method: 'POST',
    }),
  delete: (id: string) =>
    request<any>(`/domains/${id}`, {
      method: 'DELETE',
    }),
};

// Templates API
export const templatesApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<any>(`/templates?${query.toString()}`);
  },
  create: (data: {
    name: string;
    category: 'TRANSACTIONAL' | 'MARKETING' | 'NOTIFICATION' | 'TEST';
    subject: string;
    htmlContent: string;
    textContent?: string;
  }) =>
    request<any>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  preview: (data: {
    templateId?: string;
    htmlContent?: string;
    variables: Record<string, any>;
    isCoBranded?: boolean;
    customFooterHtml?: string;
  }) =>
    request<any>('/templates/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<any>(`/templates/${id}`, {
      method: 'DELETE',
    }),
};

// Campaigns API
export const campaignsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    return request<any>(`/campaigns?${query.toString()}`);
  },
  getPendingApprovals: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<any>(`/campaigns/pending-approvals?${query.toString()}`);
  },
  getCampaign: (id: string) => request<any>(`/campaigns/${id}`),
  pause: (id: string) =>
    request<any>(`/campaigns/${id}/pause`, { method: 'POST' }),
  resume: (id: string) =>
    request<any>(`/campaigns/${id}/resume`, { method: 'POST' }),
};

// Messages & Campaigns API
export const messagesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    campaignId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.campaignId) query.set('campaignId', params.campaignId);
    return request<any>(`/messages?${query.toString()}`);
  },
  sendSingle: (data: {
    to: string;
    sender?: string;
    subject: string;
    category: 'TRANSACTIONAL' | 'MARKETING' | 'NOTIFICATION' | 'TEST';
    isCoBranded?: boolean;
    templateId?: string;
    htmlBody?: string;
    textBody?: string;
    replyTo?: string;
    cc?: string[] | string;
    bcc?: string[] | string;
    variables?: Record<string, any>;
    remoteAttachments?: Array<{ url: string; filename: string }>;
    customFooterHtml?: string;
  }) =>
    request<any>('/messages/send-single', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sendCampaign: (data: {
    name: string;
    sender?: string;
    category: 'TRANSACTIONAL' | 'MARKETING' | 'NOTIFICATION' | 'TEST';
    isCoBranded?: boolean;
    templateId?: string;
    subject: string;
    htmlBody?: string;
    replyTo?: string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients: Array<{
      to: string;
      variables?: Record<string, any>;
    }>;
    remoteAttachments?: Array<{ url: string; filename: string }>;
    customFooterHtml?: string;
    scheduledAt?: string;
  }) =>
    request<any>('/messages/campaign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  approveCampaign: (campaignId: string) =>
    request<any>(`/messages/campaign/${campaignId}/approve`, {
      method: 'POST',
    }),
  rejectCampaign: (campaignId: string, reason?: string) =>
    request<any>(`/messages/campaign/${campaignId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// Wallet API
export const walletApi = {
  getBalance: () => request<any>('/wallet/balance'),
  getLedger: (params?: { page?: number; limit?: number; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.type) query.set('type', params.type);
    return request<any>(`/wallet/ledger?${query.toString()}`);
  },
  getAllTransactions: (params?: { page?: number; limit?: number; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.type) query.set('type', params.type);
    return request<any>(`/wallet/admin/all-transactions?${query.toString()}`);
  },
  topUp: (targetAccountId: string, amount: number, description?: string) =>
    request<any>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ targetAccountId, amount, description }),
    }),
};
