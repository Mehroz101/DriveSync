import { Response } from 'express';

/**
 * Standardized API Response Structure
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  }>;
  meta?: Record<string, unknown>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Send standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: {
    message?: string;
    statusCode?: number;
    meta?: ApiSuccessResponse<T>['meta'];
  } = {}
): Response {
  const { message, statusCode = 200, meta } = options;
  
  return res.status(statusCode).json({
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...(meta && { meta }),
  } as ApiSuccessResponse<T>);
}

/**
 * Send standardized error response
 */
export function sendError(
  res: Response,
  error: string | Error,
  options: {
    statusCode?: number;
    errors?: ApiErrorResponse['errors'];
    meta?: Record<string, unknown>;
  } = {}
): Response {
  const { statusCode = 500, errors, meta } = options;
  
  const errorMessage = error instanceof Error ? error.message : error;
  
  return res.status(statusCode).json({
    success: false,
    error: errorMessage,
    ...(errors && { errors }),
    ...(meta && { meta }),
  } as ApiErrorResponse);
}

/**
 * Send paginated success response
 */
export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  },
  options: {
    message?: string;
    statusCode?: number;
  } = {}
): Response {
  const { message, statusCode = 200 } = options;
  
  const totalPages = pagination.totalPages ?? Math.ceil(pagination.total / pagination.limit);
  const hasNext = pagination.hasNext ?? pagination.page < totalPages;
  const hasPrev = pagination.hasPrev ?? pagination.page > 1;
  
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNext,
      hasPrev,
    },
  } as ApiSuccessResponse<T[]>);
}

/**
 * Validate and normalize pagination parameters
 */
export function normalizePagination(query: {
  page?: string | number;
  limit?: string | number;
}): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(String(query.page || 1), 10) || 1);
  const limit = Math.min(
    Math.max(1, parseInt(String(query.limit || 50), 10) || 50),
    100 // Max limit
  );
  
  return { page, limit };
}

/**
 * Parse boolean query parameters safely
 */
export function parseBoolean(val: unknown): boolean | undefined {
  if (val === 'true' || val === true || val === '1' || val === 1) return true;
  if (val === 'false' || val === false || val === '0' || val === 0) return false;
  return undefined;
}
