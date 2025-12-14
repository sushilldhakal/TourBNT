import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../utils/httpStatusCodes';

/**
 * Filter parameters interface
 */
export interface FilterParams {
    [key: string]: any;
}

/**
 * Sort parameters interface
 */
export interface SortParams {
    field: string;
    order: 'asc' | 'desc';
}

/**
 * Extend Express Request to include filter and sort params
 */
declare global {
    namespace Express {
        interface Request {
            filters?: FilterParams;
            sort?: SortParams;
        }
    }
}

/**
 * Filter and sort middleware factory
 * Creates middleware that parses and validates filter and sort query parameters
 * 
 * @param allowedFilters - Array of allowed filter field names
 * @param allowedSortFields - Array of allowed sort field names
 * @returns Express middleware function
 * 
 * Usage:
 * router.get('/tours', 
 *   filterSortMiddleware(['status', 'category', 'destination'], ['createdAt', 'price', 'title']),
 *   getAllTours
 * );
 */
export const filterSortMiddleware = (
    allowedFilters: string[],
    allowedSortFields: string[]
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Parse filters
        const filters: FilterParams = {};
        for (const key of allowedFilters) {
            if (req.query[key]) {
                filters[key] = req.query[key];
            }
        }

        // Parse sorting
        let sort: SortParams | undefined;
        if (req.query.sort) {
            const sortField = req.query.sort as string;
            const sortOrder = (req.query.order as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

            // Validate sort field
            if (!allowedSortFields.includes(sortField)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'INVALID_SORT_FIELD',
                        message: `Invalid sort field: ${sortField}`,
                        details: {
                            allowedFields: allowedSortFields,
                            providedField: sortField
                        },
                        timestamp: new Date().toISOString(),
                        path: req.path
                    }
                });
                return;
            }

            sort = { field: sortField, order: sortOrder };
        }

        // Attach filter and sort params to request
        req.filters = filters;
        req.sort = sort;

        next();
    };
};
