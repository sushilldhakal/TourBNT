import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../utils/httpStatusCodes';

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

/**
 * Extend Express Request to include pagination params
 */
declare global {
    namespace Express {
        interface Request {
            pagination?: PaginationParams;
        }
    }
}

/**
 * Pagination middleware
 * Parses and validates page and limit query parameters
 * Attaches pagination params to req.pagination
 * 
 * Default values:
 * - page: 1
 * - limit: 10
 * 
 * Validation:
 * - page must be >= 1
 * - limit must be >= 1 and <= 100
 */
export const paginationMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate pagination parameters
    const errors: { page?: string; limit?: string } = {};

    if (page < 1) {
        errors.page = 'Page must be >= 1';
    }

    if (limit < 1) {
        errors.limit = 'Limit must be >= 1';
    } else if (limit > 100) {
        errors.limit = 'Limit must be <= 100';
    }

    // If there are validation errors, return 400
    if (Object.keys(errors).length > 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: {
                code: 'INVALID_PAGINATION',
                message: 'Invalid pagination parameters',
                details: errors,
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
        return;
    }

    // Attach pagination params to request
    req.pagination = {
        page,
        limit,
        skip: (page - 1) * limit
    };

    next();
};
