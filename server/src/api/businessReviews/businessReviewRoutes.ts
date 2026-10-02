import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { simpleViewTracking } from '../../middlewares/viewTracking';
import { db, businessReviews } from '../../db';
import { eq, sql } from 'drizzle-orm';
import {
  getPendingBusinessReviews,
  getBusinessReviewById,
  updateBusinessReviewStatus,
  addBusinessReviewReply,
  toggleBusinessReviewLike,
} from './businessReviewController';

const PARTNER_ROLES = ['admin', 'guide', 'hotel', 'guesthouse', 'restaurant', 'transport', 'advertiser'];

const router = express.Router();

// Moderation queue: business owners see reviews on their own listings, admin sees all.
router.get('/pending', authenticate, authorizeRoles(...PARTNER_ROLES), getPendingBusinessReviews);

router.get(
  '/:reviewId',
  simpleViewTracking('review', 'reviewId', async (reviewId) => {
    await db.update(businessReviews).set({ views: sql`${businessReviews.views} + 1` }).where(eq(businessReviews.id, reviewId));
  }),
  getBusinessReviewById
);

router.patch('/:reviewId/status', authenticate, authorizeRoles(...PARTNER_ROLES), updateBusinessReviewStatus);
router.post('/:reviewId/replies', authenticate, addBusinessReviewReply);
router.post('/:reviewId/likes', authenticate, toggleBusinessReviewLike);

export default router;
