import { Request, Response, NextFunction } from 'express';
import { db, businessPartnerUnitTypes, businessPartnerUnitTypeBlocks } from '../../db';
import { eq, and } from 'drizzle-orm';
import { sendSuccess, sendValidationError, sendNotFoundError, sendForbiddenError, handleUnauthorized } from '../../utils/apiResponse';
import { ItineraryRequestService } from '../tours/services/itineraryRequestService';
import { assertOwnerOrAdmin } from './capacityController';

/** Postgres unique_violation (drizzle wraps it, so check the cause too). */
const isDuplicateError = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
};

const duplicateName = (res: Response) =>
  res.status(409).json({ success: false, message: 'A room/unit type with this name already exists for this business.' });

// GET /business-partners/:businessPartnerId/unit-types — open to any
// authenticated user: powers both the owner's management UI and the
// agency's room/vehicle-type picker when linking this partner to a day.
export const getUnitTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId } = req.params;
    const types = await db.select().from(businessPartnerUnitTypes)
      .where(and(eq(businessPartnerUnitTypes.businessPartnerId, businessPartnerId), eq(businessPartnerUnitTypes.isActive, true)))
      .orderBy(businessPartnerUnitTypes.sortOrder);
    return sendSuccess(res, types, 'Unit types retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// POST /business-partners/:businessPartnerId/unit-types
export const createUnitType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to manage this business\'s unit types');

    const { name, totalUnits, description, defaultTime } = req.body as { name?: string; totalUnits?: number; description?: string; defaultTime?: string };
    if (!name || !name.trim()) return sendValidationError(res, 'Validation failed', [{ field: 'name', message: 'name is required' }]);
    if (totalUnits !== undefined && (typeof totalUnits !== 'number' || totalUnits < 0)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'totalUnits', message: 'Must be a non-negative number' }]);
    }

    const [created] = await db.insert(businessPartnerUnitTypes).values({
      businessPartnerId,
      name: name.trim(),
      totalUnits: totalUnits ?? 0,
      description: description || null,
      defaultTime: defaultTime || null,
    }).returning();
    return sendSuccess(res, created, 'Unit type created successfully', 201);
  } catch (error) {
    if (isDuplicateError(error)) return duplicateName(res);
    next(error);
  }
};

// PATCH /business-partners/:businessPartnerId/unit-types/:unitTypeId
export const updateUnitType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId, unitTypeId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to manage this business\'s unit types');

    const [existing] = await db.select().from(businessPartnerUnitTypes).where(eq(businessPartnerUnitTypes.id, unitTypeId)).limit(1);
    if (!existing || existing.businessPartnerId !== businessPartnerId) return sendNotFoundError(res, 'Unit type not found');

    const { name, totalUnits, description, isActive, defaultTime } = req.body as { name?: string; totalUnits?: number; description?: string; isActive?: boolean; defaultTime?: string };
    if (totalUnits !== undefined && (typeof totalUnits !== 'number' || totalUnits < 0)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'totalUnits', message: 'Must be a non-negative number' }]);
    }

    const [updated] = await db.update(businessPartnerUnitTypes).set({
      ...(name !== undefined && { name: name.trim() }),
      ...(totalUnits !== undefined && { totalUnits }),
      ...(description !== undefined && { description: description || null }),
      ...(isActive !== undefined && { isActive }),
      ...(defaultTime !== undefined && { defaultTime: defaultTime || null }),
      updatedAt: new Date(),
    }).where(eq(businessPartnerUnitTypes.id, unitTypeId)).returning();
    return sendSuccess(res, updated, 'Unit type updated successfully');
  } catch (error) {
    if (isDuplicateError(error)) return duplicateName(res);
    next(error);
  }
};

// DELETE /business-partners/:businessPartnerId/unit-types/:unitTypeId
export const deleteUnitType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId, unitTypeId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to manage this business\'s unit types');

    const [existing] = await db.select().from(businessPartnerUnitTypes).where(eq(businessPartnerUnitTypes.id, unitTypeId)).limit(1);
    if (!existing || existing.businessPartnerId !== businessPartnerId) return sendNotFoundError(res, 'Unit type not found');

    const result = await ItineraryRequestService.deleteUnitType(unitTypeId);
    if (result.blocked) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${result.liveRequestCount} live request(s) and ${result.linkCount} itinerary link(s) still reference this unit type. Remove them first.`,
        data: result,
      });
    }
    return sendSuccess(res, null, 'Unit type deleted successfully');
  } catch (error) {
    next(error);
  }
};

async function unitTypeBelongsTo(unitTypeId: string, businessPartnerId: string): Promise<boolean> {
  const [row] = await db.select({ bp: businessPartnerUnitTypes.businessPartnerId }).from(businessPartnerUnitTypes).where(eq(businessPartnerUnitTypes.id, unitTypeId)).limit(1);
  return row?.bp === businessPartnerId;
}

// GET /business-partners/:businessPartnerId/unit-types/:unitTypeId/inventory?from=&to=
export const getUnitTypeInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId, unitTypeId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business\'s inventory');
    // The unit type must belong to this business, or an owner could reach another business's inventory.
    if (!(await unitTypeBelongsTo(unitTypeId, businessPartnerId))) return sendNotFoundError(res, 'Unit type not found');

    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) return sendValidationError(res, 'Validation failed', [{ field: 'from/to', message: 'from and to dates are required' }]);

    const inventory = await ItineraryRequestService.getUnitTypeInventory(unitTypeId, from, to);
    return sendSuccess(res, inventory, 'Inventory retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// PUT /business-partners/:businessPartnerId/unit-types/:unitTypeId/blocks/:date
export const setUnitTypeBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId, unitTypeId, date } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to manage this business\'s inventory');
    // The unit type must belong to this business, or an owner could reach another business's inventory.
    if (!(await unitTypeBelongsTo(unitTypeId, businessPartnerId))) return sendNotFoundError(res, 'Unit type not found');

    const { channel, blockedCount, notes } = req.body as { channel?: 'direct' | 'private' | 'other' | 'maintenance'; blockedCount?: number; notes?: string };
    if (!channel || !['direct', 'private', 'other', 'maintenance'].includes(channel)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'channel', message: 'channel must be direct, private, other, or maintenance' }]);
    }
    if (typeof blockedCount !== 'number' || blockedCount < 0) {
      return sendValidationError(res, 'Validation failed', [{ field: 'blockedCount', message: 'Must be a non-negative number' }]);
    }

    const [updated] = await db.insert(businessPartnerUnitTypeBlocks).values({
      unitTypeId, date, channel, blockedCount, notes: notes || null,
    }).onConflictDoUpdate({
      target: [businessPartnerUnitTypeBlocks.unitTypeId, businessPartnerUnitTypeBlocks.date, businessPartnerUnitTypeBlocks.channel],
      set: { blockedCount, notes: notes || null, updatedAt: new Date() },
    }).returning();
    return sendSuccess(res, updated, 'Block saved successfully');
  } catch (error) {
    next(error);
  }
};

// GET /business-partners/:businessPartnerId/unit-types/:unitTypeId/blocks?date=
export const getUnitTypeBlocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return handleUnauthorized(res, 'Not authenticated');
    const { businessPartnerId, unitTypeId } = req.params;
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) return sendForbiddenError(res, 'Not authorized to view this business\'s inventory');
    // The unit type must belong to this business, or an owner could reach another business's inventory.
    if (!(await unitTypeBelongsTo(unitTypeId, businessPartnerId))) return sendNotFoundError(res, 'Unit type not found');

    const { date } = req.query as { date?: string };
    const conditions = [eq(businessPartnerUnitTypeBlocks.unitTypeId, unitTypeId)];
    if (date) conditions.push(eq(businessPartnerUnitTypeBlocks.date, date));

    const blocks = await db.select().from(businessPartnerUnitTypeBlocks).where(and(...conditions));
    return sendSuccess(res, blocks, 'Blocks retrieved successfully');
  } catch (error) {
    next(error);
  }
};
