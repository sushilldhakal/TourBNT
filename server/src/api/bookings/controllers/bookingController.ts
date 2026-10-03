import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/bookingService';
import { ItineraryRequestService } from '../../tours/services/itineraryRequestService';
import { getBookingInvoice as getInvoice } from '../services/invoiceService';
import { assertCanViewBooking, canViewBooking } from '../services/bookingAccess';
import { optionalViewer } from '../../../middlewares/optionalViewer';
import { HTTP_STATUS, sendSuccess, sendPaginatedResponse } from '../../../utils/apiResponse';
import createHttpError from 'http-errors';

/**
 * Create a new booking
 */
export const createBooking = async (req: Request
, res: Response, next: NextFunction) => {
    try {
        const { tourId, tourTitle, tourCode, departureDate, participants, contactInfo, specialRequests, paymentType, pricingOptionId, promoCode } = req.body;

        // Validate required fields. Pricing is computed server-side from the
        // tour's own stored configuration — the client never supplies it.
        if (!tourId || !departureDate || !participants || !contactInfo) {
            throw createHttpError(400, 'Missing required booking information');
        }
        if (!contactInfo.fullName || !contactInfo.email || !contactInfo.phone) {
            throw createHttpError(400, 'Contact name, email and phone are required');
        }

        // Determine if this is a guest booking
        const isGuestBooking = !req.user;

        const bookingData: any = {
            tour: tourId,
            tourTitle,
            tourCode,
            departureDate,
            participants,
            paymentType,
            pricingOptionId,
            promoCode,
            contactName: contactInfo.fullName,
            contactEmail: contactInfo.email,
            contactPhone: contactInfo.phone,
            specialRequests,
            isGuestBooking,
        };

        // Add user reference if authenticated
        if (req.user) {
            bookingData.user = req.user.id;
        } else {
            // Add guest information
            bookingData.guestInfo = {
                fullName: contactInfo.fullName,
                email: contactInfo.email,
                phone: contactInfo.phone,
                country: contactInfo.country,
            };
        }

        const booking = await BookingService.createBooking(bookingData);

        sendSuccess(res, booking, 'Booking created successfully', HTTP_STATUS.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Price a booking without creating it — the checkout form's "your total" (with an optional promo code).
 * Returns the same numbers createBooking will charge. Public, like booking itself.
 */
export const quoteBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tourId, participants, paymentType, pricingOptionId, promoCode } = req.body ?? {};
        if (!tourId || !participants) throw createHttpError(400, 'tourId and participants are required');
        const pricing = await BookingService.quoteBooking({ tour: tourId, participants, paymentType, pricingOptionId, promoCode });
        sendSuccess(res, pricing, 'Booking quoted');
    } catch (error) {
        next(error);
    }
};

/**
 * Get all bookings (admin/seller only)
 */
export const getAllBookings = async (req: Request
, res: Response, next: NextFunction) => {
    try {
        // Get pagination params from middleware
        const { page, limit } = req.pagination || { page: 1, limit: 10 };
        const pageLimit = typeof limit === 'number' ? limit : 10;

        // Get filters from middleware
        const filters: any = req.filters || {};

        // Get sort params from middleware
        const sortBy = req.sort?.field || 'createdAt';
        const sortOrder = req.sort?.order || 'desc';

        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        if (q) filters.q = q;

        const result = await BookingService.getAllBookings(filters, {
            page,
            limit: pageLimit,
            sortBy,
            sortOrder
        }, req.user ? { id: req.user.id, isAdmin: req.user.roles.includes('admin') } : undefined);

        sendPaginatedResponse(res, result.items, {
            page: result.page,
            limit: result.limit,
            totalItems: result.totalItems,
            totalPages: result.totalPages
        }, 'Bookings retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookingId } = req.params;
        const booking = await BookingService.getBookingById(bookingId);
        await assertCanViewBooking(booking, req.user ? { id: req.user.id, isAdmin: req.user.roles.includes('admin') } : null);

        sendSuccess(res, booking, 'Booking retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get a booking's day-by-day itinerary with each supplier's live
 * confirmation status — the customer's own "My Trip" timeline.
 */
export const getBookingTimeline = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookingId } = req.params;
        if (!req.user) {
            throw createHttpError(401, 'Authentication required');
        }

        const timeline = await ItineraryRequestService.getBookingTimeline(bookingId, {
            id: req.user.id,
            isAdmin: req.user.roles.includes('admin'),
        });

        sendSuccess(res, timeline, 'Booking timeline retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get booking by reference
 */
export const getBookingByReference = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { reference } = req.params;
        const booking = await BookingService.getBookingByReference(reference);
        // Public route: the reference alone is not enough. The traveller (or seller/admin) signed in may see it;
        // anyone else must also give the booking's contact email, like an airline's "manage booking".
        const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
        const emailMatches = !!email && email === String(booking.contactEmail ?? '').trim().toLowerCase();
        if (!emailMatches && !(await canViewBooking(booking, await optionalViewer(req)))) {
            // Same answer as an unknown reference, so references can't be probed.
            throw createHttpError(404, 'Booking not found');
        }

        sendSuccess(res, booking, 'Booking retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get user bookings
 */
export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requestedUserId = req.params.userId;

        // Make sure authenticate middleware ran
        if (!req.user) {
            throw createHttpError(401, 'User not authenticated');
        }

        const authenticatedUserId = req.user.id;
        const userRoles = req.user.roles;

        const { page = 1, limit = 10, status } = req.query;

        // Determine which user's bookings to fetch
        let userId: string;

        if (userRoles.includes('admin')) {
            // Admin can view any user's bookings
            userId = requestedUserId || authenticatedUserId;
        } else {
            // Non-admin users can only view their own bookings
            if (requestedUserId && requestedUserId !== authenticatedUserId) {
                throw createHttpError(403, 'Not authorized to view these bookings');
            }
            userId = authenticatedUserId;
        }

        const result = await BookingService.getUserBookings(
            userId,
            {
                page: Number(page),
                limit: Number(limit),
                sortBy: 'createdAt',
                sortOrder: 'desc',
            },
            status as string
        );

        sendPaginatedResponse(
            res,
            result.items,
            {
                page: result.page,
            limit: result.limit,
            totalItems: result.totalItems,
            totalPages: result.totalPages
            },
            'User bookings retrieved successfully'
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Get tour bookings
 */
export const getTourBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tourId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const result = await BookingService.getTourBookings(
            tourId,
            {
                page: Number(page),
                limit: Number(limit),
                sortBy: 'createdAt',
                sortOrder: 'desc'
            },
            req.user ? { id: req.user.id, isAdmin: req.user.roles.includes('admin') } : undefined
        );

        sendPaginatedResponse(res, result.items, {
            page: result.page,
            limit: result.limit,
            totalItems: result.totalItems,
            totalPages: result.totalPages
        }, 'Tour bookings retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookingId } = req.params;
        const { status, notes } = req.body;

        if (!status) {
            throw createHttpError(400, 'Status is required');
        }

        const booking = await BookingService.updateBookingStatus(
            bookingId,
            status,
            notes,
            req.user ? { id: req.user.id, isAdmin: req.user.roles.includes('admin') } : undefined
        );

        sendSuccess(res, booking, 'Booking status updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookingId } = req.params;
        const { paymentStatus, paidAmount, transactionId } = req.body;

        if (!paymentStatus) {
            throw createHttpError(400, 'Payment status is required');
        }

        const booking = await BookingService.updatePaymentStatus(
            bookingId,
            paymentStatus,
            paidAmount,
            transactionId,
            req.user ? { id: req.user.id, isAdmin: req.user.roles.includes('admin') } : undefined
        );

        sendSuccess(res, booking, 'Payment status updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body;

        // Only the traveller who booked, the tour's seller, or an admin may cancel it.
        const existing = await BookingService.getBookingById(bookingId);
        await assertCanViewBooking(existing, req.user ? { id: req.user.id, isAdmin: req.user.roles.includes('admin') } : null);

        const booking = await BookingService.cancelBooking(bookingId, reason);

        sendSuccess(res, booking, 'Booking cancelled successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get booking statistics
 */
export const getBookingStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await BookingService.getBookingStats(req.user ? { id: req.user.id, isAdmin: req.user.roles.includes('admin') } : undefined);

        sendSuccess(res, stats, 'Booking statistics retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * The traveller's invoice for a booking (the traveller, the tour's seller, or an admin).
 */
export const getBookingInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw createHttpError(401, 'Authentication required');
        const invoice = await getInvoice(req.params.bookingId, { id: req.user.id, isAdmin: req.user.roles.includes('admin') });
        sendSuccess(res, invoice, 'Invoice retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Download booking voucher
 */
export const downloadVoucher = async (req: Request
, res: Response, next: NextFunction) => {
    try {
        const { bookingId } = req.params;

        // Get booking to verify ownership
        const booking = await BookingService.getBookingById(bookingId);

        await assertCanViewBooking(booking, req.user ? { id: req.user.id, isAdmin: req.user.roles.includes('admin') } : null);

        // Generate voucher data
        const voucherData = await BookingService.generateVoucher(bookingId);

        sendSuccess(res, voucherData, 'Voucher data retrieved successfully');
    } catch (error) {
        next(error);
    }
};
