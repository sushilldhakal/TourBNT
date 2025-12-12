import { api, handleApiError } from './apiClient';

/**
 * Fetch all approved reviews
 */
export const getApprovedReviews = async (limit?: number) => {
    try {
        const url = limit
            ? `/api/reviews/approved/all?limit=${limit}`
            : `/api/reviews/approved/all`;
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching approved reviews');
    }
};

/**
 * Fetch reviews for a specific tour
 * 
 * @param tourId - Tour ID
 * @param status - Optional status filter ('approved', 'pending', 'rejected')
 * @returns Tour reviews data
 */
export const getTourReviews = async (tourId: string, status?: string) => {
    try {
        const url = status
            ? `/api/reviews/tour/${tourId}?status=${status}`
            : `/api/reviews/tour/${tourId}`;
        const response = await api.get(url, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching tour reviews');
    }
};

/**
 * Add a review to a tour
 * 
 * @param tourId - Tour ID
 * @param rating - Rating (1-5)
 * @param comment - Review comment
 * @returns Created review data
 */
export const addReview = async (tourId: string, rating: number, comment: string) => {
    try {
        const response = await api.post(`/api/reviews/tour/${tourId}`, {
            rating,
            comment,
            tour: tourId
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'submitting review');
    }
};

/**
 * Add a reply to a review
 * 
 * @param tourId - Tour ID
 * @param reviewId - Review ID
 * @param comment - Reply comment
 * @returns Created reply data
 */
export const addReviewReply = async (tourId: string, reviewId: string, comment: string) => {
    try {
        const response = await api.post(`/api/reviews/tour/${tourId}/review/${reviewId}/reply`, {
            comment
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'adding reply');
    }
};

/**
 * Like a review
 * 
 * @param tourId - Tour ID
 * @param reviewId - Review ID
 * @returns Updated review data
 */
export const likeReview = async (tourId: string, reviewId: string) => {
    try {
        const response = await api.post(`/api/reviews/tour/${tourId}/review/${reviewId}/like`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'liking review');
    }
};

/**
 * Like a reply
 * 
 * @param tourId - Tour ID
 * @param reviewId - Review ID
 * @param replyId - Reply ID
 * @returns Updated reply data
 */
export const likeReply = async (tourId: string, reviewId: string, replyId: string) => {
    try {
        const response = await api.post(`/api/reviews/tour/${tourId}/review/${reviewId}/reply/${replyId}/like`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'liking reply');
    }
};

/**
 * Increment view count for a review
 * 
 * @param tourId - Tour ID
 * @param reviewId - Review ID
 * @returns Updated review data
 */
export const incrementReviewView = async (tourId: string, reviewId: string) => {
    try {
        const response = await api.post(`/api/reviews/tour/${tourId}/review/${reviewId}/view`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'incrementing review view');
    }
};

/**
 * Increment view count for a reply
 * 
 * @param tourId - Tour ID
 * @param reviewId - Review ID
 * @param replyId - Reply ID
 * @returns Updated reply data
 */
export const incrementReplyView = async (tourId: string, reviewId: string, replyId: string) => {
    try {
        const response = await api.post(`/api/reviews/tour/${tourId}/review/${reviewId}/reply/${replyId}/view`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'incrementing reply view');
    }
};
