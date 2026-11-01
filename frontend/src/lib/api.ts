// DispatchHub API Client - Production Grade & Hardened
// Includes automatic timeouts, AbortSignal handling, idempotent retry policies, 401 session interception, and normalized AppErrors

import { AppError, ErrorCode, normalizeError } from './errors';

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

export class ApiError extends AppError {
  constructor(
    public override statusCode: number,
    message: string,
    public override details?: any,
    code?: ErrorCode,
  ) {
    super({
      statusCode,
      message,
      details,
      code: code || (statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
      retryable: statusCode >= 502 && statusCode <= 504,
    });
    this.name = 'ApiError';
  }
}

// 401 Unauthorized Session Interception Registry
type UnauthorizedHandler = () => void;
const unauthorizedListeners = new Set<UnauthorizedHandler>();

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedListeners.add(handler);
  return () => unauthorizedListeners.delete(handler);
}

function notifyUnauthorized() {
  unauthorizedListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore listener errors
    }
  });
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dispatchhub_token');
}

function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dispatchhub_api_key');
}

export interface RequestConfig extends RequestInit {
  timeoutMs?: number;
  skipRetry?: boolean;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const maxRetries = options.skipRetry ? 0 : isIdempotent ? options.maxRetries ?? 2 : 0;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let attempt = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Chain external signal if provided
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        notifyUnauthorized();
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg =
          (data && typeof data.message === 'string' && data.message) ||
          (data && Array.isArray(data.message) && data.message.join('. ')) ||
          data.error ||
          `HTTP ${response.status}: Request failed`;

        const normalized = normalizeError(
          new ApiError(response.status, errorMsg, data),
          `${method} ${endpoint}`,
        );

        // Check if retryable idempotent request
        if (isIdempotent && normalized.retryable && attempt <= maxRetries) {
          const backoffDelay = 300 * Math.pow(2, attempt - 1) + Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          continue;
        }

        throw normalized;
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const normalized = normalizeError(err, `${method} ${endpoint}`);

      // Check if network error or timeout is retryable on idempotent read
      if (isIdempotent && normalized.retryable && attempt <= maxRetries) {
        const backoffDelay = 300 * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }

      throw normalized;
    }
  }
}

// Auth API
export const authApi = {
  login: (email: string, apiKey?: string, config?: RequestConfig) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, apiKey }),
      ...config,
    }),
  getMe: (config?: RequestConfig) => request<any>('/auth/me', config),
  validateSession: (token: string, config?: RequestConfig) =>
    request<any>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      ...config,
    }),
};

// Analytics API
export const analyticsApi = {
  getDashboard: (config?: RequestConfig) => request<any>('/analytics/dashboard', config),
};

// Accounts API
export const accountsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }, config?: RequestConfig) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<any>(`/accounts?${query.toString()}`, config);
  },
  create: (data: { name: string; email: string; initialBalance?: number }, config?: RequestConfig) =>
    request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    }),
};

// Domains API
export const domainsApi = {
  list: (params?: { page?: number; limit?: number }, config?: RequestConfig) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<any>(`/domains?${query.toString()}`, config);
  },
  create: (name: string, config?: RequestConfig) =>
    request<any>('/domains', {
      method: 'POST',
      body: JSON.stringify({ name }),
      ...config,
    }),
  verify: (id: string, config?: RequestConfig) =>
    request<any>(`/domains/${id}/verify`, {
      method: 'POST',
      ...config,
    }),
  delete: (id: string, config?: RequestConfig) =>
    request<any>(`/domains/${id}`, {
      method: 'DELETE',
      ...config,
    }),
};

// Templates API
export const templatesApi = {
  list: (params?: { page?: number; limit?: number; search?: string }, config?: RequestConfig) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return request<any>(`/templates?${query.toString()}`, config);
  },
  create: (
    data: {
      name: string;
      category: 'TRANSACTIONAL' | 'MARKETING' | 'NOTIFICATION' | 'TEST';
      subject: string;
      htmlContent: string;
      textContent?: string;
    },
    config?: RequestConfig,
  ) =>
    request<any>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    }),
  preview: (
    data: {
      templateId?: string;
      htmlContent?: string;
      variables: Record<string, any>;
      isCoBranded?: boolean;
      customFooterHtml?: string;
    },
    config?: RequestConfig,
  ) =>
    request<any>('/templates/preview', {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    }),
  delete: (id: string, config?: RequestConfig) =>
    request<any>(`/templates/${id}`, {
      method: 'DELETE',
      ...config,
    }),
};

// Campaigns API
export const campaignsApi = {
  list: (
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      category?: string;
      search?: string;
    },
    config?: RequestConfig,
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    return request<any>(`/campaigns?${query.toString()}`, config);
  },
  getPendingApprovals: (params?: { page?: number; limit?: number }, config?: RequestConfig) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return request<any>(`/campaigns/pending-approvals?${query.toString()}`, config);
  },
  getCampaign: (id: string, config?: RequestConfig) => request<any>(`/campaigns/${id}`, config),
  pause: (id: string, config?: RequestConfig) =>
    request<any>(`/campaigns/${id}/pause`, { method: 'POST', ...config }),
  resume: (id: string, config?: RequestConfig) =>
    request<any>(`/campaigns/${id}/resume`, { method: 'POST', ...config }),
};

// Messages & Campaigns API
export const messagesApi = {
  list: (
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      category?: string;
      search?: string;
      campaignId?: string;
    },
    config?: RequestConfig,
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.campaignId) query.set('campaignId', params.campaignId);
    return request<any>(`/messages?${query.toString()}`, config);
  },
  sendSingle: (
    data: {
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
    },
    config?: RequestConfig,
  ) =>
    request<any>('/messages/send-single', {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    }),
  sendCampaign: (
    data: {
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
    },
    config?: RequestConfig,
  ) =>
    request<any>('/messages/campaign', {
      method: 'POST',
      body: JSON.stringify(data),
      ...config,
    }),
  approveCampaign: (campaignId: string, config?: RequestConfig) =>
    request<any>(`/messages/campaign/${campaignId}/approve`, {
      method: 'POST',
      ...config,
    }),
  rejectCampaign: (campaignId: string, reason?: string, config?: RequestConfig) =>
    request<any>(`/messages/campaign/${campaignId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      ...config,
    }),
};

// Wallet API
export const walletApi = {
  getBalance: (config?: RequestConfig) => request<any>('/wallet/balance', config),
  getLedger: (params?: { page?: number; limit?: number; type?: string }, config?: RequestConfig) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.type) query.set('type', params.type);
    return request<any>(`/wallet/ledger?${query.toString()}`, config);
  },
  getAllTransactions: (params?: { page?: number; limit?: number; type?: string }, config?: RequestConfig) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.type) query.set('type', params.type);
    return request<any>(`/wallet/admin/all-transactions?${query.toString()}`, config);
  },
  topUp: (targetAccountId: string, amount: number, description?: string, config?: RequestConfig) =>
    request<any>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ targetAccountId, amount, description }),
      ...config,
    }),
};
