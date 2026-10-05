import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendValidationError, handleUnauthorized, sendForbiddenError } from '../../utils/apiResponse';
import { assertOwnerOrAdmin } from './capacityController';
import { OpenSlotService } from '../tours/services/openSlotService';

function requester(req: Request) {
  return { id: req.user!.id, isAdmin: req.user?.roles?.includes('admin') ?? false };
}

// GET /business-partners/:businessPartnerId/open-slots
export const listPartnerOpenSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business');
    const slots = await OpenSlotService.listForPartner(businessPartnerId);
    return sendSuccess(res, slots, 'Open dates retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// POST /business-partners/:businessPartnerId/open-slots/:linkId/apply
export const applyToOpenSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId, linkId } = req.params;
    const { serviceDate, message, unitsOffered } = req.body as { serviceDate?: string; message?: string; unitsOffered?: number };
    if (!serviceDate) return sendValidationError(res, 'Validation failed', [{ field: 'serviceDate', message: 'serviceDate is required' }]);
    const created = await OpenSlotService.apply(businessPartnerId, linkId, requester(req), { serviceDate, message, unitsOffered });
    return sendSuccess(res, created, 'Application sent', 201);
  } catch (error) {
    next(error);
  }
};

// POST /business-partners/:businessPartnerId/requests/:requestId/withdraw
export const withdrawConfirmedRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId, requestId } = req.params;
    const { explanation } = req.body as { explanation?: string };
    if (!explanation || !explanation.trim()) {
      return sendValidationError(res, 'Validation failed', [{ field: 'explanation', message: 'Explain why this approved deal is being cancelled' }]);
    }
    const result = await OpenSlotService.withdrawConfirmed(businessPartnerId, requestId, requester(req), explanation);
    return sendSuccess(res, result, 'Approved deal withdrawn');
  } catch (error) {
    next(error);
  }
};

// GET /business-partners/:businessPartnerId/withdrawal-status
export const getWithdrawalStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business');
    const status = await OpenSlotService.withdrawalStatus(businessPartnerId, requester(req));
    return sendSuccess(res, status, 'Withdrawal status retrieved');
  } catch (error) {
    next(error);
  }
};

// POST /business-partners/:businessPartnerId/withdrawal-evidence
export const submitWithdrawalEvidence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId } = req.params;
    const { explanation } = req.body as { explanation?: string };
    if (!explanation || !explanation.trim()) {
      return sendValidationError(res, 'Validation failed', [{ field: 'explanation', message: 'A written explanation is required' }]);
    }
    const result = await OpenSlotService.submitWithdrawalEvidence(businessPartnerId, requester(req), explanation);
    return sendSuccess(res, result, result.restored ? 'Account restored' : 'Explanation recorded');
  } catch (error) {
    next(error);
  }
};

// GET /tours/:tourId/open-slots
export const listTourOpenSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const slots = await OpenSlotService.listForTour(req.params.tourId, requester(req));
    return sendSuccess(res, slots, 'Open slot applications retrieved');
  } catch (error) {
    next(error);
  }
};

// POST /tours/:tourId/open-applications/:applicationId/select
export const selectOpenApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const result = await OpenSlotService.selectApplication(req.params.applicationId, requester(req), req.params.tourId);
    return sendSuccess(res, result, 'Applicant selected');
  } catch (error) {
    next(error);
  }
};
