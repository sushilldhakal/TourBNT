import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'http-errors';
import { config } from '../config/config';

/**
 * Centralized error handling middleware
 */
export const errorHandler = (
    err: Error | HttpError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = 'statusCode' in err ? err.statusCode : 500;
    const message = err.message || 'Internal Server Error';

    // Log error details
    console.error(`[Error] ${statusCode}: ${message}`);
    console.error(`[Path] ${req.method} ${req.path}`);
    if (config.env === 'development') {
        console.error(err.stack);
    }

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
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`
    });
};
