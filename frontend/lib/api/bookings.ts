import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Booking API Methods
 * Migrated from dashboard/src/http/bookingApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

export interface BookingData {
    tourId: string;
    tourTitle: string;
    tourCode: string;
    departureDate: string;
    participants: {
        adults: number;
        children: number;
        infants?: number;
    };
    pricing: {
        basePrice: number;
        adultPrice: number;
        childPrice: number;
        infantPrice?: number;
        totalPrice: number;
        currency: string;
    };
    contactInfo: {
        fullName: string;
        email: string;
        phone: string;
        country?: string;
    };
    specialRequests?: string;
}

/**
 * Create a new booking
 */
export const createBooking = async (bookingData: BookingData) => {
    try {
        const response = await api.post('/api/bookings', bookingData);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'creating booking');
    }
};

/**
 * Get booking by reference number
 */
export const getBookingByReference = async (reference: string) => {
    try {
        const response = await api.get(`/api/bookings/reference/${reference}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching booking by reference');
    }
};

/**
 * Get user's bookings
 */
export const getUserBookings = async (params?: { page?: number; limit?: number }) => {
    try {
        const response = await api.get('/api/bookings/my-bookings', { params });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user bookings');
    }
};

/**
 * Get all bookings (admin/seller)
 */
export const getAllBookings = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    tourId?: string;
}) => {
    try {
        const response = await api.get('/api/bookings', { params });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching bookings');
    }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId: string) => {
    try {
        const response = await api.get(`/api/bookings/${bookingId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching booking');
    }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (
    bookingId: string,
    status: string,
    notes?: string
) => {
    try {
        const response = await api.patch(`/api/bookings/${bookingId}/status`, { status, notes });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating booking status');
    }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
    bookingId: string,
    paymentStatus: string,
    paidAmount?: number,
    transactionId?: string
) => {
    try {
        const response = await api.patch(`/api/bookings/${bookingId}/payment`, {
            paymentStatus,
            paidAmount,
            transactionId,
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating payment status');
    }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (bookingId: string, reason?: string) => {
    try {
        const response = await api.post(`/api/bookings/${bookingId}/cancel`, { reason });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'cancelling booking');
    }
};

/**
 * Get booking statistics
 */
export const getBookingStats = async () => {
    try {
        const response = await api.get('/api/bookings/stats');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching booking stats');
    }
};
