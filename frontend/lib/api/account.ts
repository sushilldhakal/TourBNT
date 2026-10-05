import { api, extractList, handleApiError } from '@/lib/api/apiClient';

export interface WishlistTour {
    tourId: string;
    title: string;
    code: string;
    coverImage: string | null;
    price: number | null;
    savedAt: string;
}

export interface MyReview {
    id: string;
    rating: number;
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    tourId: string;
    tourTitle: string;
}

export interface MyComment {
    id: string;
    text: string;
    approve: boolean;
    createdAt: string;
    postId: string;
    postTitle: string;
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'other';

/** Display-only. The API rejects a full card number or a security code. */
export interface SavedCard {
    id: string;
    brand: CardBrand;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
}

export interface AccountBooking {
    id: string;
    bookingReference: string;
    tourTitle: string;
    tourId: string;
    departureDate: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
    paymentMethod: string | null;
    paymentType: 'full_payment' | 'deposit_percentage' | 'pay_on_arrival';
    paidAmount: number;
    createdAt: string;
    pricing: {
        totalPrice?: number;
        currency?: string;
    };
}

export const getWishlist = async (): Promise<WishlistTour[]> => {
    try {
        return extractList<WishlistTour>(await api.get('/users/me/wishlist'));
    } catch (error) {
        throw handleApiError(error, 'loading bookmarks');
    }
};

export const addWishlistTour = async (tourId: string): Promise<void> => {
    try {
        await api.post('/users/me/wishlist', { tourId });
    } catch (error) {
        throw handleApiError(error, 'saving tour');
    }
};

export const removeWishlistTour = async (tourId: string): Promise<void> => {
    try {
        await api.delete(`/users/me/wishlist/${tourId}`);
    } catch (error) {
        throw handleApiError(error, 'removing bookmark');
    }
};

export const getMyReviews = async (): Promise<MyReview[]> => {
    try {
        return extractList<MyReview>(await api.get('/users/me/reviews'));
    } catch (error) {
        throw handleApiError(error, 'loading reviews');
    }
};

export const getMyComments = async (): Promise<MyComment[]> => {
    try {
        return extractList<MyComment>(await api.get('/users/me/comments'));
    } catch (error) {
        throw handleApiError(error, 'loading comments');
    }
};

export const getSavedCards = async (): Promise<SavedCard[]> => {
    try {
        return extractList<SavedCard>(await api.get('/users/me/payment-methods'));
    } catch (error) {
        throw handleApiError(error, 'loading cards');
    }
};

export const saveCards = async (cards: SavedCard[]): Promise<SavedCard[]> => {
    try {
        const response = await api.put('/users/me/payment-methods', { cards });
        return extractList<SavedCard>(response);
    } catch (error) {
        throw handleApiError(error, 'saving cards');
    }
};

export const getAccountBookings = async (): Promise<AccountBooking[]> => {
    try {
        return extractList<AccountBooking>(await api.get('/bookings/my-bookings', { params: { page: 1, limit: 50 } }));
    } catch (error) {
        throw handleApiError(error, 'loading bookings');
    }
};
