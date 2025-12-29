import mongoose from 'mongoose';
import BookingModel from '../bookingModel';
import { Booking } from '../bookingTypes';
import { PaginationParams, paginate } from '../../../utils/pagination';
import { normalizeDoc } from '../../../utils/normalizeDoc';
import createHttpError from 'http-errors';
import { BaseService } from '../../../services/BaseService';
import Tour from '../../tours/tourModel';

/**
 * Booking Service Layer
 * Contains all business logic for booking operations
 */
export class BookingService extends BaseService<Booking> {
    private static instance: BookingService;

    constructor() {
        super(BookingModel);
    }

    /**
     * Get singleton instance
     */
    static getInstance(): BookingService {
        if (!BookingService.instance) {
            BookingService.instance = new BookingService();
        }
        return BookingService.instance;
    }

    /**
     * Check tour availability for a specific date
     */
    async checkAvailability(tourId: string, departureDate: Date): Promise<{ available: boolean; remainingCapacity: number }> {
        try {
            // Get tour details
            const tour = await Tour.findById(tourId);
            if (!tour) {
                throw createHttpError(404, 'Tour not found');
            }

            // Get existing bookings for this tour and date
            const existingBookings = await BookingModel.find({
                tour: tourId,
                departureDate: {
                    $gte: new Date(departureDate.setHours(0, 0, 0, 0)),
                    $lt: new Date(departureDate.setHours(23, 59, 59, 999))
                },
                status: { $in: ['pending', 'confirmed'] }
            });

            // Calculate total booked participants
            const totalBooked = existingBookings.reduce((sum, booking) => {
                return sum + (booking.participants?.adults || 0) + (booking.participants?.children || 0);
            }, 0);

            // Check against tour capacity
            const maxCapacity = tour.maxSize || 10;
            const remainingCapacity = maxCapacity - totalBooked;

            return {
                available: remainingCapacity > 0,
                remainingCapacity: Math.max(0, remainingCapacity)
            };
        } catch (error: any) {
            console.error('Error checking availability:', error);
            throw error;
        }
    }

    /**
     * Create a new booking with availability check
     */
    async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
        try {
            // Validate required fields
            if (!bookingData.tour || !bookingData.departureDate) {
                throw createHttpError(400, 'Tour and departure date are required');
            }

            // Check availability
            const totalParticipants = (bookingData.participants?.adults || 0) + (bookingData.participants?.children || 0);
            const availability = await this.checkAvailability(
                bookingData.tour.toString(),
                new Date(bookingData.departureDate)
            );

            if (!availability.available || availability.remainingCapacity < totalParticipants) {
                throw createHttpError(400, `Insufficient capacity. Only ${availability.remainingCapacity} spots remaining.`);
            }

            // Generate booking reference if not provided
            if (!bookingData.bookingReference) {
                const timestamp = Date.now().toString(36).toUpperCase();
                const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                bookingData.bookingReference = `BK-${timestamp}-${random}`;
            }

            // Create booking
            const booking = await this.create(bookingData);

            return booking;
        } catch (error: any) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    /**
     * Get all bookings with filtering and pagination
     */
    async getAllBookings(filters: any = {}, paginationParams: PaginationParams) {
        const result = await paginate(BookingModel, filters, paginationParams);

        // Populate tour and user information
        if (result.items && result.items.length > 0) {
            const populatedItems = await BookingModel.populate(result.items, [
                { path: 'tour', select: 'title code coverImage price' },
                { path: 'user', select: 'name email' }
            ]);
            result.items = populatedItems;
        }

        // Normalize the result
        return normalizeDoc(result);
    }

    /**
     * Get booking by ID
     */
    async getBookingById(bookingId: string) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw createHttpError(400, 'Invalid booking ID');
        }

        const booking = await BookingModel
            .findById(bookingId)
            .populate('tour', 'title code coverImage price location')
            .populate('user', 'name email phone')
            .lean();

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        // Normalize the result
        return normalizeDoc(booking);
    }

    /**
     * Get booking by reference
     */
    async getBookingByReference(reference: string) {
        const booking = await BookingModel
            .findOne({ bookingReference: reference })
            .populate('tour', 'title code coverImage price location')
            .populate('user', 'name email phone')
            .lean();

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        // Normalize the result
        return normalizeDoc(booking);
    }

    /**
     * Get user bookings with status filtering
     */
    async getUserBookings(userId: string, paginationParams: PaginationParams, status?: string) {
        const query: any = { user: userId };

        // Apply status filter if provided
        if (status) {
            query.status = status;
        }

        const result = await paginate(BookingModel, query, paginationParams);

        // Populate tour information
        if (result.items && result.items.length > 0) {
            const populatedItems = await BookingModel.populate(result.items, {
                path: 'tour',
                select: 'title code coverImage price location'
            });
            result.items = populatedItems;
        }

        // Normalize the result
        return normalizeDoc(result);
    }

    /**
     * Get tour bookings
     */
    async getTourBookings(tourId: string, paginationParams: PaginationParams) {
        const query = { tour: tourId };
        const result = await paginate(BookingModel, query, paginationParams);

        // Populate user information
        if (result.items && result.items.length > 0) {
            const populatedItems = await BookingModel.populate(result.items, {
                path: 'user',
                select: 'name email phone'
            });
            result.items = populatedItems;
        }

        // Normalize the result
        return normalizeDoc(result);
    }

    /**
     * Update booking status
     */
    async updateBookingStatus(bookingId: string, status: string, notes?: string) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw createHttpError(400, 'Invalid booking ID');
        }

        const updateData: any = { status };

        if (status === 'confirmed') {
            updateData.confirmedAt = new Date();
        } else if (status === 'cancelled') {
            updateData.cancelledAt = new Date();
            if (notes) {
                updateData.cancellationReason = notes;
            }
        }

        if (notes && status !== 'cancelled') {
            updateData.notes = notes;
        }

        const booking = await BookingModel.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true, runValidators: true }
        ).populate('tour', 'title code');

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        // Normalize the result
        return normalizeDoc(booking);
    }

    /**
     * Update payment status
     */
    async updatePaymentStatus(
        bookingId: string,
        paymentStatus: string,
        paidAmount?: number,
        transactionId?: string
    ) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw createHttpError(400, 'Invalid booking ID');
        }

        const updateData: any = { paymentStatus };

        if (paidAmount !== undefined) {
            updateData.paidAmount = paidAmount;
        }

        if (transactionId) {
            updateData.transactionId = transactionId;
        }

        const booking = await BookingModel.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        // Normalize the result
        return normalizeDoc(booking);
    }

    /**
     * Cancel booking with 48-hour policy check
     */
    async cancelBooking(bookingId: string, reason?: string) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw createHttpError(400, 'Invalid booking ID');
        }

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        // Check if booking is already cancelled
        if (booking.status === 'cancelled') {
            throw createHttpError(400, 'Booking is already cancelled');
        }

        // Check 48-hour cancellation policy
        const departureDate = new Date(booking.departureDate);
        const now = new Date();
        const hoursUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeparture < 48) {
            throw createHttpError(400, 'Cancellation not allowed within 48 hours of departure');
        }

        return this.updateBookingStatus(bookingId, 'cancelled', reason);
    }

    /**
     * Generate booking voucher (placeholder for PDF generation)
     */
    async generateVoucher(bookingId: string): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw createHttpError(400, 'Invalid booking ID');
        }

        const booking = await BookingModel
            .findById(bookingId)
            .populate('tour', 'title code coverImage price location')
            .populate('user', 'name email phone')
            .lean();

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        // Return booking data for voucher generation
        // In a real implementation, this would generate a PDF
        const voucherData = {
            bookingReference: booking.bookingReference,
            tour: booking.tour,
            customer: booking.user || booking.guestInfo,
            departureDate: booking.departureDate,
            participants: booking.participants,
            travelers: booking.travelers,
            pricing: booking.pricing,
            status: booking.status,
            contactInfo: {
                name: booking.contactName,
                email: booking.contactEmail,
                phone: booking.contactPhone
            }
        };

        // Normalize the result
        return normalizeDoc(voucherData);
    }

    /**
     * Get booking statistics
     */
    async getBookingStats() {
        const stats = await BookingModel.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.totalPrice' },
                    paidRevenue: { $sum: '$paidAmount' }
                }
            }
        ]);

        return stats;
    }

    // Static methods for backward compatibility
    static async checkAvailability(tourId: string, departureDate: Date) {
        return BookingService.getInstance().checkAvailability(tourId, departureDate);
    }

    static async createBooking(bookingData: Partial<Booking>) {
        return BookingService.getInstance().createBooking(bookingData);
    }

    static async getAllBookings(filters: any, paginationParams: PaginationParams) {
        return BookingService.getInstance().getAllBookings(filters, paginationParams);
    }

    static async getBookingById(bookingId: string) {
        return BookingService.getInstance().getBookingById(bookingId);
    }

    static async getBookingByReference(reference: string) {
        return BookingService.getInstance().getBookingByReference(reference);
    }

    static async getUserBookings(userId: string, paginationParams: PaginationParams, status?: string) {
        return BookingService.getInstance().getUserBookings(userId, paginationParams, status);
    }

    static async getTourBookings(tourId: string, paginationParams: PaginationParams) {
        return BookingService.getInstance().getTourBookings(tourId, paginationParams);
    }

    static async updateBookingStatus(bookingId: string, status: string, notes?: string) {
        return BookingService.getInstance().updateBookingStatus(bookingId, status, notes);
    }

    static async updatePaymentStatus(
        bookingId: string,
        paymentStatus: string,
        paidAmount?: number,
        transactionId?: string
    ) {
        return BookingService.getInstance().updatePaymentStatus(bookingId, paymentStatus, paidAmount, transactionId);
    }

    static async cancelBooking(bookingId: string, reason?: string) {
        return BookingService.getInstance().cancelBooking(bookingId, reason);
    }

    static async generateVoucher(bookingId: string) {
        return BookingService.getInstance().generateVoucher(bookingId);
    }

    static async getBookingStats() {
        return BookingService.getInstance().getBookingStats();
    }
}
