// DispatchHub Safe Error Logger
// Redacts sensitive security tokens, API keys, private keys, passwords, and authorization headers
import { AppError } from './error.types';

const SENSITIVE_KEYS = new Set([
  'password',
  'apikey',
  'api_key',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'auth',
  'secret',
  'clientsecret',
  'client_secret',
  'privatekey',
  'private_key',
  'dkimkey',
  'dkim_key',
  'creditcard',
  'cardnumber',
]);

export function redactSensitiveData(data: any, depth = 0): any {
  if (depth > 5) return '[Truncated: Max Depth]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact Bearer tokens
    let sanitized = data.replace(/Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi, 'Bearer [REDACTED]');
    // Redact RSA/ED25519 private keys
    sanitized = sanitized.replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, '[PRIVATE KEY REDACTED]');
    // Redact long hex / base64 keys
    sanitized = sanitized.replace(/([a-f0-9]{32,64})/gi, (match) => match.length >= 32 ? '[KEY REDACTED]' : match);
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (SENSITIVE_KEYS.has(lowerKey)) {
        cleanObj[key] = '[REDACTED]';
      } else {
        cleanObj[key] = redactSensitiveData(data[key], depth + 1);
      }
    }
    return cleanObj;
  }

  return data;
}

export const errorLogger = {
  log(message: string, context?: any) {
    if (process.env.NODE_ENV !== 'test') {
      const safeContext = context ? redactSensitiveData(context) : undefined;
      console.log(`[DispatchHub] ${message}`, safeContext || '');
    }
  },

  warn(message: string, context?: any) {
    if (process.env.NODE_ENV !== 'test') {
      const safeContext = context ? redactSensitiveData(context) : undefined;
      console.warn(`[DispatchHub WARN] ${message}`, safeContext || '');
    }
  },

  error(error: unknown, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'test') return;

    let payload: Record<string, any> = {};

    if (error instanceof AppError) {
      payload = {
        name: error.name,
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
        userMessage: error.userMessage,
        severity: error.severity,
        retryable: error.retryable,
        fieldErrors: error.fieldErrors,
        details: error.details,
      };
    } else if (error instanceof Error) {
      payload = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
    } else {
      payload = { raw: error };
    }

    if (context) {
      payload.context = context;
    }

    const safePayload = redactSensitiveData(payload);
    console.error(`[DispatchHub ERROR]`, safePayload);
  },
};
