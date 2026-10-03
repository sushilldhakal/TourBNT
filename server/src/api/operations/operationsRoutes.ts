import { Router } from 'express';
import { getOperationsSummary, getOperationsRequests, getOperationsTrips, getOperationsSuppliers, getOperationsAttention } from './operationsController';
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
router.get('/summary', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsSummary));

router.get('/requests', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsRequests));
router.get('/trips', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsTrips));
router.get('/suppliers', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsSuppliers));

export default router;
