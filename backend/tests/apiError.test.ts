/// <reference types="jest" />
// filepath: /Users/macintosh/Documents/GitHub/DriveSync/backend/tests/apiError.test.ts
import { ApiError, ErrorCode } from '../src/utils/apiError.js';

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const details = [{ field: 'email', message: 'Invalid email format' }];
      const requestId = 'req_123';
      const error = new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Test error', details, requestId);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.details).toEqual(details);
      expect(error.requestId).toBe(requestId);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
      expect(error instanceof Error).toBe(true);
    });

    it('should work without optional parameters', () => {
      const error = new ApiError(500, ErrorCode.INTERNAL_SERVER_ERROR, 'Test error');

      expect(error.details).toEqual([]);
      expect(error.requestId).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should return proper JSON structure', () => {
      const details = [{ field: 'email', message: 'Invalid email' }];
      const requestId = 'req_123';
      const error = new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Test error', details, requestId);

      const json = error.toJSON();

      expect(json).toEqual({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Test error',
          details,
          timestamp: error.timestamp,
          requestId
        }
      });
    });

    it('should not include requestId if not provided', () => {
      const error = new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Test error');
      const json = error.toJSON();

      expect(json.error).not.toHaveProperty('requestId');
    });
  });

  describe('static factory methods', () => {
    it('should create unauthorized error', () => {
      const error = ApiError.unauthorized('Custom message');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Custom message');
    });

    it('should create forbidden error', () => {
      const error = ApiError.forbidden();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.message).toBe('Access forbidden');
    });

    it('should create not found error with resource info', () => {
      const error = ApiError.notFound('User', 'user123');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(error.message).toBe("User with ID 'user123' not found");
    });

    it('should create validation error with details', () => {
      const details = [{ field: 'email', message: 'Required' }];
      const error = ApiError.validationError('Custom validation', details);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual(details);
    });

    it('should create rate limit exceeded error', () => {
      const error = ApiError.rateLimitExceeded();

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    });

    it('should create internal error', () => {
      const error = ApiError.internal('Custom internal error');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe('Custom internal error');
    });
  });
});
