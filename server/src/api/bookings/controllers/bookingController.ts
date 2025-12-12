import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/bookingService';
import { AuthRequest } from '../../../middlewares/authenticate';
import { sendSuccess, sendPaginatedResponse } from '../../../utils/responseHandler';
import createHttpError from 'http-errors';

/**
 * Create a new booking
 */
export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { tourId, tourTitle, tourCode, departureDate, participants, pricing, contactInfo, specialRequests } = req.body;

        // Validate required fields
        if (!tourId || !departureDate || !participants || !pricing || !contactInfo) {
            throw createHttpError(400, 'Missing required booking information');
        }

        // Determine if this is a guest booking
        const isGuestBooking = !req.userId;

        const bookingData: any = {
            tour: tourId,
            tourTitle,
            tourCode,
            departureDate,
            participants,
            pricing,
            contactName: contactInfo.fullName,
            contactEmail: contactInfo.email,
            contactPhone: contactInfo.phone,
            specialRequests,
            isGuestBooking,
        };

        // Add user reference if authenticated
        if (req.userId) {
            bookingData.user = req.userId;
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

        sendSuccess(res, booking, 'Booking created successfully', 201);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all bookings (admin/seller only)
 */
export const getAllBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 10, status, paymentStatus, tourId } = req.query;

        const filters: any = {};
        if (status) filters.status = status;
        if (paymentStatus) filters.paymentStatus = paymentStatus;
        if (tourId) filters.tour = tourId;

        const result = await BookingService.getAllBookings(filters, {
            page: Number(page),
            limit: Number(limit),
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });

        sendPaginatedResponse(res, result.items, {
            currentPage: result.page,
            totalPages: result.totalPages,
            totalItems: result.totalItems,
            itemsPerPage: result.limit
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

        sendSuccess(res, booking, 'Booking retrieved successfully');
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

        sendSuccess(res, booking, 'Booking retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get user bookings
 */
export const getUserBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const requestedUserId = req.params.userId;  // User ID from URL params
        const authenticatedUserId = req.userId;  // Authenticated user ID
        const userRole = req.roles;  // User role
        const { page = 1, limit = 10, status } = req.query;

        if (!authenticatedUserId) {
            throw createHttpError(401, 'User not authenticated');
        }

        // Determine which user's bookings to fetch
        let userId: string;

        if (userRole === 'admin') {
            // Admin can view any user's bookings
            userId = requestedUserId || authenticatedUserId;
        } else {
            // Non-admin users can only view their own bookings
            if (requestedUserId && requestedUserId !== authenticatedUserId) {
                throw createHttpError(403, 'Not authorized to view these bookings');
            }
            userId = authenticatedUserId;
        }

        const result = await BookingService.getUserBookings(userId, {
            page: Number(page),
            limit: Number(limit),
            sortBy: 'createdAt',
            sortOrder: 'desc'
        }, status as string);

        sendPaginatedResponse(res, result.items, {
            currentPage: result.page,
            totalPages: result.totalPages,
            totalItems: result.totalItems,
            itemsPerPage: result.limit
        }, 'User bookings retrieved successfully');
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

        const result = await BookingService.getTourBookings(tourId, {
            page: Number(page),
            limit: Number(limit),
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });

        sendPaginatedResponse(res, result.items, {
            currentPage: result.page,
            totalPages: result.totalPages,
            totalItems: result.totalItems,
            itemsPerPage: result.limit
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

        const booking = await BookingService.updateBookingStatus(bookingId, status, notes);

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
            transactionId
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
        const stats = await BookingService.getBookingStats();

        sendSuccess(res, stats, 'Booking statistics retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Download booking voucher
 */
export const downloadVoucher = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { bookingId } = req.params;

        // Get booking to verify ownership
        const booking = await BookingService.getBookingById(bookingId);

        // Verify user has access to this booking
        if (req.userId && booking.user && booking.user.toString() !== req.userId) {
            throw createHttpError(403, 'You do not have access to this booking');
        }

        // Generate voucher data
        const voucherData = await BookingService.generateVoucher(bookingId);

        sendSuccess(res, voucherData, 'Voucher data retrieved successfully');
    } catch (error) {
        next(error);
    }
};
