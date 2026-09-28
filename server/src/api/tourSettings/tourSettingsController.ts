import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { db, paxPresets, discountPresets, pricingOptionPresets } from '@tourbnt/db';
import { eq, and, sql } from 'drizzle-orm';
import { sendSuccess, HTTP_STATUS } from '../../utils/apiResponse';

// A seller may only read/write their own presets; an admin may act on anyone's.
const canAccess = (req: Request, userId: string) =>
  req.user?.id === userId || !!req.user?.roles?.includes('admin');

const withMongoStyleId = <T extends { id: string }>(row: T) => ({ ...row, _id: row.id });

// ============================================
// PAX PRESETS
// ============================================

export const getPaxPresets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const rows = await db.select().from(paxPresets).where(eq(paxPresets.userId, userId));
    sendSuccess(res, rows.map(withMongoStyleId), 'Pax presets retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createPaxPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, minSize, maxSize, pricePerPerson, groupSize, defaultPricingOptionId, tags } = req.body;
    if (!name) return next(createHttpError(400, 'Preset name is required'));

    const [row] = await db
      .insert(paxPresets)
      .values({
        userId,
        name,
        minSize: minSize ?? 1,
        maxSize: maxSize ?? 10,
        pricePerPerson: pricePerPerson ?? true,
        groupSize: groupSize ?? null,
        defaultPricingOptionId: defaultPricingOptionId ?? null,
        tags: tags ?? [],
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Pax preset created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const getPaxPresetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db.select().from(paxPresets).where(and(eq(paxPresets.id, presetId), eq(paxPresets.userId, userId)));
    if (!row) return next(createHttpError(404, 'Pax preset not found'));

    sendSuccess(res, withMongoStyleId(row), 'Pax preset retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updatePaxPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, minSize, maxSize, pricePerPerson, groupSize, defaultPricingOptionId, tags } = req.body;
    const [row] = await db
      .update(paxPresets)
      .set({
        ...(name !== undefined && { name }),
        ...(minSize !== undefined && { minSize }),
        ...(maxSize !== undefined && { maxSize }),
        ...(pricePerPerson !== undefined && { pricePerPerson }),
        ...(groupSize !== undefined && { groupSize }),
        ...(defaultPricingOptionId !== undefined && { defaultPricingOptionId }),
        ...(tags !== undefined && { tags }),
        updatedAt: new Date(),
      })
      .where(and(eq(paxPresets.id, presetId), eq(paxPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Pax preset not found'));
    sendSuccess(res, withMongoStyleId(row), 'Pax preset updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deletePaxPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    await db.delete(paxPresets).where(and(eq(paxPresets.id, presetId), eq(paxPresets.userId, userId)));
    sendSuccess(res, null, 'Pax preset deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const duplicatePaxPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [original] = await db.select().from(paxPresets).where(and(eq(paxPresets.id, presetId), eq(paxPresets.userId, userId)));
    if (!original) return next(createHttpError(404, 'Pax preset not found'));

    const [row] = await db
      .insert(paxPresets)
      .values({
        userId,
        name: `${original.name} (Copy)`,
        minSize: original.minSize,
        maxSize: original.maxSize,
        pricePerPerson: original.pricePerPerson,
        groupSize: original.groupSize,
        defaultPricingOptionId: original.defaultPricingOptionId,
        tags: original.tags,
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Pax preset duplicated successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const applyPaxPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db
      .update(paxPresets)
      .set({ usageCount: sql`${paxPresets.usageCount} + 1` })
      .where(and(eq(paxPresets.id, presetId), eq(paxPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Pax preset not found'));
    sendSuccess(res, {
      minSize: row.minSize,
      maxSize: row.maxSize,
      pricePerPerson: row.pricePerPerson,
      groupSize: row.groupSize ?? undefined,
    }, 'Pax preset applied successfully');
  } catch (err) {
    next(err);
  }
};

// ============================================
// DISCOUNT PRESETS
// ============================================

export const getDiscountPresets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const rows = await db.select().from(discountPresets).where(eq(discountPresets.userId, userId));
    sendSuccess(res, rows.map(withMongoStyleId), 'Discount presets retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createDiscountPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, type, value, dateRange, timezone, tags } = req.body;
    if (!name) return next(createHttpError(400, 'Preset name is required'));

    const [row] = await db
      .insert(discountPresets)
      .values({
        userId,
        name,
        type: type === 'price' ? 'price' : 'percentage',
        value: value ?? 0,
        dateRange: dateRange ?? null,
        timezone: timezone ?? null,
        tags: tags ?? [],
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Discount preset created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const getDiscountPresetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db.select().from(discountPresets).where(and(eq(discountPresets.id, presetId), eq(discountPresets.userId, userId)));
    if (!row) return next(createHttpError(404, 'Discount preset not found'));

    sendSuccess(res, withMongoStyleId(row), 'Discount preset retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updateDiscountPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, type, value, dateRange, timezone, tags } = req.body;
    const [row] = await db
      .update(discountPresets)
      .set({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type: type === 'price' ? 'price' : 'percentage' }),
        ...(value !== undefined && { value }),
        ...(dateRange !== undefined && { dateRange }),
        ...(timezone !== undefined && { timezone }),
        ...(tags !== undefined && { tags }),
        updatedAt: new Date(),
      })
      .where(and(eq(discountPresets.id, presetId), eq(discountPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Discount preset not found'));
    sendSuccess(res, withMongoStyleId(row), 'Discount preset updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteDiscountPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    await db.delete(discountPresets).where(and(eq(discountPresets.id, presetId), eq(discountPresets.userId, userId)));
    sendSuccess(res, null, 'Discount preset deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const duplicateDiscountPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [original] = await db.select().from(discountPresets).where(and(eq(discountPresets.id, presetId), eq(discountPresets.userId, userId)));
    if (!original) return next(createHttpError(404, 'Discount preset not found'));

    const [row] = await db
      .insert(discountPresets)
      .values({
        userId,
        name: `${original.name} (Copy)`,
        type: original.type as 'percentage' | 'price',
        value: original.value,
        dateRange: original.dateRange,
        timezone: original.timezone,
        tags: original.tags,
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Discount preset duplicated successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const applyDiscountPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { dateRange: overrideDateRange } = req.body || {};

    const [row] = await db
      .update(discountPresets)
      .set({ usageCount: sql`${discountPresets.usageCount} + 1` })
      .where(and(eq(discountPresets.id, presetId), eq(discountPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Discount preset not found'));
    sendSuccess(res, {
      type: row.type,
      value: row.value,
      dateRange: overrideDateRange ?? row.dateRange ?? undefined,
      discountEnabled: true,
    }, 'Discount preset applied successfully');
  } catch (err) {
    next(err);
  }
};

// ============================================
// PRICING OPTION PRESETS
// ============================================

export const getPricingPresets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const rows = await db.select().from(pricingOptionPresets).where(eq(pricingOptionPresets.userId, userId));
    sendSuccess(res, rows.map(withMongoStyleId), 'Pricing presets retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createPricingPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, options, tags } = req.body;
    if (!name) return next(createHttpError(400, 'Preset name is required'));

    const [row] = await db
      .insert(pricingOptionPresets)
      .values({
        userId,
        name,
        options: options ?? [],
        tags: tags ?? [],
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Pricing preset created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const getPricingPresetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db.select().from(pricingOptionPresets).where(and(eq(pricingOptionPresets.id, presetId), eq(pricingOptionPresets.userId, userId)));
    if (!row) return next(createHttpError(404, 'Pricing preset not found'));

    sendSuccess(res, withMongoStyleId(row), 'Pricing preset retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updatePricingPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, options, tags } = req.body;
    const [row] = await db
      .update(pricingOptionPresets)
      .set({
        ...(name !== undefined && { name }),
        ...(options !== undefined && { options }),
        ...(tags !== undefined && { tags }),
        updatedAt: new Date(),
      })
      .where(and(eq(pricingOptionPresets.id, presetId), eq(pricingOptionPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Pricing preset not found'));
    sendSuccess(res, withMongoStyleId(row), 'Pricing preset updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deletePricingPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    await db.delete(pricingOptionPresets).where(and(eq(pricingOptionPresets.id, presetId), eq(pricingOptionPresets.userId, userId)));
    sendSuccess(res, null, 'Pricing preset deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const duplicatePricingPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [original] = await db.select().from(pricingOptionPresets).where(and(eq(pricingOptionPresets.id, presetId), eq(pricingOptionPresets.userId, userId)));
    if (!original) return next(createHttpError(404, 'Pricing preset not found'));

    const [row] = await db
      .insert(pricingOptionPresets)
      .values({
        userId,
        name: `${original.name} (Copy)`,
        options: original.options,
        tags: original.tags,
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Pricing preset duplicated successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const applyPricingPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db
      .update(pricingOptionPresets)
      .set({ usageCount: sql`${pricingOptionPresets.usageCount} + 1` })
      .where(and(eq(pricingOptionPresets.id, presetId), eq(pricingOptionPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Pricing preset not found'));
    sendSuccess(res, {
      pricingOptions: row.options,
      pricingOptionsEnabled: true,
    }, 'Pricing preset applied successfully');
  } catch (err) {
    next(err);
  }
};
