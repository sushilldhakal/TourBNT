import { Request, Response } from 'express';
import { TourService } from '../services/tourService';
import { extractTourFields } from '../utils/dataProcessors';
import { sendSuccess, sendError, sendPaginatedResponse, asyncAuthHandler, RESPONSE_MESSAGES } from '../utils/responseHelpers';
import { generateUniqueCode } from '../utils/codeGenerator';
import { HTTP_STATUS } from '../../../utils/httpStatusCodes';

/**
 * Refactored Tour Controller
 * Clean, DRY implementation using service layer and utilities
 */

/**
 * Get all tours with filtering and pagination
 * Uses pagination and filter/sort middleware
 */
export const getAllTours = asyncAuthHandler(async (req: Request, res: Response) => {
  // Use pagination params from middleware
  const paginationParams = req.pagination || { page: 1, limit: 10 };

  // Use filters from middleware (AND logic - all filters must match)
  const filters: any = {};
  if (req.filters) {
    if (req.filters.destination) filters.destination = req.filters.destination;
    if (req.filters.category) filters['category.categoryName'] = { $regex: req.filters.category, $options: 'i' };
    if (req.filters.status) filters.status = req.filters.status;
  }

  // Use sort params from middleware
  const sortOptions: any = {};
  if (req.sort) {
    sortOptions[req.sort.field] = req.sort.order === 'desc' ? -1 : 1;
  } else {
    sortOptions.createdAt = -1; // Default sort
  }

  const result = await TourService.getAllTours(filters, paginationParams, sortOptions);
  return sendPaginatedResponse(res, result.items, {
    currentPage: result.page,
    totalPages: result.totalPages,
    totalItems: result.totalItems,
    itemsPerPage: result.limit
  }, 'Tours retrieved successfully');
});

/**
 * Get a single tour by ID
 */
export const getTour = asyncAuthHandler(async (req: Request, res: Response) => {
  const { tourId } = req.params;
  const tour = await TourService.getTourById(tourId);

  // Process facts for proper display
  if (tour.facts) {
    tour.facts = tour.facts.map((fact: any) => {
      let factValue = fact.value;

      // Handle nested arrays and objects for display
      if (Array.isArray(factValue) && factValue.length > 0) {
        if (typeof factValue[0] === 'object' && factValue[0].value) {
          factValue = factValue.map((item: any) => item.value);
        }
      }

      return { ...fact, value: factValue };
    });
  }

  const breadcrumbs = [{
    label: tour.title,
    url: `/tours/${tour._id}`
  }];

  sendSuccess(res, { tour, breadcrumbs }, RESPONSE_MESSAGES.TOUR_RETRIEVED);
});

/**
 * Create a new tour
 */
export const createTour = asyncAuthHandler(async (req: Request, res: Response) => {
  const authReq = req as Request
;
  const userId = authReq.user?.id;

  if (!userId) {
    return sendError(res, RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  // Extract and process tour data
  const tourData = extractTourFields(req);

  // Generate unique code if not provided
  if (!tourData.code) {
    tourData.code = await generateUniqueCode();
  }

  // Set author
  tourData.author = userId;

  const newTour = await TourService.createTour(tourData, userId);
  sendSuccess(res, newTour, RESPONSE_MESSAGES.TOUR_CREATED, HTTP_STATUS.CREATED);
});

/**
 * Update an existing tour
 */
export const updateTour = asyncAuthHandler(async (req: Request, res: Response) => {
  const authReq = req as Request
;
  const userId = authReq.user?.id;
  const isAdmin = authReq.user?.roles.includes('admin') || false;
  const { tourId } = req.params;

  if (!userId) {
    return sendError(res, RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  // Extract and process update data
  const updateData = extractTourFields(req);
  // Remove undefined fields to avoid overwriting existing data
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  // Only admins can update any tour, others can only update their own
  const authorId = isAdmin ? undefined : userId;

  const updatedTour = await TourService.updateTour(tourId, updateData, authorId);

  sendSuccess(res, updatedTour, RESPONSE_MESSAGES.TOUR_UPDATED, HTTP_STATUS.OK);
});

/**
 * Delete a tour
 */
export const deleteTour = asyncAuthHandler(async (req: Request, res: Response) => {
  const authReq = req as Request
;
  const userId = authReq.user?.id;
  const isAdmin = authReq.user?.roles.includes('admin') || false;
  const { tourId } = req.params;

  if (!userId) {
    return sendError(res, RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  // Only admins can delete any tour, others can only delete their own
  const authorId = isAdmin ? undefined : userId;

  await TourService.deleteTour(tourId, authorId);
  // Return 204 No Content for successful deletion
  res.status(HTTP_STATUS.NO_CONTENT).send();
});

/**
 * Search tours
 */
export const searchTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const { keyword, destination, minPrice, maxPrice, rating, category } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const searchParams = {
    keyword: keyword as string,
    destination: destination as string,
    minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    rating: rating ? parseFloat(rating as string) : undefined,
    category: category as string
  };

  const result = await TourService.searchTours(searchParams, { page, limit });
  return sendPaginatedResponse(res, result.items, {
    currentPage: result.page,
    totalPages: result.totalPages,
    totalItems: result.totalItems,
    itemsPerPage: result.limit
  }, 'Tours retrieved successfully');
});

/**
 * Get latest tours
 */
export const getLatestTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const tours = await TourService.getToursBy('latest', limit);

  // Transform _id to id for frontend compatibility
  const transformedTours = tours.map((tour: any) => ({
    ...tour,
    id: tour._id.toString()
  }));

  sendSuccess(res, { tours: transformedTours }, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get tours by rating
 */
export const getToursByRating = asyncAuthHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const tours = await TourService.getToursBy('rating', limit);
  sendSuccess(res, { tours }, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get discounted tours
 */
export const getDiscountedTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const tours = await TourService.getToursBy('discounted', limit);
  sendSuccess(res, { tours }, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get special offer tours
 */
export const getSpecialOfferTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const tours = await TourService.getToursBy('special-offers', limit);
  sendSuccess(res, { tours }, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get user's tours
 */
export const getUserTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const authReq = req as Request
;
  const { userId } = req.params; // Use userId from route parameter
  const isAdmin = authReq.user?.roles.includes('admin') || false;
  // Security check: users can only access their own tours unless they're admin
  if (!isAdmin && authReq.user?.id !== userId) {
    return sendError(res, 'Access denied: Cannot access other user\'s tours', HTTP_STATUS.FORBIDDEN);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await TourService.getUserTours(userId, isAdmin, { page, limit });
  return sendPaginatedResponse(res, result.items, {
    currentPage: result.page,
    totalPages: result.totalPages,
    totalItems: result.totalItems,
    itemsPerPage: result.limit
  }, 'Tours retrieved successfully');
});

/**
 * Get user's tour titles
 */
export const getUserToursTitle = asyncAuthHandler(async (req: Request, res: Response) => {
  const authReq = req as Request
;
  const { userId } = req.params; // Use userId from route parameter

  // Security check: users can only access their own tours unless they're admin
  const isAdmin = authReq.user?.roles.includes('admin') || false;
  if (!isAdmin && authReq.user?.id !== userId) {
    return sendError(res, 'Access denied: Cannot access other user\'s tours', HTTP_STATUS.FORBIDDEN);
  }

  const tours = await TourService.getUserTourTitles(userId);
  sendSuccess(res, tours, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get current user's tours (httpOnly cookie auth)
 */
export const getMyTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const authReq = req as Request
;
  const userId = authReq.user!.id; // Get from authenticated cookie, not params

  // Get pagination params
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await TourService.getUserTours(userId, false, { page, limit });

  return sendPaginatedResponse(res, result.items, {
    currentPage: result.page,
    totalPages: result.totalPages,
    totalItems: result.totalItems,
    itemsPerPage: result.limit
  });
});

/**
 * Increment tour views
 */
export const incrementTourViews = asyncAuthHandler(async (req: Request, res: Response) => {
  const { tourId } = req.params;
  const views = await TourService.incrementTourViews(tourId);

  sendSuccess(res, { views }, RESPONSE_MESSAGES.VIEW_INCREMENTED);
});

/**
 * Increment tour bookings
 */
export const incrementTourBookings = asyncAuthHandler(async (req: Request, res: Response) => {
  const { tourId } = req.params;
  const bookingCount = await TourService.incrementTourBookings(tourId);

  sendSuccess(res, { bookingCount }, RESPONSE_MESSAGES.BOOKING_INCREMENTED);
});

/**
 * Check tour availability for a specific date
 */
export const checkTourAvailability = asyncAuthHandler(async (req: Request, res: Response) => {
  const { tourId } = req.params;
  const { date } = req.query;

  if (!date) {
    return sendError(res, 'Date parameter is required', HTTP_STATUS.BAD_REQUEST);
  }

  const departureDate = new Date(date as string);
  if (isNaN(departureDate.getTime())) {
    return sendError(res, 'Invalid date format', HTTP_STATUS.BAD_REQUEST);
  }

  // Import BookingService dynamically to avoid circular dependencies
  const { BookingService } = await import('../../bookings/services/bookingService');

  const availability = await BookingService.checkAvailability(tourId, departureDate);

  return sendSuccess(res, availability, 'Tour availability checked successfully');
});
