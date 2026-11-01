// DispatchHub User-Facing Error Messages Dictionary
import { ErrorCode } from './error.types';

export const ERROR_MESSAGES: Record<ErrorCode, { title: string; message: string; action?: string }> = {
  BAD_REQUEST: {
    title: 'Invalid Request',
    message: 'The submitted request was malformed or contains invalid parameters. Please review your input.',
    action: 'Review Input',
  },
  UNAUTHORIZED: {
    title: 'Authentication Required',
    message: 'Your session has expired or is invalid. Please sign in again to continue.',
    action: 'Sign In',
  },
  FORBIDDEN: {
    title: 'Access Restricted',
    message: 'You do not have the required permissions to perform this action. Contact your administrator.',
    action: 'Go to Dashboard',
  },
  NOT_FOUND: {
    title: 'Resource Not Found',
    message: 'The requested resource could not be found. It may have been deleted or moved.',
    action: 'Go Back',
  },
  CONFLICT: {
    title: 'Conflict Detected',
    message: 'This record already exists or conflicts with another current state (e.g. domain already registered).',
    action: 'Check Existing Records',
  },
  UNPROCESSABLE_ENTITY: {
    title: 'Validation Failed',
    message: 'One or more fields failed validation checks. Please verify the highlighted inputs.',
    action: 'Correct Fields',
  },
  RATE_LIMITED: {
    title: 'Rate Limit Reached',
    message: 'Too many requests were sent in a short duration. Please wait a moment before trying again.',
    action: 'Wait & Retry',
  },
  INTERNAL_SERVER_ERROR: {
    title: 'Server Error',
    message: 'DispatchHub encountered an internal server error while processing your request.',
    action: 'Retry Action',
  },
  BAD_GATEWAY: {
    title: 'Gateway Unavailable',
    message: 'The upstream dispatch service or Postal MTA gateway failed to respond properly.',
    action: 'Retry in a Moment',
  },
  SERVICE_UNAVAILABLE: {
    title: 'Service Temporarily Offline',
    message: 'The dispatch service is temporarily undergoing maintenance or overloaded.',
    action: 'Check System Status',
  },
  GATEWAY_TIMEOUT: {
    title: 'Gateway Timeout',
    message: 'The upstream gateway took too long to complete your request. Please try again.',
    action: 'Retry',
  },
  NETWORK_ERROR: {
    title: 'Network Connection Lost',
    message: 'Unable to reach the DispatchHub server. Please check your internet connection.',
    action: 'Check Connection',
  },
  TIMEOUT_ERROR: {
    title: 'Request Timed Out',
    message: 'The request took longer than 15 seconds to finish. The server may be experiencing high load.',
    action: 'Retry',
  },
  PARSE_ERROR: {
    title: 'Data Format Error',
    message: 'Unable to parse server response or supplied configuration format.',
    action: 'Verify Format',
  },
  VALIDATION_ERROR: {
    title: 'Input Validation Error',
    message: 'Please review and correct the errors indicated below.',
    action: 'Fix Errors',
  },
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected issue occurred. Please try again or contact support if the issue persists.',
    action: 'Retry',
  },
};

export function getFriendlyErrorMessage(code: ErrorCode, customMessage?: string): string {
  if (customMessage && customMessage.trim().length > 0) {
    return customMessage;
  }
  return ERROR_MESSAGES[code]?.message || ERROR_MESSAGES.UNKNOWN_ERROR.message;
}

export function getFriendlyErrorTitle(code: ErrorCode): string {
  return ERROR_MESSAGES[code]?.title || ERROR_MESSAGES.UNKNOWN_ERROR.title;
}
