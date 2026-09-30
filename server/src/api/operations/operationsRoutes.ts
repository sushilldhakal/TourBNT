import { Router } from 'express';
import { getOperationsSummary } from './operationsController';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { asyncAuthHandler } from '../../utils/routeWrapper';

const router = Router();

/**
 * @route   GET /api/v1/operations/summary
 * @desc    Portfolio-wide trip/supplier snapshot for TourBNT staff
 * @access  Admin only
 */
router.get('/summary', authenticate, authorizeRoles('admin'), asyncAuthHandler(getOperationsSummary));

export default router;
