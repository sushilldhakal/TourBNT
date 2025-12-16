/**
 * Monitoring and metrics routes
 */

import { Router } from 'express';
import { getDashboard, getHealthCheck } from './monitoringController';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';

const router = Router();

/**
 * @route   GET /api/monitoring/health
 * @desc    Get API health status
 * @access  Public
 */
router.get('/health', getHealthCheck);

/**
 * @route   GET /api/monitoring/dashboard
 * @desc    Get API metrics dashboard
 * @access  Admin only
 */
router.get('/dashboard', authenticate, authorizeRoles('admin'), getDashboard);

export default router;
