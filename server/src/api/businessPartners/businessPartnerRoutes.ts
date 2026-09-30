import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import { uploadBusinessDocs } from '../../middlewares/multer';
import { asyncAuthHandler } from '../../utils/routeWrapper';
import {
  applyAsBusinessPartner,
  getMyBusinessPartners,
  getBusinessPartnerById,
  getBusinessPartnerBySlug,
  searchBusinessPartners,
  updateMyBusinessPartner,
  updateBusinessPartnerTargeting,
  getPendingBusinessPartners,
  approveBusinessPartner,
  rejectBusinessPartner,
  deleteBusinessPartner,
  getToursFeaturingBusinessPartner,
} from './businessPartnerController';
import { getBusinessReviews, addBusinessReview } from '../businessReviews/businessReviewController';
import {
  getMyCapacity,
  updateMyCapacity,
  getCapacityOverrides,
  setCapacityOverride,
  getMyItineraryRequests,
  respondToItineraryRequest,
  getAvailableCapacityForDate,
} from './capacityController';
import {
  getUnitTypes,
  createUnitType,
  updateUnitType,
  deleteUnitType,
  getUnitTypeInventory,
  setUnitTypeBlock,
  getUnitTypeBlocks,
} from './unitTypeController';

const businessPartnerRouter = express.Router();

// Public directory search (used by the itinerary partner-picker and the
// public directory pages).
businessPartnerRouter.get('/', paginationMiddleware(), searchBusinessPartners);

// Authenticated user applies to become a business partner.
businessPartnerRouter.post('/', authenticate, uploadBusinessDocs, asyncAuthHandler(applyAsBusinessPartner));

// Current user's own listings (any approval status).
businessPartnerRouter.get('/me', authenticate, asyncAuthHandler(getMyBusinessPartners));

// Admin: pending applications queue.
businessPartnerRouter.get(
  '/pending',
  authenticate,
  authorizeRoles('admin'),
  paginationMiddleware(),
  asyncAuthHandler(getPendingBusinessPartners)
);

// Public profile lookup by slug (approved + active only).
businessPartnerRouter.get('/slug/:slug', getBusinessPartnerBySlug);

// Owner/admin/public (if approved) lookup by id.
businessPartnerRouter.get('/:businessPartnerId', getBusinessPartnerById);

businessPartnerRouter.patch(
  '/:businessPartnerId',
  authenticate,
  uploadBusinessDocs,
  asyncAuthHandler(updateMyBusinessPartner)
);

businessPartnerRouter.patch(
  '/:businessPartnerId/targeting',
  authenticate,
  asyncAuthHandler(updateBusinessPartnerTargeting)
);

businessPartnerRouter.patch(
  '/:businessPartnerId/approve',
  authenticate,
  authorizeRoles('admin'),
  asyncAuthHandler(approveBusinessPartner)
);

businessPartnerRouter.patch(
  '/:businessPartnerId/reject',
  authenticate,
  authorizeRoles('admin'),
  asyncAuthHandler(rejectBusinessPartner)
);

businessPartnerRouter.delete(
  '/:businessPartnerId',
  authenticate,
  asyncAuthHandler(deleteBusinessPartner)
);

// Nested reviews (mirrors /tours/:tourId/reviews).
businessPartnerRouter.get('/:businessPartnerId/reviews', getBusinessReviews);
businessPartnerRouter.post('/:businessPartnerId/reviews', authenticate, addBusinessReview);

// Public: "tours featuring this partner" reverse lookup for the profile page.
businessPartnerRouter.get('/:businessPartnerId/tours', getToursFeaturingBusinessPartner);

// Capacity & per-date itinerary-request confirmation (owner-or-admin gated
// inside each controller — see capacityController.ts).
businessPartnerRouter.get('/:businessPartnerId/capacity', authenticate, asyncAuthHandler(getMyCapacity));
businessPartnerRouter.patch('/:businessPartnerId/capacity', authenticate, asyncAuthHandler(updateMyCapacity));
businessPartnerRouter.get('/:businessPartnerId/capacity/available', authenticate, asyncAuthHandler(getAvailableCapacityForDate));
businessPartnerRouter.get('/:businessPartnerId/capacity/overrides', authenticate, asyncAuthHandler(getCapacityOverrides));
businessPartnerRouter.put('/:businessPartnerId/capacity/overrides/:date', authenticate, asyncAuthHandler(setCapacityOverride));
businessPartnerRouter.get('/:businessPartnerId/requests', authenticate, paginationMiddleware(), asyncAuthHandler(getMyItineraryRequests));
businessPartnerRouter.patch('/:businessPartnerId/requests/:requestId', authenticate, asyncAuthHandler(respondToItineraryRequest));

// Named unit types (hotel room types today; transport vehicle types reuse
// this later) with per-date channel blocks — owner-or-admin gated inside
// each controller except the list, which any authenticated user can read
// (powers the agency's picker dropdown too — see unitTypeController.ts).
businessPartnerRouter.get('/:businessPartnerId/unit-types', authenticate, asyncAuthHandler(getUnitTypes));
businessPartnerRouter.post('/:businessPartnerId/unit-types', authenticate, asyncAuthHandler(createUnitType));
businessPartnerRouter.patch('/:businessPartnerId/unit-types/:unitTypeId', authenticate, asyncAuthHandler(updateUnitType));
businessPartnerRouter.delete('/:businessPartnerId/unit-types/:unitTypeId', authenticate, asyncAuthHandler(deleteUnitType));
businessPartnerRouter.get('/:businessPartnerId/unit-types/:unitTypeId/inventory', authenticate, asyncAuthHandler(getUnitTypeInventory));
businessPartnerRouter.put('/:businessPartnerId/unit-types/:unitTypeId/blocks/:date', authenticate, asyncAuthHandler(setUnitTypeBlock));
businessPartnerRouter.get('/:businessPartnerId/unit-types/:unitTypeId/blocks', authenticate, asyncAuthHandler(getUnitTypeBlocks));

export default businessPartnerRouter;
