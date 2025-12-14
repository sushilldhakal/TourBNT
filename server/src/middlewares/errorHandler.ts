import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'http-errors';
import { config } from '../config/config';
import { HTTP_STATUS } from '../utils/httpStatusCodes';
import { logger } from '../utils/logger';

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

/**
 * Centralized error handling middleware
 */
export const errorHandler = (
    err: Error | HttpError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = 'statusCode' in err ? err.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = err.message || 'Internal Server Error';

    // Log error details with structured logging
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel](`API Error: ${message}`, {
        statusCode,
        method: req.method,
        path: req.path,
        clientIp: getClientIp(req),
        userId: (req as any).user?.id || (req as any).user?._id?.toString(),
        ...(config.env === 'development' && { stack: err.stack })
    });

    res.status(statusCode).json({
        success: false,
        message,
        ...(config.env === 'development' && {
            stack: err.stack,
            path: req.path,
            method: req.method
        })
    });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    logger.warn('Route not found', {
        method: req.method,
        path: req.path,
        clientIp: getClientIp(req)
    });

    res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`
    });
};
