import { Request, Response, NextFunction } from 'express';
import {
  db,
  businessPartners,
  businessPartnerCapacity,
  businessPartnerCapacityOverrides,
  itineraryPartnerRequests,
  tours,
} from '@tourbnt/db';
import { eq, and, desc, count } from 'drizzle-orm';
import { sendSuccess, sendPaginatedResponse, sendValidationError, sendNotFoundError, sendForbiddenError, handleUnauthorized } from '../../utils/apiResponse';
import { ItineraryRequestService } from '../tours/services/itineraryRequestService';

const DEFAULT_UNIT_LABEL: Record<string, string> = {
  hotel: 'room',
  guesthouse: 'room',
  restaurant: 'seat',
  transport: 'seat',
  guide: 'slot',
  advertiser: 'unit',
};

async function assertOwnerOrAdmin(businessPartnerId: string, req: Request): Promise<boolean> {
  const isAdmin = req.user?.roles?.includes('admin') ?? false;
  if (isAdmin) return true;
  const [partner] = await db.select({ ownerId: businessPartners.ownerId }).from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
  return !!partner && partner.ownerId === req.user?.id;
}

// GET /business-partners/:businessPartnerId/capacity
export const getMyCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const [partner] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!partner) return sendNotFoundError(res, 'Business not found');
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business\'s capacity');

    const [capacity] = await db.select().from(businessPartnerCapacity).where(eq(businessPartnerCapacity.businessPartnerId, businessPartnerId)).limit(1);
    return sendSuccess(res, capacity ?? {
      businessPartnerId,
      unitLabel: DEFAULT_UNIT_LABEL[partner.type] ?? 'unit',
      defaultDailyCapacity: 0,
    }, 'Capacity retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// PATCH /business-partners/:businessPartnerId/capacity
export const updateMyCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to update this business\'s capacity');

    const { unitLabel, defaultDailyCapacity } = req.body as { unitLabel?: string; defaultDailyCapacity?: number };
    if (defaultDailyCapacity !== undefined && (typeof defaultDailyCapacity !== 'number' || defaultDailyCapacity < 0)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'defaultDailyCapacity', message: 'Must be a non-negative number' }]);
    }

    const [updated] = await db.insert(businessPartnerCapacity).values({
      businessPartnerId,
      unitLabel: unitLabel || 'unit',
      defaultDailyCapacity: defaultDailyCapacity ?? 0,
    }).onConflictDoUpdate({
      target: businessPartnerCapacity.businessPartnerId,
      set: {
        ...(unitLabel !== undefined && { unitLabel }),
        ...(defaultDailyCapacity !== undefined && { defaultDailyCapacity }),
        updatedAt: new Date(),
      },
    }).returning();

    return sendSuccess(res, updated, 'Capacity updated successfully');
  } catch (error) {
    next(error);
  }
};

// GET /business-partners/:businessPartnerId/capacity/overrides
export const getCapacityOverrides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business\'s capacity');

    const overrides = await db.select().from(businessPartnerCapacityOverrides)
      .where(eq(businessPartnerCapacityOverrides.businessPartnerId, businessPartnerId))
      .orderBy(businessPartnerCapacityOverrides.date);
    return sendSuccess(res, overrides, 'Capacity overrides retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// PUT /business-partners/:businessPartnerId/capacity/overrides/:date
export const setCapacityOverride = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId, date } = req.params;
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to update this business\'s capacity');

    const { capacity } = req.body as { capacity?: number };
    if (typeof capacity !== 'number' || capacity < 0) {
      return sendValidationError(res, 'Validation failed', [{ field: 'capacity', message: 'Must be a non-negative number' }]);
    }

    const [updated] = await db.insert(businessPartnerCapacityOverrides).values({
      businessPartnerId,
      date,
      capacity,
    }).onConflictDoUpdate({
      target: [businessPartnerCapacityOverrides.businessPartnerId, businessPartnerCapacityOverrides.date],
      set: { capacity, updatedAt: new Date() },
    }).returning();

    return sendSuccess(res, updated, 'Capacity override saved successfully');
  } catch (error) {
    next(error);
  }
};

// GET /business-partners/:businessPartnerId/requests?status=pending
export const getMyItineraryRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business\'s requests');

    const { status } = req.query as { status?: string };
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;

    const conditions = [eq(itineraryPartnerRequests.businessPartnerId, businessPartnerId)];
    if (status && ['pending', 'confirmed', 'declined'].includes(status)) {
      conditions.push(eq(itineraryPartnerRequests.status, status as 'pending' | 'confirmed' | 'declined'));
    }
    const where = and(...conditions);

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select({ request: itineraryPartnerRequests, tourTitle: tours.title, tourId: tours.id })
        .from(itineraryPartnerRequests)
        .innerJoin(tours, eq(itineraryPartnerRequests.tourId, tours.id))
        .where(where)
        .orderBy(desc(itineraryPartnerRequests.serviceDate))
        .limit(pageLimit)
        .offset(skip),
      db.select({ value: count() }).from(itineraryPartnerRequests).where(where),
    ]);

    const items = rows.map(({ request, tourTitle, tourId }) => ({ ...request, tour: { id: tourId, title: tourTitle } }));

    return sendPaginatedResponse(res, items, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Itinerary requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// PATCH /business-partners/:businessPartnerId/requests/:requestId
export const respondToItineraryRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { requestId } = req.params;
    const { status, capacityConfirmed, notes } = req.body as { status?: 'confirmed' | 'declined'; capacityConfirmed?: number; notes?: string };

    if (!status || !['confirmed', 'declined'].includes(status)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'status', message: 'status must be "confirmed" or "declined"' }]);
    }

    const isAdmin = req.user.roles?.includes('admin') ?? false;
    const updated = await ItineraryRequestService.respondToRequest(requestId, { id: req.user.id, isAdmin }, status, capacityConfirmed, notes);

    return sendSuccess(res, updated, `Request ${status} successfully`);
  } catch (error) {
    next(error);
  }
};

// GET /business-partners/:businessPartnerId/available-capacity?date=YYYY-MM-DD
export const getAvailableCapacityForDate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    const { date } = req.query as { date?: string };
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business\'s capacity');
    if (!date) return sendValidationError(res, 'Validation failed', [{ field: 'date', message: 'date is required' }]);

    const available = await ItineraryRequestService.getAvailableCapacity(businessPartnerId, date);
    return sendSuccess(res, { date, available }, 'Available capacity retrieved successfully');
  } catch (error) {
    next(error);
  }
};
