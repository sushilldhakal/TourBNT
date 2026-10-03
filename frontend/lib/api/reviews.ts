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
        const response = await api.get('/reviews/pending');
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
            ? `/tours/${tourId}/reviews?status=${status}`
            : `/tours/${tourId}/reviews`;
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
            `/reviews/${reviewId}/status`,
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
            `/reviews/${reviewId}/replies`,
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
        const response = await api.post(`/reviews/${reviewId}/likes`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'liking review');
    }
};

export interface ReviewEligibility {
    canReview: boolean;
    reason?: 'not_signed_in' | 'own_tour' | 'no_booking' | 'trip_not_taken';
    message?: string;
}

/** Whether the visitor may review this tour. A signed-out visitor is simply "not signed in", not an error. */
export const getReviewEligibility = async (tourId: string): Promise<ReviewEligibility> => {
    try {
        const response = await api.get(`/tours/${tourId}/reviews/eligibility`);
        return (response.data?.data ?? { canReview: false }) as ReviewEligibility;
    } catch (error: any) {
        if (error?.response?.status === 401) {
            return { canReview: false, reason: 'not_signed_in', message: 'Sign in to review a tour you have taken.' };
        }
        throw handleApiError(error, 'checking review eligibility');
    }
};

/**
 * Add a new review
 */
export const addReview = async (tourId: string, rating: number, comment: string) => {
    try {
        const response = await api.post(`/tours/${tourId}/reviews`, {
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
        // The registered route is GET / (root) — /reviews/all never existed
        // and was matching :reviewId="all" on the single-review route instead.
        const response = await api.get('/reviews');
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
        // The registered route is GET /reviews (root) — getAllApprovedReviews
        // already defaults to status=approved. /reviews/approved/all was
        // never a real endpoint, hence the permanent "Unable to load
        // reviews" on the homepage.
        const url = limit ? `/reviews?limit=${limit}` : `/reviews`;
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
        const response = await api.get(`/tours/${tourId}/rating`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tour rating');
    }
};

/**
 * Increment view count for a review
 * @deprecated View tracking is now automatic on GET requests
 */
export const incrementReviewView = async (tourId: string, reviewId: string) => {
    try {
        const response = await api.post(`/reviews/tour/${tourId}/review/${reviewId}/view`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'incrementing review view');
    }
};

/**
 * Like a reply
 */
export const likeReplyReview = async (tourId: string, reviewId: string, replyId: string) => {
    try {
        // This was calling /comments/:replyId/likes — the blog-comments
        // endpoint, a different resource entirely — since replyId here is
        // a reviewReplies.id, not a comments.id, this always failed.
        const response = await api.post(`/reviews/${reviewId}/replies/${replyId}/likes`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'liking reply');
    }
};

/**
 * Like a reply (alias for likeReplyReview)
 */
export const likeReply = async (tourId: string, reviewId: string, replyId: string) => {
    return likeReplyReview(tourId, reviewId, replyId);
};

/**
 * Increment view count for a reply
 */
export const incrementReplyView = async (tourId: string, reviewId: string, replyId: string) => {
    try {
        const response = await api.post(`/reviews/${reviewId}/replies/${replyId}/views`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'incrementing reply view');
    }
};
