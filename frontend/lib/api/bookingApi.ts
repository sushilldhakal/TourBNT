import { api, handleApiError } from './apiClient';
import { CartBooking } from '../cartUtils';

/**
 * Create a new booking
 * @param bookingData - Booking information
 * @returns Created booking data
 */
export const createBooking = async (bookingData: Omit<CartBooking, 'bookingReference'>) => {
    try {
        const response = await api.post('/api/bookings', bookingData, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'creating booking');
    }
};

/**
 * Process payment for bookings
 * @param paymentData - Payment information
 * @returns Payment confirmation
 */
export const processPayment = async (paymentData: {
    bookings: CartBooking[];
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
        const response = await api.post('/api/bookings/payment', paymentData, {
            timeout: 30000, // 30 seconds for payment processing
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'processing payment');
    }
};

/**
 * Get user's bookings
 * @returns List of user bookings
 */
export const getUserBookings = async () => {
    try {
        const response = await api.get('/api/bookings/my-bookings', {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching user bookings');
    }
};

/**
 * Get booking by reference
 * @param bookingReference - Booking reference number
 * @returns Booking details
 */
export const getBookingByReference = async (bookingReference: string) => {
    try {
        const response = await api.get(`/api/bookings/${bookingReference}`, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching booking');
    }
};

/**
 * Validate promo code
 * @param promoCode - Promo code to validate
 * @returns Discount information
 */
export const validatePromoCode = async (promoCode: string) => {
    try {
        const response = await api.post('/api/bookings/promo/validate', { promoCode }, {
            timeout: 10000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'validating promo code');
    }
};

/**
 * Cancel a booking
 * @param bookingReference - Booking reference to cancel
 * @returns Cancellation confirmation
 */
export const cancelBooking = async (bookingReference: string) => {
    try {
        const response = await api.post(`/api/bookings/${bookingReference}/cancel`, {}, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'cancelling booking');
    }
};
