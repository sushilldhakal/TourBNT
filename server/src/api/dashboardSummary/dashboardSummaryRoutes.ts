import { Router } from 'express';
import { getDashboardSummary } from './dashboardSummaryController';
import { authenticate } from '../../middlewares/authenticate';
import { asyncAuthHandler } from '../../utils/routeWrapper';

const router = Router();

/** GET /api/v1/dashboard/summary — role-scoped numbers for the dashboard home. */
router.get('/summary', authenticate, asyncAuthHandler(getDashboardSummary));

export default router;
