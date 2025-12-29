import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS, sendValidationError } from '../../../utils/apiResponse';
import createHttpError from 'http-errors';

/**
 * Validation middleware for tour operations
 */

/**
 * Validate MongoDB ObjectId format
 */
export const validateObjectId = (paramName: string = 'tourId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    if (!id || !objectIdRegex.test(id)) {
      return next(createHttpError(HTTP_STATUS.BAD_REQUEST, `Invalid ${paramName} format`));
    }

    next();
  };
};

/**
 * Validate required fields for tour creation
 */
export const validateTourCreation = (req: Request, res: Response, next: NextFunction) => {
  const { title, description } = req.body;

  const errors: Array<{ field: string; message: string }> = [];
  
  if (!title || !description) {
    errors.push({ field: 'title', message: 'Title and description are required' });
  }

  if (title && title.length < 3) {
    errors.push({ field: 'title', message: 'Title must be at least 3 characters long' });
  }

  if (description && description.length < 10) {
    errors.push({ field: 'description', message: 'Description must be at least 10 characters long' });
  }

  if (errors.length > 0) {
    const error = createHttpError(HTTP_STATUS.BAD_REQUEST, 'Validation failed');
    (error as any).details = errors;
    return next(error);
  }

  next();
};

/**
 * Validate pagination parameters
 * For dashboard endpoints, allows higher limits (up to 100) or "all" for "All" option
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string);
  const limitParam = req.query.limit as string;
  
  // Higher limit for dashboard endpoints (like /tours/me) to support "All" option
  const MAX_LIMIT = 100;

  if (req.query.page && (isNaN(page) || page < 1)) {
    return sendValidationError(res, 'Page must be a positive integer', [{
      field: 'page',
      message: 'Page must be a positive integer'
    }]);
  }

  // Allow "all" as a valid limit value, or validate numeric limit
  if (req.query.limit) {
    if (limitParam === 'all') {
      // "all" is valid, continue
    } else {
      const limit = parseInt(limitParam);
      if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
        return sendValidationError(res, `Limit must be between 1 and ${MAX_LIMIT}, or "all"`, [{
          field: 'limit',
          message: `Limit must be between 1 and ${MAX_LIMIT}, or "all"`
        }]);
      }
    }
  }

  next();
};

/**
 * Validate search parameters
 */
export const validateSearchParams = (req: Request, res: Response, next: NextFunction) => {
  const { minPrice, maxPrice, rating } = req.query;

  const errors: Array<{ field: string; message: string }> = [];

  if (minPrice && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
    errors.push({ field: 'minPrice', message: 'Minimum price must be a non-negative number' });
  }

  if (maxPrice && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) {
    errors.push({ field: 'maxPrice', message: 'Maximum price must be a non-negative number' });
  }

  if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
    errors.push({ field: 'priceRange', message: 'Minimum price cannot be greater than maximum price' });
  }

  if (rating && (isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
    errors.push({ field: 'rating', message: 'Rating must be between 0 and 5' });
  }

  if (errors.length > 0) {
    const error = createHttpError(HTTP_STATUS.BAD_REQUEST, 'Validation failed');
    (error as any).details = errors;
    return next(error);
  }

  next();
};
