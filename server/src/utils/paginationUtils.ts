import { Request } from 'express';

/**
 * Pagination query parameters from request
 */
export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination parameters interface
 * Used by services that need pagination params
 */
export interface PaginationParams {
  page?: number;
  limit?: number | 'all';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * Pagination options for database queries
 */
export interface PaginationOptions {
  page: number;
  limit: number | 'all';
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;
export const DEFAULT_SORT_BY = 'createdAt';
export const DEFAULT_SORT_ORDER = 'desc';

/**
 * Parse pagination parameters from request
 * Supports "all" as a special limit value
 */
export const parsePaginationParams = (req: Request): PaginationOptions => {
  const query = req.query as PaginationQuery;

  // Parse and validate page number
  let page = DEFAULT_PAGE;
  if (query.page) {
    const parsedPage = parseInt(String(query.page), 10);
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }

  // Parse and validate limit
  // Supports "all" or numeric values
  let limit: number | 'all' = DEFAULT_LIMIT;
  if (query.limit) {
    const limitStr = String(query.limit).toLowerCase();
    if (limitStr === 'all') {
      limit = 'all';
    } else {
      const parsedLimit = parseInt(limitStr, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        // Cap at MAX_LIMIT for numeric values
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }
  }

  // Calculate skip value (only for numeric limits)
  const skip = typeof limit === 'number' ? (page - 1) * limit : 0;

  // Parse sort parameters
  const sortBy = query.sortBy || DEFAULT_SORT_BY;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  };
};

/**
 * Validate pagination parameters
 * Returns validation errors if parameters are invalid
 */
export const validatePaginationParams = (
  page: number,
  limit: number | 'all'
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (page < 1) {
    errors.push('Page number must be greater than 0');
  }

  if (typeof limit === 'number') {
    if (limit < 1) {
      errors.push('Limit must be greater than 0');
    }
    if (limit > MAX_LIMIT) {
      errors.push(`Limit cannot exceed ${MAX_LIMIT}. Use "all" to fetch all items.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate pagination metadata
 * Ensures consistent pagination calculations across all endpoints
 */
export const calculatePaginationMeta = (
  page: number,
  limit: number,
  totalItems: number
): {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
} => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
  };
};
