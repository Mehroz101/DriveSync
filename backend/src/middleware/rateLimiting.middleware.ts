import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { ApiError, ErrorCode } from '../utils/apiError.js';

// Store for tracking rate limits (in production, use Redis)
const store = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const rateLimitConfig = {
  // API rate limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many API requests, please try again later',
  },
  
  // Authentication rate limits (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
  },
  
  // File operations (moderate)
  files: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 file operations per minute
    message: 'Too many file operations, please try again later',
  },
  
  // Sync operations (most restrictive)
  sync: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 sync operations per hour
    message: 'Too many sync requests, please try again in an hour',
  },

  // Upload rate limits
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: 'Too many upload requests, please try again later',
  }
};

// Custom key generator that uses userId if available, otherwise IP
const generateKey = (req: Request & { userId?: string }): string => {
  return req.userId ? `user:${req.userId}` : `ip:${req.ip}`;
};

// Custom error handler for rate limit
const rateLimitHandler = (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const key = generateKey(req as Request & { userId?: string });
  
  logger.warn('Rate limit exceeded', {
    key,
    ip: req.ip,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    requestId
  });

  const error = ApiError.rateLimitExceeded(
    'Rate limit exceeded. Please try again later.',
    requestId
  );
  
  res.status(429).json(error.toJSON());
};

// Create rate limiters
export const apiRateLimiter = rateLimit({
  ...rateLimitConfig.api,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/metrics';
  }
});

export const authRateLimiter = rateLimit({
  ...rateLimitConfig.auth,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

export const filesRateLimiter = rateLimit({
  ...rateLimitConfig.files,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

export const syncRateLimiter = rateLimit({
  ...rateLimitConfig.sync,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadRateLimiter = rateLimit({
  ...rateLimitConfig.upload,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to create custom rate limiter
export const createRateLimiter = (config: {
  windowMs: number;
  max: number;
  message: string;
}) => {
  return rateLimit({
    ...config,
    keyGenerator: generateKey,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
  });
};
