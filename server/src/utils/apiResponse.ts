import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'http-errors';
import { config } from '../config/config';
import { logger } from './logger';
import { normalizeDoc } from './normalizeDoc';

/**
 * HTTP Status Codes Constants
 */
export const HTTP_STATUS = {
    // Success codes
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,

    // Client error codes
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,

    // Server error codes
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Error codes for consistent API responses
 */
export type ErrorCode =
    | 'VALIDATION_ERROR'
    | 'AUTH_ERROR'
    | 'FORBIDDEN_ERROR'
    | 'NOT_FOUND_ERROR'
    | 'RATE_LIMIT_ERROR'
    | 'SERVER_ERROR';

/**
 * Validation error details
 */
export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Pagination metadata structure
 */
export interface PaginationMeta {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}

/**
 * Recursively normalize nested documents in an object
 */
const normalizeNested = (obj: any): any => {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => normalizeNested(item));
    }

    // Check if this is a Mongoose document
    if (typeof obj.toObject === 'function') {
        return normalizeDoc(obj);
    }

    // Handle plain objects with potential nested documents
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
            result[key] = normalizeNested(value);
        } else {
            result[key] = value;
        }
    }

    return result;
};

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.socket.remoteAddress ||
        'unknown'
    );
}

// ============================================================================
// SUCCESS RESPONSE FUNCTIONS
// ============================================================================

/**
 * Send success response with automatic data normalization
 */
export const sendSuccess = (
    res: Response,
    data: any,
    message: string = 'Success',
    statusCode: number = HTTP_STATUS.OK
) => {
    const normalizedData = normalizeNested(data);

    res.status(statusCode).json({
        success: true,
        message,
        data: normalizedData
    });
};

/**
 * Send paginated response with automatic data normalization
 * Standard format: { success, items, pagination, message }
 */
export const sendPaginatedResponse = (
    res: Response,
    items: any[],
    pagination: PaginationMeta,
    message: string = 'Success'
) => {
    const normalizedItems = normalizeDoc(items);

    res.status(HTTP_STATUS.OK).json({
        success: true,
        items: normalizedItems,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            totalItems: pagination.totalItems,
            totalPages: pagination.totalPages
        },
        message
    });
};

// ============================================================================
// ERROR RESPONSE FUNCTIONS
// ============================================================================

/**
 * Send error response
 */
export const sendError = (
    res: Response,
    message: string = 'Error',
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ErrorCode = 'SERVER_ERROR',
    errors?: any
) => {
    res.status(statusCode).json({
        success: false,
        message,
        code,
        ...(errors && { errors })
    });
};
  

/**
 * Send validation error response
 */
export const sendValidationError = (
    res: Response,
    message: string = 'Validation failed',
    errors?: ValidationError[]
) => {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message,
        code: 'VALIDATION_ERROR',
        ...(errors && { errors })
    });
};

/**
 * Send authentication error response
 */
export const sendAuthError = (
    res: Response,
    message: string = 'Authentication required'
) => {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message,
        code: 'AUTH_ERROR'
    });
};

/**
 * Send forbidden error response
 */
export const sendForbiddenError = (
    res: Response,
    message: string = 'Insufficient permissions'
) => {
    res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message,
        code: 'FORBIDDEN_ERROR'
    });
};

/**
 * Send not found error response
 */
export const sendNotFoundError = (
    res: Response,
    message: string = 'Resource not found'
) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message,
        code: 'NOT_FOUND_ERROR'
    });
};

/**
 * Send conflict error response
 */
export const sendConflictError = (
    res: Response,
    message: string = 'Resource already exists'
) => {
    res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message,
        code: 'CONFLICT_ERROR'
    });
};

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Global error handler middleware
 * Centralized error handling with structured logging
 * Controllers should use next(error) to delegate here
 */
export const errorHandler = (
    err: Error | HttpError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // If response was already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    // Determine status code from error
    let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    if ('statusCode' in err && err.statusCode) {
        statusCode = err.statusCode as number;
    } else if ((err as any).status) {
        statusCode = (err as any).status as number;
    }

    const message = err.message || 'Internal Server Error';

    // Log error details with structured logging
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel](`API Error: ${message}`, {
        statusCode,
        method: req.method,
        path: req.path,
        clientIp: getClientIp(req),
        userId: (req as any).user?.id || (req as any).user?._id?.toString(),
        errorName: err.name,
        ...(config.env === 'development' && { stack: err.stack })
    });

    // Handle Mongoose ValidationError
    if (err.name === 'ValidationError') {
        const validationErrors = (err as any).errors ? Object.keys((err as any).errors).map(key => ({
            field: key,
            message: (err as any).errors[key].message
        })) : [];
        return sendValidationError(res, 'Validation failed', validationErrors);
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        return sendValidationError(res, 'Invalid ID format', [{
            field: (err as any).path || 'id',
            message: `Invalid ${(err as any).path || 'ID'} format`
        }]);
    }

    // Handle MongoDB duplicate key error (code 11000)
    if ((err as any).code === 11000) {
        const field = Object.keys((err as any).keyValue || {})[0] || 'unknown';
        return sendConflictError(res, `${field} already exists`);
    }

    // Handle JWT errors
    if (err.name === 'TokenExpiredError') {
        return sendAuthError(res, 'Token has expired');
    }

    if (err.name === 'JsonWebTokenError') {
        return sendAuthError(res, 'Invalid token');
    }

    // Handle HTTP errors with status codes
    if (statusCode === HTTP_STATUS.BAD_REQUEST) {
        // Check if error has validation details
        const details = (err as any).details;
        if (details && Array.isArray(details)) {
            return sendValidationError(res, message, details);
        }
        return sendValidationError(res, message);
    }

    if (statusCode === HTTP_STATUS.UNAUTHORIZED) {
        return sendAuthError(res, message);
    }

    if (statusCode === HTTP_STATUS.FORBIDDEN) {
        return sendForbiddenError(res, message);
    }

    if (statusCode === HTTP_STATUS.NOT_FOUND) {
        return sendNotFoundError(res, message);
    }

    if (statusCode === HTTP_STATUS.CONFLICT) {
        return sendConflictError(res, message);
    }

    // Default: send generic error response
    return sendError(res, message, statusCode);
};

/**
 * 404 Not Found handler middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    logger.warn('Route not found', {
        method: req.method,
        path: req.path,
        clientIp: getClientIp(req)
    });

    sendNotFoundError(res, `Route ${req.method} ${req.path} not found`);
};

// ============================================================================
// HELPER FUNCTIONS FOR COMMON SCENARIOS
// ============================================================================

/**
 * Handle resource not found scenarios
 */
export const handleResourceNotFound = (
    res: Response,
    resourceType: string,
    resourceId?: string
): void => {
    const message = resourceId
        ? `${resourceType} with ID ${resourceId} not found`
        : `${resourceType} not found`;
    sendNotFoundError(res, message);
};

/**
 * Handle unauthorized access scenarios
 */
export const handleUnauthorized = (
    res: Response,
    message: string = 'Authentication required'
): void => {
    sendAuthError(res, message);
};

/**
 * Handle forbidden access scenarios
 */
export const handleForbidden = (
    res: Response,
    message: string = 'Insufficient permissions'
): void => {
    sendForbiddenError(res, message);
};

/**
 * Handle validation errors with field-specific details
 */
export const handleValidationErrors = (
    res: Response,
    errors: ValidationError[],
    message: string = 'Validation failed'
): void => {
    sendValidationError(res, message, errors);
};

/**
 * Handle duplicate resource scenarios
 */
export const handleDuplicateResource = (
    res: Response,
    field: string,
    value: string,
    resourceType: string = 'Resource'
): void => {
    const errors: ValidationError[] = [{
        field,
        message: `${resourceType} with ${field} '${value}' already exists`
    }];
    handleValidationErrors(res, errors, 'Duplicate entry');
};

/**
 * Handle invalid ID format scenarios
 */
export const handleInvalidId = (
    res: Response,
    field: string = 'id'
): void => {
    const errors: ValidationError[] = [{
        field,
        message: `Invalid ${field} format`
    }];
    handleValidationErrors(res, errors, 'Invalid ID format');
};

/**
 * Handle missing required fields
 */
export const handleMissingFields = (
    res: Response,
    missingFields: string[]
): void => {
    const errors: ValidationError[] = missingFields.map(field => ({
        field,
        message: `${field} is required`
    }));
    handleValidationErrors(res, errors, 'Missing required fields');
};

