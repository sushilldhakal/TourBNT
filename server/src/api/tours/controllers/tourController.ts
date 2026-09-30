import { Request, Response } from 'express';
import { TourService } from '../services/tourService';
import { extractTourFields } from '../utils/dataProcessors';
import { sendSuccess, sendError, sendPaginatedResponse, HTTP_STATUS } from '../../../utils/apiResponse';
import { asyncAuthHandler } from '../../../utils/routeWrapper';
import { RESPONSE_MESSAGES } from '../utils/constants';
import { generateUniqueCode } from '../utils/codeGenerator';

/**
 * Tour Controller
 * Thin HTTP layer over TourService (Drizzle/Postgres).
 */

/**
 * Get all tours with filtering and pagination
 * Automatically filters by user role:
 * - Admin: Returns all tours (published and unpublished)
 * - Seller: Returns only their own tours
 */
export const getAllTours = asyncAuthHandler(async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.pagination!;
    const { field: sortBy, order: sortOrder } = req.sort!;

    const filters: { destination?: string; category?: string; status?: string } = {};
    if (req.filters) {
      if (req.filters.destination) filters.destination = req.filters.destination;
      if (req.filters.category) filters.category = req.filters.category;
      if (req.filters.status) filters.status = req.filters.status;
    }

    // Public endpoint (no auth required): admins see every tour, everyone
    // else sees only published ones.
    const isAdmin = req.user?.roles?.includes('admin') || false;

    const result = await TourService.getAllTours(
      filters,
      { page, limit: limit as number, sortBy, sortOrder },
      { field: sortBy, order: sortOrder },
      isAdmin
    );

    return sendPaginatedResponse(res, result.items, {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    }, 'Tours retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to fetch tours', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * Get a single tour by ID
 */
export const getTour = asyncAuthHandler(async (req: Request, res: Response) => {
  const { tourId } = req.params;
  const tour = await TourService.getTourById(tourId);

  if (tour.facts) {
    tour.facts = tour.facts.map((fact: any) => {
      let factValue = fact.value;
      if (Array.isArray(factValue) && factValue.length > 0) {
        if (typeof factValue[0] === 'object' && factValue[0].value) {
          factValue = factValue.map((item: any) => item.value);
        }
      }
      return { ...fact, value: factValue };
    });
  }

  const breadcrumbs = [{ label: tour.title, url: `/tours/${tour.id}` }];
  sendSuccess(res, { tour, breadcrumbs }, RESPONSE_MESSAGES.TOUR_RETRIEVED);
});

/**
 * Create a new tour
 */
export const createTour = asyncAuthHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const tourData = extractTourFields(req);
  if (!tourData.code) {
    tourData.code = await generateUniqueCode();
  }
  tourData.author = userId;

  const newTour = await TourService.createTour(tourData, userId);
  sendSuccess(res, newTour, RESPONSE_MESSAGES.TOUR_CREATED, HTTP_STATUS.CREATED);
});

/**
 * Update an existing tour
 */
export const updateTour = asyncAuthHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.roles.includes('admin') || false;
  const { tourId } = req.params;

  if (!userId) {
    return sendError(res, RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const updateData = extractTourFields(req);
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const authorId = isAdmin ? undefined : userId;
  const updatedTour = await TourService.updateTour(tourId, updateData, authorId);

  sendSuccess(res, updatedTour, RESPONSE_MESSAGES.TOUR_UPDATED, HTTP_STATUS.OK);
});

/**
 * Delete a tour
 */
export const deleteTour = asyncAuthHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.roles.includes('admin') || false;
  const { tourId } = req.params;

  if (!userId) {
    return sendError(res, RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const authorId = isAdmin ? undefined : userId;
  await TourService.deleteTour(tourId, authorId);
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
    page: result.page,
    limit: result.limit,
    totalItems: result.totalItems,
    totalPages: result.totalPages
  }, 'Tours retrieved successfully');
});

/**
 * Get latest tours
 */
export const getLatestTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const tours = await TourService.getToursBy('latest', limit);
  sendSuccess(res, tours, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get tours by rating
 */
export const getToursByRating = asyncAuthHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const tours = await TourService.getToursBy('rating', limit);
  sendSuccess(res, tours, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get discounted tours
 */
export const getDiscountedTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const tours = await TourService.getToursBy('discounted', limit);
  sendSuccess(res, tours, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get special offer tours
 */
export const getSpecialOfferTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const tours = await TourService.getToursBy('special-offers', limit);
  sendSuccess(res, tours, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get user's tour titles
 */
export const getUserToursTitle = asyncAuthHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const isAdmin = req.user?.roles.includes('admin') || false;
  if (!isAdmin && req.user?.id !== userId) {
    return sendError(res, 'Access denied: Cannot access other user\'s tours', HTTP_STATUS.FORBIDDEN);
  }

  const tours = await TourService.getUserTourTitles(userId);
  sendSuccess(res, tours, RESPONSE_MESSAGES.TOURS_RETRIEVED);
});

/**
 * Get current user's tours (httpOnly cookie auth)
 * - Admin: Returns all tours (published and unpublished)
 * - Seller/User: Returns only their own tours
 */
export const getMyTours = asyncAuthHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const isAdmin = req.user?.roles?.includes('admin') || false;

  const page = parseInt(req.query.page as string) || 1;
  const limitParam = req.query.limit as string;
  const limit = limitParam === 'all' ? Number.MAX_SAFE_INTEGER : (parseInt(limitParam) || 10);

  const result = await TourService.getUserTours(userId, isAdmin, { page, limit });

  const items = result.items.map((tour: any) => ({
    id: tour.id,
    title: tour.title,
    coverImage: tour.coverImage,
    author: tour.author,
    price: tour.price,
    tourStatus: tour.tourStatus,
    code: tour.code,
    createdAt: tour.createdAt,
    updatedAt: tour.updatedAt,
  }));

  return sendPaginatedResponse(res, items, {
    page: result.page,
    limit: result.limit,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  }, 'Tours retrieved successfully');
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

  const { BookingService } = await import('../../bookings/services/bookingService');
  const availability = await BookingService.checkAvailability(tourId, departureDate);

  return sendSuccess(res, availability, 'Tour availability checked successfully');
});

/**
 * Read-only per-day partner confirmation status for the tour editor —
 * lets a seller see at a glance which linked hotel/restaurant/guide/
 * transport providers have confirmed availability, and for which dates.
 */
export const getTourLogisticsStatus = asyncAuthHandler(async (req: Request, res: Response) => {
  const { tourId } = req.params;
  const { ItineraryRequestService } = await import('../services/itineraryRequestService');
  const isAdmin = req.user?.roles?.includes('admin') ?? false;
  const requests = await ItineraryRequestService.getRequestsForTour(tourId, { id: req.user!.id, isAdmin });
  return sendSuccess(res, requests, 'Logistics status retrieved successfully');
});

/** Agency sends a request on demand for a day/role link that has no request yet. */
export const sendItineraryPartnerRequest = asyncAuthHandler(async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const { serviceDate, serviceTime } = req.body as { serviceDate?: string; serviceTime?: string };
  if (!serviceDate) return sendError(res, 'serviceDate is required', HTTP_STATUS.BAD_REQUEST);

  const { ItineraryRequestService } = await import('../services/itineraryRequestService');
  const isAdmin = req.user?.roles?.includes('admin') ?? false;
  const created = await ItineraryRequestService.createManualRequest(linkId, { id: req.user!.id, isAdmin }, serviceDate, serviceTime);
  return sendSuccess(res, created, 'Request sent successfully', HTTP_STATUS.CREATED);
});

/** Agency accepts or declines a partner's counter-offer. */
export const respondToItineraryCounterOffer = asyncAuthHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { accept } = req.body as { accept?: boolean };
  if (typeof accept !== 'boolean') return sendError(res, 'accept (boolean) is required', HTTP_STATUS.BAD_REQUEST);

  const { ItineraryRequestService } = await import('../services/itineraryRequestService');
  const isAdmin = req.user?.roles?.includes('admin') ?? false;
  const updated = await ItineraryRequestService.respondToCounter(requestId, { id: req.user!.id, isAdmin }, accept);
  return sendSuccess(res, updated, 'Counter-offer response recorded successfully');
});

/** Agency resurrects a declined/expired request back to pending. */
export const reopenItineraryPartnerRequest = asyncAuthHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { ItineraryRequestService } = await import('../services/itineraryRequestService');
  const isAdmin = req.user?.roles?.includes('admin') ?? false;
  const updated = await ItineraryRequestService.reopenRequest(requestId, { id: req.user!.id, isAdmin });
  return sendSuccess(res, updated, 'Request reopened successfully');
});

/** Agency swaps the business partner linked to a day/role in place. */
export const replaceItineraryPartner = asyncAuthHandler(async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const { businessPartnerId, name } = req.body as { businessPartnerId?: string; name?: string };
  if (!businessPartnerId || !name) return sendError(res, 'businessPartnerId and name are required', HTTP_STATUS.BAD_REQUEST);

  const { ItineraryRequestService } = await import('../services/itineraryRequestService');
  const isAdmin = req.user?.roles?.includes('admin') ?? false;
  const result = await ItineraryRequestService.replaceSupplier(linkId, { id: req.user!.id, isAdmin }, businessPartnerId, name);
  return sendSuccess(res, result, 'Supplier replaced successfully');
});
