import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Review API Methods
 * Migrated from dashboard/src/http/reviewApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

/**
 * Get pending reviews
 */
export const getPendingReviews = async () => {
    try {
        const response = await api.get('/api/reviews/pending');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching pending reviews');
    }
};

/**
 * Get reviews for a specific tour
 */
export const getTourReviews = async (tourId: string, status?: string) => {
    try {
        const url = status
            ? `/api/tours/${tourId}/reviews?status=${status}`
            : `/api/tours/${tourId}/reviews`;
        const response = await api.get(url);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tour reviews');
    }
};

/**
 * Update review status (approve/reject)
 */
export const updateReviewStatus = async (
    tourId: string,
    reviewId: string,
    status: 'approved' | 'rejected'
) => {
    try {
        const response = await api.patch(
            `/api/reviews/${reviewId}/status`,
            { status }
        );
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating review status');
    }
};

/**
 * Add reply to a review
 */
export const addReviewReply = async (tourId: string, reviewId: string, comment: string) => {
    try {
        const response = await api.post(
            `/api/reviews/${reviewId}/replies`,
            { comment }
        );
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding review reply');
    }
};

/**
 * Like a review
 */
export const likeReview = async (tourId: string, reviewId: string) => {
    try {
        const response = await api.post(`/api/reviews/${reviewId}/likes`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'liking review');
    }
};

/**
 * Add a new review
 */
export const addReview = async (tourId: string, rating: number, comment: string) => {
    try {
        const response = await api.post(`/api/tours/${tourId}/reviews`, {
            rating,
            comment,
            tour: tourId,
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'submitting review');
    }
};

/**
 * Get all reviews
 */
export const getAllReviews = async () => {
    try {
        const response = await api.get('/api/reviews/all');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching all reviews');
    }
};

/**
 * Get approved reviews
 */
export const getApprovedReviews = async (limit?: number) => {
    try {
        const url = limit
            ? `/api/reviews/approved/all?limit=${limit}`
            : `/api/reviews/approved/all`;
        const response = await api.get(url);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching approved reviews');
    }
};

/**
 * Get tour rating
 */
export const getTourRating = async (tourId: string) => {
    try {
        const response = await api.get(`/api/tours/${tourId}/rating`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tour rating');
    }
};

/**
 * Increment review view count
 * @deprecated View tracking is now automatic on GET requests
 */
export const incrementReviewView = async (tourId: string, reviewId: string) => {
    // View tracking is now automatic - this function is kept for backward compatibility
    // but does nothing as views are tracked automatically on GET requests
    console.warn('incrementReviewView is deprecated - view tracking is now automatic');
    return Promise.resolve({ success: true, message: 'View tracking is automatic' });
};

/**
 * Like a reply
 */
export const likeReplyReview = async (tourId: string, reviewId: string, replyId: string) => {
    try {
        const response = await api.post(
            `/api/comments/${replyId}/likes`
        );
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'liking reply');
    }
};
