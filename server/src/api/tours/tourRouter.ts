import express from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/authenticate';
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
  incrementTourViews,
  incrementTourBookings,
  checkTourAvailability
} from './controllers/tourController';
import { migrateTourFacts } from './controllers/migrationController';
import {
  validateObjectId,
  validateTourCreation,
  validatePagination,
  validateSearchParams
} from './middleware/validation';

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
 * Refactored Tour Routes with validation middleware
 */

// Public routes (no authentication required)
router.get('/', validatePagination, getAllTours);
router.get('/search', validateSearchParams, validatePagination, searchTours);
router.get('/latest', getLatestTours);
router.get('/by-rating', getToursByRating);
router.get('/discounted', getDiscountedTours);
router.get('/special-offers', getSpecialOfferTours);

// Single tour routes (public) - must come before protected routes
router.get('/single/:tourId', validateObjectId(), getTour);
router.get('/:tourId/availability', validateObjectId(), checkTourAvailability);

// Update single tour route (requires authentication)
router.patch(
  '/single/:tourId',
  authenticate,
  validateObjectId(),
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'file', maxCount: 10 }
  ]),
  updateTour
);

// Delete single tour route (requires authentication)
router.delete('/single/:tourId', authenticate, validateObjectId(), deleteTour);

// Analytics routes (public)
router.patch('/:tourId/views/increment', validateObjectId(), incrementTourViews);
router.patch('/:tourId/bookings/increment', validateObjectId(), incrementTourBookings);

// Legacy update route (requires authentication, kept for backward compatibility)
router.patch(
  '/:tourId',
  authenticate,
  validateObjectId(),
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'file', maxCount: 10 }
  ]),
  updateTour
);

// Protected routes (authentication required) - ALL routes below this line require auth
router.use(authenticate);

// Migration endpoint - add factId to existing tours
router.post('/migrate/facts', migrateTourFacts);

// User tour management (with userId parameter for frontend compatibility)
router.get('/user/:userId', validatePagination, getUserTours);
router.get('/user/:userId/titles', getUserToursTitle);

// CRUD operations with validation
router.post('/',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'file', maxCount: 10 }
  ]),
  validateTourCreation,
  createTour
);

// Legacy delete route (kept for backward compatibility, but prefer /single/:tourId)
// router.delete('/:tourId', validateObjectId(), deleteTour);

export default router;