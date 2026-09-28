import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { db, paxPresets, discountPresets, pricingOptionPresets, datePresets, contentPresets, itineraryPresets, tourTemplatePresets } from '@tourbnt/db';
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

// ============================================
// DATE PRESETS
// ============================================

export const getDatePresets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const rows = await db.select().from(datePresets).where(eq(datePresets.userId, userId));
    sendSuccess(res, rows.map(withMongoStyleId), 'Date presets retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createDatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, type, config, recurrence, defaultSelectedPricingOptions, tags } = req.body;
    if (!name) return next(createHttpError(400, 'Preset name is required'));

    const [row] = await db
      .insert(datePresets)
      .values({
        userId,
        name,
        type: ['flexible', 'fixed', 'multiple'].includes(type) ? type : 'flexible',
        config: config ?? {},
        recurrence: recurrence ?? null,
        defaultSelectedPricingOptions: defaultSelectedPricingOptions ?? [],
        tags: tags ?? [],
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Date preset created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const getDatePresetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db.select().from(datePresets).where(and(eq(datePresets.id, presetId), eq(datePresets.userId, userId)));
    if (!row) return next(createHttpError(404, 'Date preset not found'));

    sendSuccess(res, withMongoStyleId(row), 'Date preset retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updateDatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, type, config, recurrence, defaultSelectedPricingOptions, tags } = req.body;
    const [row] = await db
      .update(datePresets)
      .set({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type: ['flexible', 'fixed', 'multiple'].includes(type) ? type : 'flexible' }),
        ...(config !== undefined && { config }),
        ...(recurrence !== undefined && { recurrence }),
        ...(defaultSelectedPricingOptions !== undefined && { defaultSelectedPricingOptions }),
        ...(tags !== undefined && { tags }),
        updatedAt: new Date(),
      })
      .where(and(eq(datePresets.id, presetId), eq(datePresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Date preset not found'));
    sendSuccess(res, withMongoStyleId(row), 'Date preset updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteDatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    await db.delete(datePresets).where(and(eq(datePresets.id, presetId), eq(datePresets.userId, userId)));
    sendSuccess(res, null, 'Date preset deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const duplicateDatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [original] = await db.select().from(datePresets).where(and(eq(datePresets.id, presetId), eq(datePresets.userId, userId)));
    if (!original) return next(createHttpError(404, 'Date preset not found'));

    const [row] = await db
      .insert(datePresets)
      .values({
        userId,
        name: `${original.name} (Copy)`,
        type: original.type as 'flexible' | 'fixed' | 'multiple',
        config: original.config,
        recurrence: original.recurrence,
        defaultSelectedPricingOptions: original.defaultSelectedPricingOptions,
        tags: original.tags,
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Date preset duplicated successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const applyDatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db
      .update(datePresets)
      .set({ usageCount: sql`${datePresets.usageCount} + 1` })
      .where(and(eq(datePresets.id, presetId), eq(datePresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Date preset not found'));
    const config = (row.config ?? {}) as Record<string, unknown>;
    sendSuccess(res, {
      tourDates: {
        type: row.type,
        days: config.defaultDays,
        nights: config.defaultNights,
        capacity: config.defaultCapacity,
        dateRange: config.dateRange,
        departures: config.departures,
        recurrence: row.recurrence ?? undefined,
      },
    }, 'Date preset applied successfully');
  } catch (err) {
    next(err);
  }
};

// ============================================
// CONTENT PRESETS
// ============================================

export const getContentPresets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const rows = await db.select().from(contentPresets).where(eq(contentPresets.userId, userId));
    sendSuccess(res, rows.map(withMongoStyleId), 'Content presets retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createContentPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, description, contentType, content, tags } = req.body;
    if (!name) return next(createHttpError(400, 'Preset name is required'));

    const [row] = await db
      .insert(contentPresets)
      .values({
        userId,
        name,
        description: description ?? null,
        contentType: ['description', 'include', 'exclude', 'outline'].includes(contentType) ? contentType : 'description',
        content: content ?? null,
        tags: tags ?? [],
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Content preset created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const getContentPresetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db.select().from(contentPresets).where(and(eq(contentPresets.id, presetId), eq(contentPresets.userId, userId)));
    if (!row) return next(createHttpError(404, 'Content preset not found'));

    sendSuccess(res, withMongoStyleId(row), 'Content preset retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updateContentPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, description, contentType, content, tags } = req.body;
    const [row] = await db
      .update(contentPresets)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(contentType !== undefined && { contentType: ['description', 'include', 'exclude', 'outline'].includes(contentType) ? contentType : 'description' }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags }),
        updatedAt: new Date(),
      })
      .where(and(eq(contentPresets.id, presetId), eq(contentPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Content preset not found'));
    sendSuccess(res, withMongoStyleId(row), 'Content preset updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteContentPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    await db.delete(contentPresets).where(and(eq(contentPresets.id, presetId), eq(contentPresets.userId, userId)));
    sendSuccess(res, null, 'Content preset deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const duplicateContentPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [original] = await db.select().from(contentPresets).where(and(eq(contentPresets.id, presetId), eq(contentPresets.userId, userId)));
    if (!original) return next(createHttpError(404, 'Content preset not found'));

    const [row] = await db
      .insert(contentPresets)
      .values({
        userId,
        name: `${original.name} (Copy)`,
        description: original.description,
        contentType: original.contentType as 'description' | 'include' | 'exclude' | 'outline',
        content: original.content,
        tags: original.tags,
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Content preset duplicated successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const applyContentPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db
      .update(contentPresets)
      .set({ usageCount: sql`${contentPresets.usageCount} + 1` })
      .where(and(eq(contentPresets.id, presetId), eq(contentPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Content preset not found'));
    sendSuccess(res, {
      [row.contentType]: row.content,
      content: row.content,
    }, 'Content preset applied successfully');
  } catch (err) {
    next(err);
  }
};

// ============================================
// ITINERARY PRESETS
// ============================================

export const getItineraryPresets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const rows = await db.select().from(itineraryPresets).where(eq(itineraryPresets.userId, userId));
    sendSuccess(res, rows.map(withMongoStyleId), 'Itinerary presets retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createItineraryPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, description, days, nights, itinerary, outline, tags } = req.body;
    if (!name) return next(createHttpError(400, 'Preset name is required'));

    const [row] = await db
      .insert(itineraryPresets)
      .values({
        userId,
        name,
        description: description ?? null,
        days: days ?? 1,
        nights: nights ?? 0,
        itinerary: itinerary ?? [],
        outline: outline ?? null,
        tags: tags ?? [],
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Itinerary preset created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const getItineraryPresetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db.select().from(itineraryPresets).where(and(eq(itineraryPresets.id, presetId), eq(itineraryPresets.userId, userId)));
    if (!row) return next(createHttpError(404, 'Itinerary preset not found'));

    sendSuccess(res, withMongoStyleId(row), 'Itinerary preset retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updateItineraryPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name, description, days, nights, itinerary, outline, tags } = req.body;
    const [row] = await db
      .update(itineraryPresets)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(days !== undefined && { days }),
        ...(nights !== undefined && { nights }),
        ...(itinerary !== undefined && { itinerary }),
        ...(outline !== undefined && { outline }),
        ...(tags !== undefined && { tags }),
        updatedAt: new Date(),
      })
      .where(and(eq(itineraryPresets.id, presetId), eq(itineraryPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Itinerary preset not found'));
    sendSuccess(res, withMongoStyleId(row), 'Itinerary preset updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteItineraryPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    await db.delete(itineraryPresets).where(and(eq(itineraryPresets.id, presetId), eq(itineraryPresets.userId, userId)));
    sendSuccess(res, null, 'Itinerary preset deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const duplicateItineraryPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [original] = await db.select().from(itineraryPresets).where(and(eq(itineraryPresets.id, presetId), eq(itineraryPresets.userId, userId)));
    if (!original) return next(createHttpError(404, 'Itinerary preset not found'));

    const [row] = await db
      .insert(itineraryPresets)
      .values({
        userId,
        name: `${original.name} (Copy)`,
        description: original.description,
        days: original.days,
        nights: original.nights,
        itinerary: original.itinerary,
        outline: original.outline,
        tags: original.tags,
      })
      .returning();

    sendSuccess(res, withMongoStyleId(row), 'Itinerary preset duplicated successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const applyItineraryPreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db
      .update(itineraryPresets)
      .set({ usageCount: sql`${itineraryPresets.usageCount} + 1` })
      .where(and(eq(itineraryPresets.id, presetId), eq(itineraryPresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Itinerary preset not found'));
    sendSuccess(res, {
      itinerary: row.itinerary,
      outline: row.outline ?? undefined,
    }, 'Itinerary preset applied successfully');
  } catch (err) {
    next(err);
  }
};

// ============================================
// TOUR TEMPLATE PRESETS
// ============================================

export const getTourTemplatePresets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const rows = await db.select().from(tourTemplatePresets).where(eq(tourTemplatePresets.userId, userId));
    sendSuccess(res, rows.map(withMongoStyleId), 'Tour template presets retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const TOUR_TEMPLATE_FIELDS = [
  'name', 'description', 'thumbnail',
  'defaultCategoryId', 'defaultDestinationId',
  'pricingPresetId', 'discountPresetId', 'paxPresetId', 'datePresetId', 'itineraryPresetId',
  'descriptionPresetId', 'includePresetId', 'excludePresetId',
  'defaultFactIds', 'defaultFaqIds', 'defaultGalleryIds', 'tourDefaults', 'tags',
] as const;

export const createTourTemplatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const { name } = req.body;
    if (!name) return next(createHttpError(400, 'Preset name is required'));

    const values: Record<string, unknown> = { userId };
    for (const field of TOUR_TEMPLATE_FIELDS) {
      if (req.body[field] !== undefined) values[field] = req.body[field];
    }

    const [row] = await db.insert(tourTemplatePresets).values(values as typeof tourTemplatePresets.$inferInsert).returning();
    sendSuccess(res, withMongoStyleId(row), 'Tour template preset created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const getTourTemplatePresetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db.select().from(tourTemplatePresets).where(and(eq(tourTemplatePresets.id, presetId), eq(tourTemplatePresets.userId, userId)));
    if (!row) return next(createHttpError(404, 'Tour template preset not found'));

    sendSuccess(res, withMongoStyleId(row), 'Tour template preset retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updateTourTemplatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const values: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of TOUR_TEMPLATE_FIELDS) {
      if (req.body[field] !== undefined) values[field] = req.body[field];
    }

    const [row] = await db
      .update(tourTemplatePresets)
      .set(values)
      .where(and(eq(tourTemplatePresets.id, presetId), eq(tourTemplatePresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Tour template preset not found'));
    sendSuccess(res, withMongoStyleId(row), 'Tour template preset updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteTourTemplatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    await db.delete(tourTemplatePresets).where(and(eq(tourTemplatePresets.id, presetId), eq(tourTemplatePresets.userId, userId)));
    sendSuccess(res, null, 'Tour template preset deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const duplicateTourTemplatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [original] = await db.select().from(tourTemplatePresets).where(and(eq(tourTemplatePresets.id, presetId), eq(tourTemplatePresets.userId, userId)));
    if (!original) return next(createHttpError(404, 'Tour template preset not found'));

    const values: Record<string, unknown> = { userId, name: `${original.name} (Copy)` };
    for (const field of TOUR_TEMPLATE_FIELDS) {
      if (field === 'name') continue;
      values[field] = (original as Record<string, unknown>)[field];
    }

    const [row] = await db.insert(tourTemplatePresets).values(values as typeof tourTemplatePresets.$inferInsert).returning();
    sendSuccess(res, withMongoStyleId(row), 'Tour template preset duplicated successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const applyTourTemplatePreset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, presetId } = req.params;
    if (!canAccess(req, userId)) return next(createHttpError(403, 'Forbidden'));

    const [row] = await db
      .update(tourTemplatePresets)
      .set({ usageCount: sql`${tourTemplatePresets.usageCount} + 1` })
      .where(and(eq(tourTemplatePresets.id, presetId), eq(tourTemplatePresets.userId, userId)))
      .returning();

    if (!row) return next(createHttpError(404, 'Tour template preset not found'));
    sendSuccess(res, {
      pricingPresetId: row.pricingPresetId ?? undefined,
      datePresetId: row.datePresetId ?? undefined,
      paxPresetId: row.paxPresetId ?? undefined,
      discountPresetId: row.discountPresetId ?? undefined,
      itineraryPresetId: row.itineraryPresetId ?? undefined,
      descriptionPresetId: row.descriptionPresetId ?? undefined,
      includePresetId: row.includePresetId ?? undefined,
      excludePresetId: row.excludePresetId ?? undefined,
      defaultCategoryId: row.defaultCategoryId ?? undefined,
      defaultDestinationId: row.defaultDestinationId ?? undefined,
      tourDefaults: row.tourDefaults ?? undefined,
    }, 'Tour template preset applied successfully');
  } catch (err) {
    next(err);
  }
};
