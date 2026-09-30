import express from 'express';
import { cacheRoute } from '../../middlewares/cacheMiddleware';
import { getHomeFeed } from './homeController';

const router = express.Router();

router.get('/', cacheRoute('home-feed', 120), getHomeFeed);

export default router;
