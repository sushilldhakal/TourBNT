import express, { RequestHandler } from 'express';
import { authenticate, isAdminOrSeller, AuthRequest } from '../../middlewares/authenticate';
import { asyncHandler } from '../../utils/routeWrapper';
import {
    createBooking,
    getAllBookings,
    getBookingById,
    getBookingByReference,
    getUserBookings,
    getTourBookings,
    updateBookingStatus,
    updatePaymentStatus,
    cancelBooking,
    getBookingStats,
    downloadVoucher
} from './controllers/bookingController';

const bookingRouter = express.Router();

// Public routes (guest bookings allowed)
bookingRouter.post('/', asyncHandler<AuthRequest>(createBooking));
bookingRouter.get('/reference/:reference', asyncHandler(getBookingByReference));

// Protected routes (authentication required)
bookingRouter.get('/my-bookings', authenticate, asyncHandler<AuthRequest>(getUserBookings));
bookingRouter.get('/user/:userId', authenticate, asyncHandler<AuthRequest>(getUserBookings));

// Admin/Seller routes
bookingRouter.get(
    '/',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(getAllBookings)
);

bookingRouter.get(
    '/stats',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(getBookingStats)
);

bookingRouter.get(
    '/tour/:tourId',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(getTourBookings)
);

bookingRouter.get('/:bookingId', authenticate, asyncHandler<AuthRequest>(getBookingById));

bookingRouter.patch(
    '/:bookingId/status',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(updateBookingStatus)
);

bookingRouter.patch(
    '/:bookingId/payment',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(updatePaymentStatus)
);

bookingRouter.post(
    '/:bookingId/cancel',
    authenticate,
    asyncHandler<AuthRequest>(cancelBooking)
);

bookingRouter.get(
    '/:bookingId/voucher',
    authenticate,
    asyncHandler<AuthRequest>(downloadVoucher)
);

export default bookingRouter;
