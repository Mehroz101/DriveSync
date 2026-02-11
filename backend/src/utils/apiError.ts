export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Business Logic
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_PERMITTED = 'OPERATION_NOT_PERMITTED',
  
  // External Services
  GOOGLE_API_ERROR = 'GOOGLE_API_ERROR',
  DRIVE_CONNECTION_ERROR = 'DRIVE_CONNECTION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export interface ApiErrorDetail {
  field?: string;
  value?: unknown;
  constraint?: string;
  message: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details: ApiErrorDetail[];
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    statusCode: number, 
    code: ErrorCode, 
    message: string, 
    details: ApiErrorDetail[] = [],
    requestId?: string
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
        ...(this.requestId && { requestId: this.requestId })
      }
    };
  }

  // Static factory methods for common errors
  static unauthorized(message = 'Unauthorized access', details: ApiErrorDetail[] = [], requestId?: string) {
    return new ApiError(401, ErrorCode.UNAUTHORIZED, message, details, requestId);
  }

  static forbidden(message = 'Access forbidden', details: ApiErrorDetail[] = [], requestId?: string) {
    return new ApiError(403, ErrorCode.FORBIDDEN, message, details, requestId);
  }

  static notFound(resource = 'Resource', id?: string, requestId?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    return new ApiError(404, ErrorCode.RESOURCE_NOT_FOUND, message, [], requestId);
  }

  static validationError(message = 'Validation failed', details: ApiErrorDetail[] = [], requestId?: string) {
    return new ApiError(400, ErrorCode.VALIDATION_ERROR, message, details, requestId);
  }

  static googleApiError(message = 'Google API error', details: ApiErrorDetail[] = [], requestId?: string) {
    return new ApiError(502, ErrorCode.GOOGLE_API_ERROR, message, details, requestId);
  }

  static rateLimitExceeded(message = 'Rate limit exceeded', requestId?: string) {
    return new ApiError(429, ErrorCode.RATE_LIMIT_EXCEEDED, message, [], requestId);
  }

  static internal(message = 'Internal server error', requestId?: string) {
    return new ApiError(500, ErrorCode.INTERNAL_SERVER_ERROR, message, [], requestId);
  }
}
