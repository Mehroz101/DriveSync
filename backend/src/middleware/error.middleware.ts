import { Request, Response, NextFunction } from "express";
import { ApiError, ErrorCode } from "../utils/apiError.js";
import { DriveAuthError } from "../utils/driveAuthError.js";
import { logger } from "../utils/logger.js";

interface AuthenticatedRequest extends Request {
  userId?: string;
  requestId?: string;
}

export const errorHandler = (
  err: any,
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
) => {
  // Generate request ID if not present
  const requestId = req.requestId || generateRequestId();

  // Handle our custom API errors
  if (err instanceof ApiError) {
    logger.warn('API Error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
      requestId,
      url: req.originalUrl,
      method: req.method,
      userId: req.userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Drive authentication errors
  if (err instanceof DriveAuthError) {
    logger.warn('Drive Auth Error', {
      message: err.message,
      statusCode: err.statusCode,
      requestId,
      url: req.originalUrl,
      method: req.method,
      userId: req.userId
    });

    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle validation errors (from Joi or express-validator)
  if (err.name === 'ValidationError' || (err.isJoi && err.details)) {
    const details = err.details?.map((detail: any) => ({
      field: detail.path?.[0] || detail.context?.key,
      message: detail.message,
      value: detail.context?.value
    })) || [];

    const validationError = new ApiError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Request validation failed',
      details,
      requestId
    );

    logger.warn('Validation Error', {
      details,
      requestId,
      url: req.originalUrl,
      method: req.method,
      body: req.body
    });

    return res.status(400).json(validationError.toJSON());
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const duplicateError = new ApiError(
      409,
      ErrorCode.RESOURCE_ALREADY_EXISTS,
      `Duplicate value for ${field}`,
      [{ field, message: `${field} already exists` }],
      requestId
    );

    logger.warn('Duplicate Key Error', {
      field,
      value: err.keyValue,
      requestId,
      url: req.originalUrl,
      method: req.method,
      userId: req.userId
    });

    return res.status(409).json(duplicateError.toJSON());
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const jwtError = ApiError.unauthorized('Invalid token', [], requestId);
    
    logger.warn('JWT Error', {
      message: err.message,
      requestId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    return res.status(401).json(jwtError.toJSON());
  }

  if (err.name === 'TokenExpiredError') {
    const expiredError = new ApiError(
      401, 
      ErrorCode.TOKEN_EXPIRED, 
      'Token has expired', 
      [], 
      requestId
    );
    
    logger.warn('Token Expired', {
      expiredAt: err.expiredAt,
      requestId,
      url: req.originalUrl,
      method: req.method,
      userId: req.userId
    });

    return res.status(401).json(expiredError.toJSON());
  }

  // Handle rate limiting errors
  if (err.statusCode === 429 || err.status === 429) {
    const rateLimitError = ApiError.rateLimitExceeded(
      err.message || 'Too many requests', 
      requestId
    );

    logger.warn('Rate Limit Exceeded', {
      ip: req.ip,
      requestId,
      url: req.originalUrl,
      method: req.method
    });

    return res.status(429).json(rateLimitError.toJSON());
  }

  // Handle Google API errors
  if (err.response?.status >= 400 && err.response?.status < 500 && err.config?.url?.includes('googleapis.com')) {
    const googleError = ApiError.googleApiError(
      `Google API error: ${err.response.data?.error?.message || err.message}`,
      err.response.data?.error?.details || [],
      requestId
    );

    logger.error('Google API Error', {
      status: err.response.status,
      data: err.response.data,
      url: err.config.url,
      requestId,
      userId: req.userId
    });

    return res.status(502).json(googleError.toJSON());
  }

  // Log unhandled errors (these are likely bugs)
  logger.error('Unhandled Error', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    requestId,
    url: req.originalUrl,
    method: req.method,
    userId: req.userId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query
  });

  // Return generic internal error (don't leak implementation details)
  const internalError = ApiError.internal(
    process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message,
    requestId
  );

  res.status(500).json(internalError.toJSON());
};

// Request ID generator
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Middleware to add request ID to all requests
export const requestIdMiddleware = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  req.requestId = generateRequestId();
  next();
};
