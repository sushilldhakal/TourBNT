import express from 'express';
import multer from 'multer';
import { authenticate, isAdminOrSeller } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import { filterSortMiddleware } from '../../middlewares/filterSort';
import { simpleViewTracking } from '../../middlewares/viewTracking';
import {
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  searchTours,
  getLatestTours,
  getToursByRating,
  getDiscountedTours,
  getSpecialOfferTours,
  getUserTours,
  getUserToursTitle,
  incrementTourBookings,
  checkTourAvailability
} from './controllers/tourController';
import {
  validateObjectId,
  validateTourCreation,
  validatePagination,
  validateSearchParams
} from './middleware/validation';
import { TourService } from './services/tourService';
// Import review controller functions for nested routes
import { getTourReviews, addReview, getTourRating } from '../review/reviewController';
// Import booking controller function for nested routes
import { getTourBookings } from '../bookings/controllers/bookingController';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

/**
 * RESTful Tour Routes
 * Following REST best practices with proper middleware ordering
 */

// Public routes (no authentication required)
/**
 * @swagger
 * /api/tours:
 *   get:
 *     summary: Get all tours
 *     description: Retrieve a paginated list of all published tours with filtering and sorting
 *     tags: [Tours]
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
 *         description: Number of tours per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *         description: Filter by destination
 *     responses:
 *       200:
 *         description: Tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       400:
 *         description: Invalid pagination parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/',
  paginationMiddleware,
  filterSortMiddleware(['status', 'category', 'destination'], ['createdAt', 'price', 'title', 'views', 'rating']),
  getAllTours
);
/**
 * @swagger
 * /api/tours/search:
 *   get:
 *     summary: Search tours
 *     description: Search tours with filters and pagination
 *     tags: [Tours]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *         description: Destination ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/search', validateSearchParams, validatePagination, searchTours);

/**
 * @swagger
 * /api/tours/latest:
 *   get:
 *     summary: Get latest tours
 *     description: Retrieve the most recently created tours
 *     tags: [Tours]
 *     responses:
 *       200:
 *         description: Latest tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tour'
 */
router.get('/latest', getLatestTours);

/**
 * @swagger
 * /api/tours/by-rating:
 *   get:
 *     summary: Get tours by rating
 *     description: Retrieve tours sorted by average rating
 *     tags: [Tours]
 *     responses:
 *       200:
 *         description: Tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tour'
 */
router.get('/by-rating', getToursByRating);

/**
 * @swagger
 * /api/tours/discounted:
 *   get:
 *     summary: Get discounted tours
 *     description: Retrieve tours with active discounts
 *     tags: [Tours]
 *     responses:
 *       200:
 *         description: Discounted tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tour'
 */
router.get('/discounted', getDiscountedTours);

/**
 * @swagger
 * /api/tours/special-offers:
 *   get:
 *     summary: Get special offer tours
 *     description: Retrieve tours marked as special offers
 *     tags: [Tours]
 *     responses:
 *       200:
 *         description: Special offer tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tour'
 */
router.get('/special-offers', getSpecialOfferTours);

// User tour management routes (must come before /:tourId to avoid conflicts)
// Note: These routes will be deprecated in favor of /api/users/:userId/tours
/**
 * @swagger
 * /api/tours/user/{userId}:
 *   get:
 *     summary: Get user's tours
 *     description: Retrieve all tours created by a specific user (deprecated - use /api/users/:userId/tours)
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: User tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/user/:userId', authenticate, validatePagination, getUserTours);

/**
 * @swagger
 * /api/tours/user/{userId}/titles:
 *   get:
 *     summary: Get user's tour titles
 *     description: Retrieve titles of all tours created by a specific user (deprecated - use /api/users/:userId/tours)
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Tour titles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/user/:userId/titles', authenticate, getUserToursTitle);

// RESTful single tour route (public) with automatic view tracking
/**
 * @swagger
 * /api/tours/{tourId}:
 *   get:
 *     summary: Get tour by ID
 *     description: Retrieve detailed information about a specific tour (automatically increments view count)
 *     tags: [Tours]
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Tour retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tour'
 *       400:
 *         description: Invalid tour ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tour not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:tourId',
  validateObjectId(),
  simpleViewTracking('tour', 'tourId', async (tourId: string) => {
    await TourService.incrementTourViews(tourId);
  }),
  getTour
);

/**
 * @swagger
 * /api/tours/{tourId}/availability:
 *   get:
 *     summary: Check tour availability
 *     description: Check if a tour is available for booking
 *     tags: [Tours]
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
 *     responses:
 *       200:
 *         description: Availability information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                 availableSeats:
 *                   type: number
 *       404:
 *         description: Tour not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:tourId/availability', validateObjectId(), checkTourAvailability);

// Nested resource routes for tours

/**
 * @swagger
 * /api/tours/{tourId}/reviews:
 *   get:
 *     summary: Get tour reviews
 *     description: Retrieve all reviews for a specific tour with pagination
 *     tags: [Tours, Reviews]
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
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
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       404:
 *         description: Tour not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:tourId/reviews', validateObjectId(), paginationMiddleware, getTourReviews);

/**
 * @swagger
 * /api/tours/{tourId}/reviews:
 *   post:
 *     summary: Add review to tour
 *     description: Submit a new review for a tour (requires authentication)
 *     tags: [Tours, Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:tourId/reviews', authenticate, validateObjectId(), addReview);

/**
 * @swagger
 * /api/tours/{tourId}/rating:
 *   get:
 *     summary: Get tour rating
 *     description: Get average rating and review count for a tour
 *     tags: [Tours, Reviews]
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
 *     responses:
 *       200:
 *         description: Rating retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 averageRating:
 *                   type: number
 *                 numberOfReviews:
 *                   type: number
 */
router.get('/:tourId/rating', validateObjectId(), getTourRating);

/**
 * @swagger
 * /api/tours/{tourId}/bookings:
 *   get:
 *     summary: Get tour bookings
 *     description: Retrieve all bookings for a specific tour (admin/seller only)
 *     tags: [Tours, Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
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
 *         description: Number of bookings per page
 *     responses:
 *       200:
 *         description: Tour bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin/Seller access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:tourId/bookings', authenticate, isAdminOrSeller as any, validateObjectId(), paginationMiddleware, getTourBookings);

// RESTful update and delete routes (requires authentication and admin/seller role)
/**
 * @swagger
 * /api/tours/{tourId}:
 *   patch:
 *     summary: Update tour
 *     description: Update tour information including images (requires admin or seller role)
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               coverImage:
 *                 type: string
 *                 format: binary
 *               file:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Tour updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tour'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - requires admin or seller role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tour not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete tour
 *     description: Delete a tour permanently (requires admin or seller role)
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
 *     responses:
 *       200:
 *         description: Tour deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - requires admin or seller role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tour not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:tourId',
  authenticate,
  isAdminOrSeller as any,
  validateObjectId(),
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'file', maxCount: 10 }
  ]),
  updateTour
);

router.delete('/:tourId', authenticate, isAdminOrSeller as any, validateObjectId(), deleteTour);

/**
 * @swagger
 * /api/tours/{tourId}/bookings/increment:
 *   patch:
 *     summary: Increment tour bookings
 *     description: Increment the booking count for a tour (internal use)
 *     tags: [Tours]
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
 *     responses:
 *       200:
 *         description: Booking count incremented
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: number
 */
router.patch('/:tourId/bookings/increment', validateObjectId(), incrementTourBookings);

// Protected routes (authentication required) - ALL routes below this line require auth
router.use(authenticate);

// RESTful create tour route (requires authentication and admin/seller role)
/**
 * @swagger
 * /api/tours:
 *   post:
 *     summary: Create new tour
 *     description: Create a new tour with details and images (requires admin or seller role)
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *               destination:
 *                 type: string
 *               coverImage:
 *                 type: string
 *                 format: binary
 *               file:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Tour created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tour'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - requires admin or seller role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/',
  authenticate,
  isAdminOrSeller as any,
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'file', maxCount: 10 }
  ]),
  validateTourCreation,
  createTour
);

export default router;