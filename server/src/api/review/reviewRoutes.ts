import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import { filterSortMiddleware } from '../../middlewares/filterSort';
import { simpleViewTracking } from '../../middlewares/viewTracking';
import { cacheRoute } from '../../middlewares/cacheMiddleware';
import { db, reviews } from '../../db';
import { eq, sql } from 'drizzle-orm';
import {
  listManagedReviews,
    getAllApprovedReviews,
    getPendingReviews,
    getReviewById,
    updateReviewStatus,
    addReviewReply,
    likeReview,
    likeReviewReply,
    incrementReplyView
} from './reviewController';

const router = express.Router({ mergeParams: true }); // mergeParams allows access to params from parent router

// Public routes

/**
 * @swagger
 * /api/v1/reviews:
 *   get:
 *     summary: Get all reviews
 *     description: Retrieve all approved reviews across all tours (top-level collection endpoint)
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of reviews per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by review status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, rating]
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 totalPages:
 *                   type: number
 */
router.get('/',
    cacheRoute('reviews', 120),
    paginationMiddleware(),
    filterSortMiddleware(['status'], ['createdAt', 'rating']),
    getAllApprovedReviews
);

// Protected routes - require authentication
/**
 * @swagger
 * /api/v1/reviews/pending:
 *   get:
 *     summary: Get pending reviews
 *     description: Retrieve all reviews pending approval (admin/seller only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/pending', authenticate, authorizeRoles('admin', 'seller'), getPendingReviews);
// Moderation list (all statuses, scoped to the seller's own tours; admin sees all). Must precede '/:reviewId'.
router.get('/manage', authenticate, authorizeRoles('admin', 'seller'), listManagedReviews);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}:
 *   get:
 *     summary: Get review by ID
 *     description: Retrieve a specific review by ID (auto-increments view count)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review not found
 */
router.get('/:reviewId',
    simpleViewTracking('review', 'reviewId', async (reviewId) => {
        // Auto-increment view count for the review
        await db.update(reviews).set({ views: sql`${reviews.views} + 1` }).where(eq(reviews.id, reviewId));
    }),
    getReviewById
);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}/status:
 *   patch:
 *     summary: Update review status
 *     description: Approve or reject a review (admin/seller only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Review status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 */
router.patch('/:reviewId/status', authenticate, authorizeRoles('admin', 'seller'), updateReviewStatus);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}/replies:
 *   post:
 *     summary: Reply to review
 *     description: Add a reply to a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply added successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */
router.post('/:reviewId/replies', authenticate, addReviewReply);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}/likes:
 *   post:
 *     summary: Like review
 *     description: Like or unlike a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review liked/unliked successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */
router.post('/:reviewId/likes', authenticate, likeReview);

/**
 * POST /api/v1/reviews/:reviewId/replies/:replyId/likes
 * Both likeReviewReply and incrementReplyView were fully implemented
 * already but never routed — the frontend's ReplyCard like/view actions
 * were either 404ing or (for likes) accidentally hitting the unrelated
 * blog-comments endpoint.
 */
router.post('/:reviewId/replies/:replyId/likes', authenticate, likeReviewReply);
router.post('/:reviewId/replies/:replyId/views', incrementReplyView);

export default router;