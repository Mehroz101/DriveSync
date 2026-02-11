import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError, ErrorCode, ApiErrorDetail } from '../utils/apiError.js';

// Common validation schemas
export const commonSchemas = {
  objectId: Joi.string().hex().length(24),
  email: Joi.string().email().lowercase().trim(),
  password: Joi.string().min(8).max(128)
    .pattern(/[a-z]/, 'lowercase')
    .pattern(/[A-Z]/, 'uppercase') 
    .pattern(/[0-9]/, 'digit')
    .pattern(/[^a-zA-Z0-9]/, 'special'),
  pagination: {
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sortBy: Joi.string().max(50).default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  },
  search: Joi.string().max(200).trim().allow(''),
  fileFilter: {
    search: Joi.string().max(200).trim().allow(''),
    driveIds: Joi.array().items(Joi.string().hex().length(24)),
    mimeTypes: Joi.array().items(Joi.string().max(100)),
    minSize: Joi.number().integer().min(0),
    maxSize: Joi.number().integer().min(0),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')),
    duplicatesOnly: Joi.boolean(),
    trashedOnly: Joi.boolean(),
    sharedOnly: Joi.boolean(),
    starredOnly: Joi.boolean()
  }
};

// Validation schemas for different endpoints
export const validationSchemas = {
  // Authentication
  register: Joi.object({
    name: Joi.string().min(1).max(100).trim().required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required()
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().min(1).max(128).required()
  }),

  // Files
  getFiles: Joi.object({
    ...commonSchemas.pagination,
    ...commonSchemas.fileFilter
  }),

  uploadFile: Joi.object({
    driveAccountId: commonSchemas.objectId.required(),
    parentId: Joi.string().allow(''),
    name: Joi.string().min(1).max(255).trim()
  }),

  deleteFiles: Joi.object({
    fileIds: Joi.array().items(commonSchemas.objectId).min(1).max(100).required(),
    permanent: Joi.boolean().default(false)
  }),

  // Drive operations
  syncDrive: Joi.object({
    driveId: commonSchemas.objectId.required(),
    force: Joi.boolean().default(false)
  }),

  // Duplicates
  getDuplicates: Joi.object({
    ...commonSchemas.pagination,
    minSize: Joi.number().integer().min(0).default(1024), // Default 1KB minimum
    algorithm: Joi.string().valid('name-size', 'content-hash').default('name-size')
  }),

  // Analytics
  getAnalytics: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate'))
  }),

  // Search
  search: Joi.object({
    q: Joi.string().min(1).max(200).trim().required(),
    ...commonSchemas.pagination,
    driveIds: Joi.array().items(commonSchemas.objectId),
    fileTypes: Joi.array().items(Joi.string().valid('document', 'image', 'video', 'audio', 'folder', 'other'))
  })
};

interface ValidationOptions {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

// Main validation middleware factory
export function validate(options: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ApiErrorDetail[] = [];
    const requestId = (req as any).requestId;

    try {
      // Validate body
      if (options.body) {
        const { error, value } = options.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          errors.push(...formatJoiErrors(error, 'body'));
        } else {
          req.body = value;
        }
      }

      // Validate query parameters
      if (options.query) {
        const { error, value } = options.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          errors.push(...formatJoiErrors(error, 'query'));
        } else {
          req.query = value;
        }
      }

      // Validate URL parameters
      if (options.params) {
        const { error, value } = options.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          errors.push(...formatJoiErrors(error, 'params'));
        } else {
          req.params = value;
        }
      }

      // Validate headers
      if (options.headers) {
        const { error, value } = options.headers.validate(req.headers, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: true // Headers can have additional fields
        });

        if (error) {
          errors.push(...formatJoiErrors(error, 'headers'));
        } else {
          // Don't replace all headers, just update validated ones
          Object.assign(req.headers, value);
        }
      }

      // If there are validation errors, throw ApiError
      if (errors.length > 0) {
        throw new ApiError(
          400,
          ErrorCode.VALIDATION_ERROR,
          'Request validation failed',
          errors,
          requestId
        );
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        // Unexpected validation error
        next(new ApiError(
          500,
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Validation processing error',
          [],
          requestId
        ));
      }
    }
  };
}

// Helper function to format Joi errors
function formatJoiErrors(joiError: Joi.ValidationError, source: string): ApiErrorDetail[] {
  return joiError.details.map(detail => ({
    field: `${source}.${detail.path.join('.')}`,
    message: detail.message,
    value: detail.context?.value,
    constraint: detail.type
  }));
}

// Convenience validators for common patterns
export const validators = {
  body: (schema: Joi.ObjectSchema) => validate({ body: schema }),
  query: (schema: Joi.ObjectSchema) => validate({ query: schema }),
  params: (schema: Joi.ObjectSchema) => validate({ params: schema }),
  
  // Common parameter validations
  objectIdParam: (paramName = 'id') => validate({
    params: Joi.object({
      [paramName]: commonSchemas.objectId.required()
    })
  }),

  pagination: () => validate({
    query: Joi.object(commonSchemas.pagination)
  }),

  fileFilters: () => validate({
    query: Joi.object({
      ...commonSchemas.pagination,
      ...commonSchemas.fileFilter
    })
  })
};

// Custom validation helpers
export const customValidators = {
  // Validate file upload constraints
  fileUpload: (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    const requestId = (req as any).requestId;

    if (!file) {
      return next(new ApiError(
        400,
        ErrorCode.MISSING_REQUIRED_FIELD,
        'File is required',
        [{ field: 'file', message: 'No file uploaded' }],
        requestId
      ));
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return next(new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'File too large',
        [{ 
          field: 'file', 
          message: `File size must be less than ${maxSize / 1024 / 1024}MB`,
          value: file.size 
        }],
        requestId
      ));
    }

    // Validate file type (basic check)
    const allowedTypes = [
      'image/', 'video/', 'audio/', 'text/', 'application/pdf',
      'application/msword', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument'
    ];

    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    if (!isAllowed) {
      return next(new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'File type not allowed',
        [{ 
          field: 'file', 
          message: 'File type is not supported',
          value: file.mimetype 
        }],
        requestId
      ));
    }

    next();
  },

  // Validate bulk operations limits
  bulkOperation: (maxItems = 100) => (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId;
    const items = req.body.fileIds || req.body.driveIds || req.body.items || [];

    if (!Array.isArray(items)) {
      return next(new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Items must be an array',
        [{ field: 'items', message: 'Expected array of items' }],
        requestId
      ));
    }

    if (items.length > maxItems) {
      return next(new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        `Too many items in bulk operation`,
        [{ 
          field: 'items', 
          message: `Maximum ${maxItems} items allowed`,
          value: items.length 
        }],
        requestId
      ));
    }

    next();
  }
};
