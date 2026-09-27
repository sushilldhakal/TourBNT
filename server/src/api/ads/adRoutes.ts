import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import { uploadAdImage } from '../../middlewares/multer';
import { asyncAuthHandler } from '../../utils/routeWrapper';
import {
  createAdCampaign,
  updateAdCampaign,
  getMyAdCampaigns,
  getAdById,
  updateAdTargeting,
  getPendingAds,
  approveAd,
  rejectAd,
  deleteAdCampaign,
  getAdsForPlacement,
  recordAdClick,
  getAdStats,
} from './adController';

const adRouter = express.Router();

// Public: the actual ad-serving endpoint, hard-filtered by placement/category/destination.
adRouter.get('/placements', getAdsForPlacement);

adRouter.post('/', authenticate, uploadAdImage, asyncAuthHandler(createAdCampaign));
adRouter.get('/me', authenticate, asyncAuthHandler(getMyAdCampaigns));

adRouter.get('/pending', authenticate, authorizeRoles('admin'), paginationMiddleware(), asyncAuthHandler(getPendingAds));

adRouter.get('/:adId', asyncAuthHandler(getAdById));
adRouter.patch('/:adId', authenticate, uploadAdImage, asyncAuthHandler(updateAdCampaign));
adRouter.patch('/:adId/targeting', authenticate, asyncAuthHandler(updateAdTargeting));
adRouter.patch('/:adId/approve', authenticate, authorizeRoles('admin'), asyncAuthHandler(approveAd));
adRouter.patch('/:adId/reject', authenticate, authorizeRoles('admin'), asyncAuthHandler(rejectAd));
adRouter.delete('/:adId', authenticate, asyncAuthHandler(deleteAdCampaign));

adRouter.post('/:adId/click', asyncAuthHandler(recordAdClick));
adRouter.get('/:adId/stats', authenticate, asyncAuthHandler(getAdStats));

export default adRouter;
