/**
 * Unified API Exports
 * Central export point for all API methods
 * Migrated and consolidated from dashboard/src/http/
 */

// Export API client and utilities
export * from './apiClient';

// Export all API modules
export * as tourApi from './tours';
export * as postApi from './posts';
export * as userApi from './users';
// Removed duplicate gallery API - use mediaApi instead
export * as mediaApi from './mediaApi';
export * as categoryApi from './categories';
export * as destinationApi from './destinations';
export * as bookingApi from './bookings';
export * as reviewApi from './reviews';
export * as commentApi from './comments';
export * as subscriberApi from './subscribers';

// Re-export commonly used functions for convenience
export {
    getTours,
    getSingleTour,
    createTour,
    updateTour,
    deleteTour,
    searchTours,
} from './tours';

export {
    getPosts,
    getSinglePost,
    addPost,
    updatePost,
    deletePost,
} from './posts';

export {
    getUserById,
    updateUser,
    uploadAvatar,
} from './users';

// Gallery API functions moved to mediaApi.ts

export {
    getAllMedia as getMediaItems,
    uploadMedia,
    deleteMedia as removeMedia,
    getThumbnailUrl,
    validateFile,
    validateFiles,
} from './mediaApi';

export {
    getAllCategories,
    getCategory,
    addCategory,
    updateCategory,
    deleteCategory,
} from './categories';

export {
    getAllDestinations,
    getDestination,
    addDestination,
    updateDestination,
    deleteDestination,
} from './destinations';

export {
    createBooking,
    getBookingByReference,
    getUserBookings,
    getAllBookings,
} from './bookings';

export {
    getTourReviews,
    addReview,
    updateReviewStatus,
    getApprovedReviews,
} from './reviews';

export {
    getAllComments,
    addComment,
    deleteComment,
} from './comments';

export {
    subscribeEmail,
    getSubscribers,
    subscribeBulk,
    unsubscribeEmail,
} from './subscribers';

export {
    getCompanyInfo,
} from './companyApi';
