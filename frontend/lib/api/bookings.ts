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
        const response = await api.post('/bookings', bookingData);
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
        const response = await api.get(`/bookings/reference/${reference}`);
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
        const response = await api.get('/bookings/my-bookings', { params });
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
        const response = await api.get('/bookings', { params });
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
        const response = await api.get(`/bookings/${bookingId}`);
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
        const response = await api.patch(`/bookings/${bookingId}/status`, { status, notes });
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
        const response = await api.patch(`/bookings/${bookingId}/payment`, {
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
        const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
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
        const response = await api.get('/bookings/stats');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching booking stats');
    }
};

/**
 * Process payment for bookings
 * @param paymentData - Payment information
 * @returns Payment confirmation
 */
export const processPayment = async (paymentData: {
    bookings: any[];
    paymentMethod: 'card' | 'paypal';
    contactInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    cardInfo?: {
        cardNumber: string;
        expiry: string;
        cvv: string;
    };
}) => {
    try {
        const response = await api.post('/bookings/payment', paymentData, {
            timeout: 30000, // 30 seconds for payment processing
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'processing payment');
    }
};

/**
 * Validate promo code
 * @param promoCode - Promo code to validate
 * @returns Discount information
 */
export const validatePromoCode = async (promoCode: string) => {
    try {
        const response = await api.post('/bookings/promo/validate', { promoCode }, {
            timeout: 10000,
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'validating promo code');
    }
};
