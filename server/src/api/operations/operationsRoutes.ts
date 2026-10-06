import { Router } from 'express';
import { getOperationsSummary, getOperationsRequests, getOperationsTrips, getOperationsSuppliers, getOperationsAttention } from './operationsController';
import { getOperationsEpg } from './epgController';
import { getDayDetail, getSupplierOptions, reassignRequest, updateDay } from './dayController';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { asyncAuthHandler } from '../../utils/routeWrapper';

const router = Router();

/**
 * @route   GET /api/v1/operations/summary
 * @desc    Portfolio-wide trip/supplier snapshot for TourBNT staff
 * @access  Admin only
 */
// Sellers' (and admins') board of upcoming supplier requests that still need attention.
router.get('/attention', authenticate, authorizeRoles('admin', 'seller'), asyncAuthHandler(getOperationsAttention));
// Admin/seller see tours; hotel, guesthouse, restaurant, guide and transport businesses see their own daily operations.
router.get('/epg', authenticate, authorizeRoles('admin', 'seller', 'hotel', 'guesthouse', 'restaurant', 'guide', 'transport'), asyncAuthHandler(getOperationsEpg));
// Day dialog: read/edit one itinerary day (tour authors and admins), and the suppliers that serve a destination.
router.get('/supplier-options', authenticate, authorizeRoles('admin', 'seller'), asyncAuthHandler(getSupplierOptions));
router.get('/tours/:tourId/days/:dayKey', authenticate, authorizeRoles('admin', 'seller'), asyncAuthHandler(getDayDetail));
router.patch('/tours/:tourId/days/:dayKey', authenticate, authorizeRoles('admin', 'seller'), asyncAuthHandler(updateDay));
router.post('/requests/:requestId/reassign', authenticate, authorizeRoles('admin', 'seller'), asyncAuthHandler(reassignRequest));
router.get('/summary', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsSummary));

router.get('/requests', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsRequests));
router.get('/trips', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsTrips));
router.get('/suppliers', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsSuppliers));

export default router;
