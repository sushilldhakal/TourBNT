import express from 'express';
import globalCategoryRoutes from './category/globalCategoryRoutes';
import globalDestinationRoutes from './destination/globalDestinationRoutes';

const router = express.Router();

// Global category routes
router.use('/categories', globalCategoryRoutes);

// Global destination routes
router.use('/destinations', globalDestinationRoutes);

export default router;
