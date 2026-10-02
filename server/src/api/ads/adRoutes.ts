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
  getAdminAds,
  approveAd,
  rejectAd,
  markAdPaid,
  deleteAdCampaign,
  getAdsForPlacement,
  recordAdImpressions,
  recordAdClick,
  getAdStats,
  getAdPlacementPreview,
  getPricing,
  putPricing,
} from './adController';

const adRouter = express.Router();

// Public: contextual ad serving (by tour / destination / category / search phrase) and tracking.
adRouter.get('/placements', getAdsForPlacement);
adRouter.post('/impressions', recordAdImpressions);
adRouter.get('/pricing', getPricing);

adRouter.put('/pricing', authenticate, authorizeRoles('admin'), asyncAuthHandler(putPricing));

adRouter.post('/', authenticate, uploadAdImage, asyncAuthHandler(createAdCampaign));
adRouter.get('/me', authenticate, asyncAuthHandler(getMyAdCampaigns));

adRouter.get('/pending', authenticate, authorizeRoles('admin'), paginationMiddleware(), asyncAuthHandler(getPendingAds));
adRouter.get('/admin', authenticate, authorizeRoles('admin'), paginationMiddleware(), asyncAuthHandler(getAdminAds));

adRouter.get('/:adId', asyncAuthHandler(getAdById));
adRouter.patch('/:adId', authenticate, uploadAdImage, asyncAuthHandler(updateAdCampaign));
adRouter.patch('/:adId/targeting', authenticate, asyncAuthHandler(updateAdTargeting));
adRouter.patch('/:adId/approve', authenticate, authorizeRoles('admin'), asyncAuthHandler(approveAd));
adRouter.patch('/:adId/reject', authenticate, authorizeRoles('admin'), asyncAuthHandler(rejectAd));
adRouter.patch('/:adId/mark-paid', authenticate, authorizeRoles('admin'), asyncAuthHandler(markAdPaid));
adRouter.delete('/:adId', authenticate, asyncAuthHandler(deleteAdCampaign));

adRouter.post('/:adId/click', asyncAuthHandler(recordAdClick));
adRouter.get('/:adId/stats', authenticate, asyncAuthHandler(getAdStats));
adRouter.get('/:adId/where', authenticate, asyncAuthHandler(getAdPlacementPreview));

export default adRouter;
