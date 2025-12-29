import { Request, Response } from 'express';
import { Model, Document, Model as MongooseModel } from 'mongoose';
import { sendPaginatedResponse, sendError, HTTP_STATUS } from './apiResponse';

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
 * Hybrid pagination options
 */
export interface HybridPaginationOptions {
  // Field filtering function (optional) - to return only specific fields
  fieldFilter?: (doc: any) => any;
  // Populate options for Mongoose
  populate?: any[] | string | { path: string; select?: string }[];
  // Sort options (default: { createdAt: -1 })
  sort?: any;
  // Memory threshold for streaming (default: 100)
  memoryThreshold?: number;
  // Success message
  message?: string;
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
    limit: limit as any, // Type assertion for compatibility
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

/**
 * Hybrid Memory-Friendly Pagination Utility
 * 
 * Handles pagination with "all" option efficiently:
 * - Small datasets (<= threshold): Load all in memory (fast)
 * - Large datasets (> threshold): Stream using cursor (memory-efficient)
 * - Normal pagination: Standard skip/limit approach
 * 
 * @param model - Mongoose model to query
 * @param query - MongoDB query object
 * @param req - Express request object
 * @param res - Express response object
 * @param options - Configuration options
 * @returns Promise that resolves when response is sent
 */
export const hybridPagination = async (
  model: MongooseModel<any>,
  query: any,
  req: any,
  res: Response,
  options: HybridPaginationOptions = {}
): Promise<void> => {
  const {
    fieldFilter,
    populate,
    sort = { createdAt: -1 },
    memoryThreshold = 100,
    message = 'Items retrieved successfully'
  } = options;

  // Get pagination params from middleware or query
  // Prefer req.pagination from middleware, fallback to query params
  const page = req.pagination?.page || parseInt(req.query.page as string) || 1;
  const limitParam = req.pagination?.limit || req.query.limit as string;
  const limit = limitParam === 'all' || (typeof limitParam === 'number' && limitParam > 100)
    ? 'all'
    : typeof limitParam === 'number' 
      ? limitParam 
      : parseInt(limitParam as string) || 10;

  // Handle "All" option with hybrid approach
  if (limit === 'all') {
    try {
      // Check total documents first
      const totalDocs = await model.countDocuments(query);

      if (totalDocs <= memoryThreshold) {
        // Small dataset: Load all in memory (fast)
        let queryBuilder = model.find(query).sort(sort).lean();

        // Apply populate if provided
        if (populate) {
          if (Array.isArray(populate)) {
            queryBuilder = queryBuilder.populate(populate as any);
          } else {
            queryBuilder = queryBuilder.populate(populate as string);
          }
        }

        const allItems = await queryBuilder;

        // Apply field filter if provided
        const filteredItems = fieldFilter
          ? allItems.map(fieldFilter)
          : allItems;

        return sendPaginatedResponse(res, filteredItems, {
          page: 1,
          limit: totalDocs,
          totalItems: totalDocs,
          totalPages: 1
        }, message);
      } else {
        // Large dataset: Stream to client (memory-efficient)
        res.setHeader('Content-Type', 'application/json');
        
        // Start JSON response with standard format
        res.write(`{"success":true,"items":[`);

        let queryBuilder = model.find(query).sort(sort).lean();

        // Apply populate if provided
        if (populate) {
          if (Array.isArray(populate)) {
            queryBuilder = queryBuilder.populate(populate as any);
          } else {
            queryBuilder = queryBuilder.populate(populate as string);
          }
        }

        const cursor = queryBuilder.cursor();

        let first = true;
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
          if (!first) res.write(',');
          const item = fieldFilter ? fieldFilter(doc) : doc;
          res.write(JSON.stringify(item));
          first = false;
        }

        // End JSON response with pagination info (standard format)
        res.write(`],"pagination":{"page":1,"limit":${totalDocs},"totalItems":${totalDocs},"totalPages":1},"message":"${message}"}`);
        res.end();
        return;
      }
    } catch (error: any) {
      sendError(res, `Failed to fetch items: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return;
    }
  }

  // Normal pagination for numeric limit
  const pageNum = parseInt(page.toString());
  const limitNum = parseInt(limit.toString());
  const skip = (pageNum - 1) * limitNum;

  try {
    let queryBuilder = model.find(query).sort(sort).skip(skip).limit(limitNum).lean();

    // Apply populate if provided
    if (populate) {
      if (Array.isArray(populate)) {
        queryBuilder = queryBuilder.populate(populate as any);
      } else {
        queryBuilder = queryBuilder.populate(populate as string);
      }
    }

    const [items, total] = await Promise.all([
      queryBuilder,
      model.countDocuments(query)
    ]);

    // Apply field filter if provided
    const filteredItems = fieldFilter
      ? items.map(fieldFilter)
      : items;

    const totalPages = Math.ceil(total / limitNum);

    sendPaginatedResponse(res, filteredItems, {
      page: pageNum,
      limit: limitNum,
      totalItems: total,
      totalPages: totalPages
    }, message);
    return;
  } catch (error: any) {
    sendError(res, `Failed to fetch items: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    return;
  }
};

/**
 * Database pagination utility
 * Used by services for consistent pagination
 * Handles 'all' limit by fetching all items without pagination
 */
export const paginate = async <T>(
  model: any,
  query: any,
  params: {
    page?: number;
    limit?: number | 'all';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  } = {}
): Promise<{
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  items: T[];
}> => {
  const { 
    page = DEFAULT_PAGE, 
    limit = DEFAULT_LIMIT, 
    sortBy = DEFAULT_SORT_BY, 
    sortOrder = DEFAULT_SORT_ORDER, 
    search 
  } = params;
  
  const pageNumber = parseInt(page.toString(), 10);
  
  const sort: { [key: string]: 1 | -1 } = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Handle 'all' limit - fetch all items without pagination
  if (limit === 'all') {
    const items = await model.find(query).sort(sort);
    const totalItems = items.length;
    
    return {
      page: 1,
      limit: totalItems,
      totalPages: 1,
      totalItems,
      items
    };
  }

  // Normal pagination with numeric limit
  const pageSize = Math.min(parseInt(limit.toString(), 10), MAX_LIMIT);

  const items = await model
    .find(query)
    .sort(sort)
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  const totalItems = await model.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    page: pageNumber,
    limit: pageSize,
    totalPages,
    totalItems,
    items
  };
};

/**
 * Hybrid pagination utility with the middleware
 * Automatically handles normal pagination, hybrid "all", and memory-friendly streaming
 * Controllers can simply call this function and it will automatically route based on req.pagination.useHybrid
 */
export interface HybridOptions {
  fieldFilter?: (doc: any) => any;
  populate?: any[] | string | { path: string; select?: string }[];
  sort?: Record<string, 1 | -1>;
  memoryThreshold?: number;
  message?: string;
}

/**
 * Fetch paginated data (normal or hybrid)
 * Automatically uses req.pagination.useHybrid flag
 */
export const fetchPaginated = async (
  model: MongooseModel<any>,
  query: any,
  req: Request,
  res: Response,
  options: HybridOptions = {}
) => {
  try {
    const {
      fieldFilter,
      populate,
      sort,
      memoryThreshold = 100,
      message = 'Items retrieved successfully',
    } = options;

    if (!req.pagination) throw new Error('Pagination middleware not applied');

    const { page, limit, skip, useHybrid } = req.pagination;
    
    // Get sort from req.sort (from middleware) or use provided sort or default
    const sortOptions = sort || (req.sort 
      ? { [req.sort.field]: req.sort.order === 'desc' ? -1 : 1 }
      : { createdAt: -1 });

    // Use hybrid for 'all' or limit > MAX_LIMIT
    if (useHybrid) {
      const totalDocs = await model.countDocuments(query);

      if (totalDocs <= memoryThreshold) {
        // Small dataset: load all in memory
        let queryBuilder = model.find(query).sort(sortOptions).lean();

        if (populate) {
          if (Array.isArray(populate)) {
            queryBuilder = queryBuilder.populate(populate as any);
          } else {
            queryBuilder = queryBuilder.populate(populate as string);
          }
        }

        const allItems = await queryBuilder;
        const filteredItems = fieldFilter ? allItems.map(fieldFilter) : allItems;

        return sendPaginatedResponse(res, filteredItems, {
          page: 1,
          limit: totalDocs,
          totalItems: totalDocs,
          totalPages: 1,
        }, message);
      } else {
        // Large dataset: stream response
        res.setHeader('Content-Type', 'application/json');
        res.write(`{"success":true,"items":[`);

        let queryBuilder = model.find(query).sort(sortOptions).lean();
        if (populate) {
          if (Array.isArray(populate)) {
            queryBuilder = queryBuilder.populate(populate as any);
          } else {
            queryBuilder = queryBuilder.populate(populate as string);
          }
        }

        const cursor = queryBuilder.cursor();
        let first = true;

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
          if (!first) res.write(',');
          const item = fieldFilter ? fieldFilter(doc) : doc;
          res.write(JSON.stringify(item));
          first = false;
        }

        res.write(`],"pagination":{"page":1,"limit":${totalDocs},"totalItems":${totalDocs},"totalPages":1},"message":"${message}"}`);
        res.end();
        return;
      }
    }

    // Normal pagination for numeric limit <= MAX_LIMIT
    const queryBuilder = model.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit as number)
      .lean();

    if (populate) {
      if (Array.isArray(populate)) {
        queryBuilder.populate(populate as any);
      } else {
        queryBuilder.populate(populate as string);
      }
    }

    const [items, totalItems] = await Promise.all([
      queryBuilder,
      model.countDocuments(query),
    ]);

    const filteredItems = fieldFilter ? items.map(fieldFilter) : items;
    const totalPages = Math.ceil(totalItems / (limit as number));

    return sendPaginatedResponse(res, filteredItems, {
      page,
      limit: limit as number,
      totalItems,
      totalPages,
    }, message);

  } catch (error: any) {
    return sendError(res, `Failed to fetch items: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

