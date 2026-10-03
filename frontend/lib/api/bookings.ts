import { api, handleApiError, extractResponseData, extractList } from './apiClient';

/**
 * Booking API Methods
 * Migrated from dashboard/src/http/bookingApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

export interface BookingDetail {
    id: string;
    tourId: string;
    tourTitle: string;
    tourCode: string;
    userId: string | null;
    departureDate: string;
    participants: { adults: number; children: number; infants?: number };
    pricing?: { totalPrice?: number; currency?: string };
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    specialRequests?: string;
    bookingReference?: string;
    createdAt?: string;
    tour: { id: string; title: string; code?: string; coverImage?: string; location?: string } | null;
}

export type BookingTimelinePartnerStatus = 'pending' | 'held' | 'confirmed' | 'countered' | 'declined' | 'expired' | 'unscheduled';

export interface BookingTimelinePartner {
    role: 'transport' | 'accommodation' | 'guide' | 'meals' | 'other';
    businessPartnerId: string | null;
    businessPartnerName: string | null;
    unitType: string | null;
    status: BookingTimelinePartnerStatus;
    serviceTime: string | null;
    serviceEndTime: string | null;
    holdExpiresAt: string | null;
    respondByAt: string | null;
}

export interface BookingTimelineDay {
    dayId: string | null;
    dayIndex: number;
    date: string | null;
    title: string;
    description: string;
    destination: string | null;
    partners: BookingTimelinePartner[];
}

export type BookingTimeline = BookingTimelineDay[];

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
    // The server always recomputes pricing from the tour's own stored
    // configuration (see calculateBookingPricing) — it never trusts this.
    // Kept optional purely for older callers; new code shouldn't send it.
    pricing?: {
        basePrice: number;
        adultPrice: number;
        childPrice: number;
        infantPrice?: number;
        totalPrice: number;
        currency: string;
    };
    // Which policy (full payment / deposit / pay on arrival) the traveler
    // chose — must be one the tour has enabled, enforced server-side.
    paymentType: 'full_payment' | 'deposit_percentage' | 'pay_on_arrival';
    pricingOptionId?: string;
    /** A promo code the traveller entered; the server validates it and prices the booking with it. */
    promoCode?: string;
    contactInfo: {
        fullName: string;
        email: string;
        phone: string;
        country?: string;
    };
    specialRequests?: string;
}

export interface QuotedPricing {
    basePrice: number;
    adultPrice: number;
    childPrice: number;
    totalPrice: number;
    currency: string;
    amountDueNow: number;
    amountDueLater: number;
    depositPercentage?: number;
    promo?: { code: string; amount: number };
}

/**
 * The exact total the server will charge for a booking, with an optional promo code. Rejects with a friendly
 * message (e.g. "This promo code has expired.") when the code can't be used.
 */
export const quoteBooking = async (input: {
    tourId: string;
    participants: { adults: number; children: number; infants?: number };
    paymentType: BookingData['paymentType'];
    pricingOptionId?: string;
    promoCode?: string;
}): Promise<QuotedPricing> => {
    try {
        const response = await api.post('/bookings/quote', input);
        return (response.data?.data ?? response.data) as QuotedPricing;
    } catch (error: any) {
        const message = error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error?.message;
        throw new Error(message || 'Could not check that promo code.');
    }
};

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
        return extractResponseData<BookingDetail>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching booking');
    }
};

/**
 * Get a booking's day-by-day itinerary with each supplier's live
 * confirmation status — the customer's own "My Trip" timeline.
 */
export const getBookingTimeline = async (bookingId: string) => {
    try {
        const response = await api.get(`/bookings/${bookingId}/timeline`);
        return extractList<BookingTimelineDay>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching booking timeline');
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
        // The registered route is DELETE /bookings/:bookingId — POST .../cancel
        // was replaced and never updated here.
        const response = await api.delete(`/bookings/${bookingId}`, { data: { reason } });
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

export interface BookingInvoice {
    invoiceNumber: string;
    issuedAt: string;
    bookingId: string;
    bookingReference: string;
    status: string;
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
    paymentType: 'full_payment' | 'deposit_percentage' | 'pay_on_arrival';
    paymentMethod: string | null;
    transactionId: string | null;
    paidAt: string | null;
    cancelledAt: string | null;
    currency: string;
    tour: { title: string; code: string | null };
    departureDate: string;
    participants: { adults: number; children: number; infants: number };
    billTo: { name: string; email: string; phone: string; country: string | null };
    seller: { name: string; email: string; phone: string | null; taxId: string | null; registrationNumber: string | null; address: string | null } | null;
    lines: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
    subtotal: number;
    promo: { code: string; amount: number } | null;
    total: number;
    amountPaid: number;
    balanceDue: number;
    depositPercentage: number | null;
    amountDueNow: number;
    amountDueLater: number;
}

/**
 * The traveller's invoice for a booking (the traveller, the tour's seller, or an admin).
 */
export const getBookingInvoice = async (bookingId: string) => {
    try {
        const response = await api.get(`/bookings/${bookingId}/invoice`);
        return extractResponseData<BookingInvoice>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching invoice');
    }
};
