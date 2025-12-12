import express from 'express';
import { authenticate } from '../../middlewares/authenticate';
import {
    getTourRating,
    getAllApprovedReviews,
    addReview,
    getPendingReviews,
    getAllReviews,
    updateReviewStatus,
    addReviewReply,
    likeReview,
    likeReviewReply,
    incrementReviewView,
    incrementReplyView,
    getTourReviews
} from './reviewController';

const router = express.Router({ mergeParams: true }); // mergeParams allows access to params from parent router

// Public routes
router.get('/approved/all', getAllApprovedReviews);
router.get('/tour/:tourId', getTourReviews); // Using the new version that works with embedded reviews
router.get('/tour/:tourId/rating', getTourRating);

// Protected routes
router.use(authenticate); // All routes below this middleware require authentication

// Review management
router.post('/tour/:tourId', addReview); // Using the new version that works with embedded reviews

// Review status management
router.get('/pending', getPendingReviews);
router.get('/all', getAllReviews);
router.patch('/tour/:tourId/review/:reviewId/status', updateReviewStatus);

// Review interactions
router.post('/tour/:tourId/review/:reviewId/reply', addReviewReply);
router.post('/tour/:tourId/review/:reviewId/like', likeReview);
router.post('/tour/:tourId/review/:reviewId/view', incrementReviewView);
router.post('/tour/:tourId/review/:reviewId/reply/:replyId/like', likeReviewReply);
router.post('/tour/:tourId/review/:reviewId/reply/:replyId/view', incrementReplyView);

export default router;