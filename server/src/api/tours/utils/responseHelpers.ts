import { Response } from 'express';

/**
 * Standardized response helpers for consistent API responses
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

/**
 * Send successful response with data
 */
export const sendSuccess = <T>(
  res: Response, 
  data: T, 
  message?: string, 
  statusCode: number = 200,
  pagination?: ApiResponse['pagination']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(pagination && { pagination })
  };
  
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response, 
  message: string, 
  statusCode: number = 500,
  error?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error })
  };
  
  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  },
  message?: string
): Response => {
  return sendSuccess(res, data, message, 200, pagination);
};

/**
 * Handle async route errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Common response messages
 */
export const RESPONSE_MESSAGES = {
  // Success messages
  TOUR_CREATED: 'Tour created successfully',
  TOUR_UPDATED: 'Tour updated successfully',
  TOUR_DELETED: 'Tour deleted successfully',
  TOUR_RETRIEVED: 'Tour retrieved successfully',
  TOURS_RETRIEVED: 'Tours retrieved successfully',
  VIEW_INCREMENTED: 'Tour view count incremented',
  BOOKING_INCREMENTED: 'Tour booking count incremented',
  
  // Error messages
  TOUR_NOT_FOUND: 'Tour not found',
  INVALID_TOUR_ID: 'Invalid tour ID',
  UNAUTHORIZED: 'Unauthorized to perform this action',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error',
  FAILED_TO_CREATE: 'Failed to create tour',
  FAILED_TO_UPDATE: 'Failed to update tour',
  FAILED_TO_DELETE: 'Failed to delete tour',
  FAILED_TO_RETRIEVE: 'Failed to retrieve tour(s)',
  FAILED_TO_SEARCH: 'Failed to search tours'
} as const;
