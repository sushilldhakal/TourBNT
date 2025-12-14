import { Response } from 'express';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
        path: string;
        requestId?: string;
    };
}

/**
 * Error codes enum for consistency
 */
export enum ErrorCode {
    // Validation errors (400)
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_PAGINATION = 'INVALID_PAGINATION',
    INVALID_SORT_FIELD = 'INVALID_SORT_FIELD',
    INVALID_FILTER = 'INVALID_FILTER',
    INVALID_INPUT = 'INVALID_INPUT',

    // Authentication errors (401)
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    MISSING_TOKEN = 'MISSING_TOKEN',

    // Authorization errors (403)
    FORBIDDEN = 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

    // Not found errors (404)
    NOT_FOUND = 'NOT_FOUND',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

    // Conflict errors (409)
    CONFLICT = 'CONFLICT',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',

    // Rate limit errors (429)
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // Server errors (500)
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

/**
 * Format and send error response
 * 
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param code - Error code (use ErrorCode enum)
 * @param message - Human-readable error message
 * @param path - Request path
 * @param details - Optional additional error details
 * @param requestId - Optional request ID for tracking
 */
export const sendErrorResponse = (
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    path: string,
    details?: any,
    requestId?: string
): void => {
    const errorResponse: ErrorResponse = {
        error: {
            code,
            message,
            timestamp: new Date().toISOString(),
            path,
            ...(details && { details }),
            ...(requestId && { requestId })
        }
    };

    res.status(statusCode).json(errorResponse);
};

/**
 * Send validation error (400)
 */
export const sendValidationError = (
    res: Response,
    path: string,
    details: any,
    message: string = 'Invalid request data'
): void => {
    sendErrorResponse(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        message,
        path,
        details
    );
};

/**
 * Send authentication error (401)
 */
export const sendAuthenticationError = (
    res: Response,
    path: string,
    message: string = 'Authentication failed',
    code: string = ErrorCode.AUTHENTICATION_FAILED
): void => {
    sendErrorResponse(res, 401, code, message, path);
};

/**
 * Send authorization error (403)
 */
export const sendAuthorizationError = (
    res: Response,
    path: string,
    message: string = 'Insufficient permissions',
    code: string = ErrorCode.FORBIDDEN
): void => {
    sendErrorResponse(res, 403, code, message, path);
};

/**
 * Send not found error (404)
 */
export const sendNotFoundError = (
    res: Response,
    path: string,
    message: string = 'Resource not found',
    resourceType?: string
): void => {
    const details = resourceType ? { resourceType } : undefined;
    sendErrorResponse(
        res,
        404,
        ErrorCode.RESOURCE_NOT_FOUND,
        message,
        path,
        details
    );
};

/**
 * Send conflict error (409)
 */
export const sendConflictError = (
    res: Response,
    path: string,
    message: string = 'Resource already exists',
    details?: any
): void => {
    sendErrorResponse(
        res,
        409,
        ErrorCode.CONFLICT,
        message,
        path,
        details
    );
};

/**
 * Send rate limit error (429)
 */
export const sendRateLimitError = (
    res: Response,
    path: string,
    retryAfter: number,
    limit: number,
    windowMs: number
): void => {
    sendErrorResponse(
        res,
        429,
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many requests, please try again later',
        path,
        {
            retryAfter,
            limit,
            windowMs
        }
    );
};

/**
 * Send internal server error (500)
 */
export const sendInternalServerError = (
    res: Response,
    path: string,
    message: string = 'Internal server error',
    details?: any
): void => {
    sendErrorResponse(
        res,
        500,
        ErrorCode.INTERNAL_SERVER_ERROR,
        message,
        path,
        details
    );
};
