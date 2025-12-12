import express from 'express';
import {
  getApprovedDestinations,
  getDestinationsByCountry,
  searchDestinations,
  getSellerDestinations,
  submitDestination,
  updateDestination,
  updateDestinationPreferences,
  deleteDestination,
  getEnabledDestinations,
  getFavoriteDestinations,
  getPendingDestinations,
  approveDestination,
  rejectDestination,
  toggleFavoriteDestination,
  addExistingDestinationToSeller,
  removeExistingDestinationFromSeller,
  toggleDestinationActiveStatus,
  getUserDestinations,
  fixDeletedApprovedDestinations
} from './globalDestinationController';
import { authenticate } from '../../../middlewares/authenticate';
import { uploadNone } from '../../../middlewares/multer';

const router = express.Router();

// Public routes
router.get('/approved', getApprovedDestinations);
router.get('/country/:country', getDestinationsByCountry);

// Authenticated routes
router.use(authenticate);

// Seller routes
router.get('/seller/visible', getSellerDestinations as any);
router.get('/seller/search', searchDestinations as any);
router.get('/seller/enabled', getEnabledDestinations as any);
router.get('/seller/favorites', getFavoriteDestinations as any);
router.get('/user-destinations', getUserDestinations as any); // New route for user-specific destinations
router.post('/submit', uploadNone, submitDestination as any);
router.patch('/:destinationId', uploadNone, updateDestination as any);
router.put('/preferences', updateDestinationPreferences as any);
router.put('/:destinationId/favorite', toggleFavoriteDestination as any);
router.patch('/:destinationId/toggle-active', toggleDestinationActiveStatus as any);
router.post('/:destinationId/add-to-list', authenticate, addExistingDestinationToSeller as any);
router.post('/:destinationId/remove-from-list', authenticate, removeExistingDestinationFromSeller as any);

// Admin routes
router.get('/admin/pending', getPendingDestinations as any);
router.put('/admin/:destinationId/approve', approveDestination as any);
router.put('/admin/:destinationId/reject', rejectDestination as any);
router.delete('/admin/:destinationId', deleteDestination as any);
router.post('/admin/fix-deleted-approved', fixDeletedApprovedDestinations as any);

export default router;
