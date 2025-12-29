import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../utils/apiResponse';
import { 
  parsePaginationParams, 
  validatePaginationParams,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  MAX_LIMIT
} from '../utils/paginationUtils';

export interface PaginationParams {
  page: number;
  limit: number | 'all';
  skip: number;
  useHybrid: boolean;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export interface RequestWithPagination extends Request {
  pagination?: PaginationParams;
  sort?: SortParams;
}

/**
 * Unified Pagination Middleware
 * @param options.required - whether pagination params are mandatory (default: true)
 */
export const paginationMiddleware = (options: { required?: boolean } = {}) => {
  const { required = true } = options;

  return (req: RequestWithPagination, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationParams(req);
      const validation = validatePaginationParams(pagination.page, pagination.limit);

      if (!validation.isValid && required) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid pagination parameters',
          errors: validation.errors,
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const isValid = validation.isValid || !required;

      // Attach pagination and sort to request
      req.pagination = isValid
        ? {
            ...pagination,
            useHybrid: pagination.limit === 'all' || (typeof pagination.limit === 'number' && pagination.limit > MAX_LIMIT),
          }
        : {
            page: DEFAULT_PAGE,
            limit: DEFAULT_LIMIT,
            skip: 0,
            useHybrid: false,
          };

      req.sort = {
        field: pagination.sortBy || DEFAULT_SORT_BY,
        order: pagination.sortOrder || DEFAULT_SORT_ORDER,
      };

      next();
    } catch (error) {
      console.error('Pagination middleware error:', error);

      // Fallback defaults
      req.pagination = {
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        skip: 0,
        useHybrid: false,
      };
      req.sort = {
        field: DEFAULT_SORT_BY,
        order: DEFAULT_SORT_ORDER,
      };
      next();
    }
  };
};


