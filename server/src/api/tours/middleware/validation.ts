import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseHelpers';

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
      return sendError(res, `Invalid ${paramName}`, 400);
    }

    next();
  };
};

/**
 * Validate required fields for tour creation
 */
export const validateTourCreation = (req: Request, res: Response, next: NextFunction) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return sendError(res, 'Title and description are required', 400);
  }

  if (title.length < 3) {
    return sendError(res, 'Title must be at least 3 characters long', 400);
  }

  if (description.length < 10) {
    return sendError(res, 'Description must be at least 10 characters long', 400);
  }

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string);
  const limit = parseInt(req.query.limit as string);

  if (req.query.page && (isNaN(page) || page < 1)) {
    return sendError(res, 'Page must be a positive integer', 400);
  }

  if (req.query.limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    return sendError(res, 'Limit must be between 1 and 100', 400);
  }

  next();
};

/**
 * Validate search parameters
 */
export const validateSearchParams = (req: Request, res: Response, next: NextFunction) => {
  const { minPrice, maxPrice, rating } = req.query;

  if (minPrice && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
    return sendError(res, 'Minimum price must be a non-negative number', 400);
  }

  if (maxPrice && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) {
    return sendError(res, 'Maximum price must be a non-negative number', 400);
  }

  if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
    return sendError(res, 'Minimum price cannot be greater than maximum price', 400);
  }

  if (rating && (isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
    return sendError(res, 'Rating must be between 0 and 5', 400);
  }

  next();
};
