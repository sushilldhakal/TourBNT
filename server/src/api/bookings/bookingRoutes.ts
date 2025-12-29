import express, { RequestHandler } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import { filterSortMiddleware } from '../../middlewares/filterSort';
import { asyncAuthHandler } from '../../utils/routeWrapper';
import {
    createBooking,
    getAllBookings,
    getBookingById,
    getBookingByReference,
    getUserBookings,
    updateBookingStatus,
    updatePaymentStatus,
    cancelBooking,
    getBookingStats,
    downloadVoucher
} from './controllers/bookingController';

const bookingRouter = express.Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * @swagger
 * /api/v1/bookings:
 *   post:
 *     summary: Create a new booking
 *     description: Create a booking for a tour (supports both authenticated users and guest bookings)
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tour
 *               - departureDate
 *               - participants
 *               - travelers
 *               - contactName
 *               - contactEmail
 *               - contactPhone
 *             properties:
 *               tour:
 *                 type: string
 *                 description: Tour ID
 *               departureDate:
 *                 type: string
 *                 format: date
 *               participants:
 *                 $ref: '#/components/schemas/Participants'
 *               travelers:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Traveler'
 *               contactName:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *                 format: email
 *               contactPhone:
 *                 type: string
 *               specialRequests:
 *                 type: string
 *               isGuestBooking:
 *                 type: boolean
 *               guestInfo:
 *                 $ref: '#/components/schemas/GuestInfo'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.post('/', asyncAuthHandler(createBooking));

/**
 * @swagger
 * /api/v1/bookings/reference/{reference}:
 *   get:
 *     summary: Get booking by reference
 *     description: Retrieve booking details using booking reference number (PUBLIC - for guest booking lookup)
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking reference number
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.get('/reference/:reference', asyncAuthHandler(getBookingByReference));

// ============================================================================
// AUTHENTICATED ROUTES (Require authentication)
// ============================================================================

/**
 * @swagger
 * /api/v1/bookings/my-bookings:
 *   get:
 *     summary: Get current user's bookings
 *     description: Retrieve all bookings for the authenticated user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/StandardResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Booking'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMetadata'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.get('/my-bookings', authenticate, asyncAuthHandler(getUserBookings));

/**
 * @swagger
 * /api/v1/bookings/stats:
 *   get:
 *     summary: Get booking statistics
 *     description: Retrieve booking statistics and analytics (admin/seller only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBookings:
 *                   type: number
 *                 pendingBookings:
 *                   type: number
 *                 confirmedBookings:
 *                   type: number
 *                 cancelledBookings:
 *                   type: number
 *                 totalRevenue:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.get(
    '/stats',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(getBookingStats)
);

// ============================================================================
// ADMIN/SELLER ROUTES (Require admin or seller role)
// ============================================================================

/**
 * @swagger
 * /api/v1/bookings:
 *   get:
 *     summary: Get all bookings
 *     description: Retrieve all bookings with pagination and filtering (admin/seller only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [unpaid, partial, paid, refunded]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, departureDate, totalAmount]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
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
bookingRouter.get(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    paginationMiddleware,
    filterSortMiddleware(['status', 'paymentStatus', 'tourId'], ['createdAt', 'departureDate', 'totalAmount']),
    asyncAuthHandler(getAllBookings)
);

/**
 * @swagger
 * /api/v1/bookings/{bookingId}:
 *   get:
 *     summary: Get booking by ID
 *     description: Retrieve detailed information about a specific booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.get('/:bookingId', authenticate, asyncAuthHandler(getBookingById));

/**
 * @swagger
 * /api/v1/bookings/{bookingId}/status:
 *   patch:
 *     summary: Update booking status
 *     description: Update the status of a booking (admin/seller only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
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
 *                 enum: [pending, confirmed, cancelled, completed]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
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
bookingRouter.patch(
    '/:bookingId/status',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(updateBookingStatus)
);

/**
 * @swagger
 * /api/v1/bookings/{bookingId}/payment:
 *   patch:
 *     summary: Update payment status
 *     description: Update the payment status of a booking (admin/seller only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [unpaid, partial, paid, refunded]
 *               paidAmount:
 *                 type: number
 *               transactionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
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
bookingRouter.patch(
    '/:bookingId/payment',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(updatePaymentStatus)
);

/**
 * @swagger
 * /api/v1/bookings/{bookingId}:
 *   delete:
 *     summary: Cancel booking
 *     description: Cancel a booking (authenticated users can cancel their own bookings)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Cannot cancel this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.delete(
    '/:bookingId',
    authenticate,
    asyncAuthHandler(cancelBooking)
);

/**
 * @swagger
 * /api/v1/bookings/{bookingId}/voucher:
 *   get:
 *     summary: Download booking voucher
 *     description: Download a PDF voucher for the booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Voucher downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
bookingRouter.get(
    '/:bookingId/voucher',
    authenticate,
    asyncAuthHandler(downloadVoucher)
);

// ============================================================================
// OLD ROUTES REMOVED
// ============================================================================
// GET /api/v1/bookings/user/:userId -> Replaced by GET /api/users/:userId/bookings (in userRouter)
// POST /api/v1/bookings/:bookingId/cancel -> Replaced by DELETE /api/v1/bookings/:bookingId

export default bookingRouter;
