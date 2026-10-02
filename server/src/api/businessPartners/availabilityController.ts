import { Request, Response, NextFunction } from 'express';
import { db, businessPartnerAvailabilityBlocks } from '../../db';
import { eq } from 'drizzle-orm';
import { sendSuccess, sendValidationError, sendNotFoundError, sendForbiddenError, handleUnauthorized } from '../../utils/apiResponse';
import { ItineraryRequestService } from '../tours/services/itineraryRequestService';
import { assertOwnerOrAdmin } from './capacityController';

// GET /business-partners/:businessPartnerId/availability-blocks?date=
export const getAvailabilityBlocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business\'s availability');

    const { date } = req.query as { date?: string };
    const blocks = await ItineraryRequestService.getAvailabilityBlocks(businessPartnerId, date);
    return sendSuccess(res, blocks, 'Availability blocks retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// POST /business-partners/:businessPartnerId/availability-blocks
export const createAvailabilityBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to manage this business\'s availability');

    const { date, startTime, endTime, reason } = req.body as { date?: string; startTime?: string; endTime?: string; reason?: string };
    if (!date || !startTime || !endTime) {
      return sendValidationError(res, 'Validation failed', [{ field: 'date/startTime/endTime', message: 'date, startTime, and endTime are all required' }]);
    }
    if (startTime >= endTime) {
      return sendValidationError(res, 'Validation failed', [{ field: 'endTime', message: 'endTime must be after startTime' }]);
    }

    const created = await ItineraryRequestService.setAvailabilityBlock(businessPartnerId, date, startTime, endTime, reason);
    return sendSuccess(res, created, 'Availability block created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// DELETE /business-partners/:businessPartnerId/availability-blocks/:blockId
export const deleteAvailabilityBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId, blockId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to manage this business\'s availability');

    const [existing] = await db.select().from(businessPartnerAvailabilityBlocks).where(eq(businessPartnerAvailabilityBlocks.id, blockId)).limit(1);
    if (!existing || existing.businessPartnerId !== businessPartnerId) return sendNotFoundError(res, 'Availability block not found');

    await ItineraryRequestService.deleteAvailabilityBlock(blockId);
    return sendSuccess(res, null, 'Availability block deleted successfully');
  } catch (error) {
    next(error);
  }
};
