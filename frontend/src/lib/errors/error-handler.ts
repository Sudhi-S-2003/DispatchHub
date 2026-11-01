// DispatchHub Centralized Error Normalizer & Handler
import { AppError, ErrorCode, ValidationErrorMap } from './error.types';
import { getFriendlyErrorMessage } from './error-messages';
import { errorLogger } from './error-logger';

export function normalizeError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // 1. Check for Abort / Timeout errors
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout') || error.message.toLowerCase().includes('aborted')) {
      return new AppError({
        code: 'TIMEOUT_ERROR',
        message: 'The request timed out while waiting for a response.',
        userMessage: getFriendlyErrorMessage('TIMEOUT_ERROR'),
        severity: 'error',
        retryable: true,
        cause: error,
      });
    }

    // 2. Check for browser Network errors
    if (
      error.name === 'TypeError' &&
      (error.message.includes('fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('network request failed'))
    ) {
      return new AppError({
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: getFriendlyErrorMessage('NETWORK_ERROR'),
        severity: 'error',
        retryable: true,
        cause: error,
      });
    }
  }

  // 3. Check for API Error objects (like our legacy ApiError or Axios-like response)
  const errObj = error as any;
  if (errObj && typeof errObj === 'object') {
    const statusCode: number | undefined = errObj.statusCode || errObj.status || errObj.response?.status;
    const responseData = errObj.details || errObj.data || errObj.response?.data;

    let code: ErrorCode = 'UNKNOWN_ERROR';
    let retryable = false;

    if (statusCode) {
      switch (statusCode) {
        case 400:
          code = 'BAD_REQUEST';
          break;
        case 401:
          code = 'UNAUTHORIZED';
          break;
        case 403:
          code = 'FORBIDDEN';
          break;
        case 404:
          code = 'NOT_FOUND';
          break;
        case 409:
          code = 'CONFLICT';
          break;
        case 422:
          code = 'UNPROCESSABLE_ENTITY';
          break;
        case 429:
          code = 'RATE_LIMITED';
          retryable = true;
          break;
        case 500:
          code = 'INTERNAL_SERVER_ERROR';
          break;
        case 502:
          code = 'BAD_GATEWAY';
          retryable = true;
          break;
        case 503:
          code = 'SERVICE_UNAVAILABLE';
          retryable = true;
          break;
        case 504:
          code = 'GATEWAY_TIMEOUT';
          retryable = true;
          break;
        default:
          if (statusCode >= 500) {
            code = 'INTERNAL_SERVER_ERROR';
            retryable = true;
          } else {
            code = 'BAD_REQUEST';
          }
      }
    }

    // Extract validation errors if present
    const fieldErrors = extractFieldErrors(responseData);

    // Extract error message
    let rawMessage = errObj.message;
    if (responseData) {
      if (typeof responseData.message === 'string') {
        rawMessage = responseData.message;
      } else if (Array.isArray(responseData.message) && responseData.message.length > 0) {
        rawMessage = responseData.message.join('. ');
      } else if (typeof responseData.error === 'string') {
        rawMessage = responseData.error;
      }
    }

    if (!rawMessage || rawMessage === '[object Object]') {
      rawMessage = `Request failed with HTTP status ${statusCode || 'unknown'}`;
    }

    return new AppError({
      code,
      statusCode,
      message: rawMessage,
      userMessage: getFriendlyErrorMessage(code, rawMessage),
      fieldErrors,
      details: responseData,
      severity: statusCode && statusCode >= 500 ? 'fatal' : 'error',
      retryable,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // 4. Fallback for strings or primitive errors
  const fallbackMessage = typeof error === 'string' ? error : 'An unexpected error occurred';
  return new AppError({
    code: 'UNKNOWN_ERROR',
    message: fallbackMessage,
    userMessage: getFriendlyErrorMessage('UNKNOWN_ERROR', fallbackMessage),
    severity: 'error',
    retryable: false,
  });
}

/**
 * Extracts structured field-level validation errors from NestJS or custom API responses
 */
function extractFieldErrors(data: any): ValidationErrorMap | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const map: ValidationErrorMap = {};

  // NestJS class-validator format: { message: ["email must be an email", "name should not be empty"] }
  if (Array.isArray(data.message)) {
    for (const msg of data.message) {
      if (typeof msg === 'string') {
        const firstWord = msg.split(' ')[0];
        if (firstWord) {
          if (!map[firstWord]) map[firstWord] = [];
          map[firstWord].push(msg);
        }
      }
    }
  }

  // Format: { errors: { field: ["msg1", "msg2"] } } or { fieldErrors: { ... } }
  const fieldContainer = data.errors || data.fieldErrors;
  if (fieldContainer && typeof fieldContainer === 'object' && !Array.isArray(fieldContainer)) {
    for (const [field, errs] of Object.entries(fieldContainer)) {
      if (Array.isArray(errs)) {
        map[field] = errs.map(String);
      } else if (typeof errs === 'string') {
        map[field] = [errs];
      }
    }
  }

  return Object.keys(map).length > 0 ? map : undefined;
}

/**
 * Standard utility to handle and log errors with optional notification
 */
export function handleAppError(error: unknown, context?: string): AppError {
  const normalized = normalizeError(error, context);
  errorLogger.error(normalized, { context });
  return normalized;
}
