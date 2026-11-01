// DispatchHub Normalized Error Types

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export type ValidationErrorMap = Record<string, string[]>;

export interface AppErrorOptions {
  code?: ErrorCode;
  statusCode?: number;
  message: string;
  userMessage?: string;
  fieldErrors?: ValidationErrorMap;
  details?: any;
  severity?: ErrorSeverity;
  retryable?: boolean;
  timestamp?: number;
  cause?: Error;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly userMessage: string;
  public readonly fieldErrors?: ValidationErrorMap;
  public readonly details?: any;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly timestamp: number;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code || 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode;
    this.userMessage = options.userMessage || options.message;
    this.fieldErrors = options.fieldErrors;
    this.details = options.details;
    this.severity = options.severity || 'error';
    this.retryable = options.retryable ?? false;
    this.timestamp = options.timestamp || Date.now();

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
