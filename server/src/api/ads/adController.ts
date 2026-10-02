import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import {
  db,
  advertisements,
  adCategoryTargets,
  adDestinationTargets,
  adDailyStats,
  businessPartners,
  globalCategories,
  globalDestinations,
  adPlacementSlotEnum,
} from '@tourbnt/db';
import { eq, and, desc, count, inArray, gte, sql, type SQL } from 'drizzle-orm';
import { HTTP_STATUS, sendSuccess, sendPaginatedResponse, sendValidationError, sendNotFoundError, sendForbiddenError, handleUnauthorized } from '../../utils/apiResponse';
import * as notifications from '../notifications/notificationController';
import { uploadAdImage as uploadAdImageFile } from '../../services/adImageService';
import { claimOnce } from '../../config/redisClient';
import { findMatchingAds, invalidateLiveAds, resolveSearchContext, resolveTourContext, type AdContext } from './adTargeting';
import { addMonths, getAdPricing, normaliseAdOrder, priceAdOrder, updateAdPricing } from './adPricing';

type AdRow = typeof advertisements.$inferSelect;

const VALID_SLOTS = adPlacementSlotEnum.enumValues;
// One view/click per visitor per ad in this window counts toward stats and billing.
const DEDUPE_WINDOW_SECONDS = 30 * 60;

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function visitorKey(req: Request): string {
  // The LAST X-Forwarded-For entry is the one our own proxy appended; earlier entries are
  // whatever the client sent, and would let anyone dodge the dedupe and burn an advertiser's views.
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',').map((s) => s.trim()).filter(Boolean);
  const ip = forwarded?.[forwarded.length - 1] || (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || 'unknown';
  return createHash('sha1').update(`${ip}|${req.headers['user-agent'] ?? ''}`).digest('hex').slice(0, 20);
}

/** Accepts an array, a JSON array string (multipart forms) or a comma-separated string. */
function parseIdList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch { /* not JSON */ }
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function assertOwnerOrAdmin(businessPartnerId: string, req: Request): Promise<boolean> {
  const isAdmin = req.user?.roles?.includes('admin') ?? false;
  if (isAdmin) return true;
  const [partner] = await db.select({ ownerId: businessPartners.ownerId }).from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
  return !!partner && partner.ownerId === req.user?.id;
}

function isAdOwnerOrAdmin(ad: Pick<AdRow, 'businessPartnerId'>, req: Request) {
  return assertOwnerOrAdmin(ad.businessPartnerId, req);
}

async function syncAdCategoryTargets(adId: string, categoryIds: string[] | undefined) {
  if (categoryIds === undefined) return;
  await db.delete(adCategoryTargets).where(eq(adCategoryTargets.adId, adId));
  if (categoryIds.length > 0) {
    await db.insert(adCategoryTargets).values([...new Set(categoryIds)].map((categoryId) => ({ adId, categoryId })));
  }
}

async function syncAdDestinationTargets(adId: string, destinationIds: string[] | undefined) {
  if (destinationIds === undefined) return;
  await db.delete(adDestinationTargets).where(eq(adDestinationTargets.adId, adId));
  if (destinationIds.length > 0) {
    await db.insert(adDestinationTargets).values([...new Set(destinationIds)].map((destinationId) => ({ adId, destinationId })));
  }
}

/** Targets with names, for dashboards. */
async function loadTargets(adIds: string[]) {
  if (adIds.length === 0) return new Map<string, { categories: { id: string; name: string }[]; destinations: { id: string; name: string }[] }>();
  const [cats, dests] = await Promise.all([
    db.select({ adId: adCategoryTargets.adId, id: globalCategories.id, name: globalCategories.name })
      .from(adCategoryTargets).innerJoin(globalCategories, eq(adCategoryTargets.categoryId, globalCategories.id))
      .where(inArray(adCategoryTargets.adId, adIds)),
    db.select({ adId: adDestinationTargets.adId, id: globalDestinations.id, name: globalDestinations.name })
      .from(adDestinationTargets).innerJoin(globalDestinations, eq(adDestinationTargets.destinationId, globalDestinations.id))
      .where(inArray(adDestinationTargets.adId, adIds)),
  ]);
  const map = new Map<string, { categories: { id: string; name: string }[]; destinations: { id: string; name: string }[] }>();
  for (const id of adIds) map.set(id, { categories: [], destinations: [] });
  cats.forEach((c) => map.get(c.adId)!.categories.push({ id: c.id, name: c.name }));
  dests.forEach((d) => map.get(d.adId)!.destinations.push({ id: d.id, name: d.name }));
  return map;
}

/**
 * Once an ad is both approved and paid it goes live: its run period starts now (unless a
 * start date was set) and lasts the months bought.
 */
function goLiveFields(ad: AdRow, now: Date): Partial<AdRow> {
  const startDate = ad.startDate && ad.startDate > now ? ad.startDate : now;
  return {
    campaignStatus: 'active',
    startDate,
    endDate: ad.endDate ?? addMonths(startDate, ad.durationMonths),
  };
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export const getPricing = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await getAdPricing(), 'Ad pricing retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const putPricing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monthlyPrice = Number(req.body?.monthlyPrice);
    const pricePer100Views = Number(req.body?.pricePer100Views);
    if (!Number.isInteger(monthlyPrice) || monthlyPrice < 0 || !Number.isInteger(pricePer100Views) || pricePer100Views < 0) {
      return sendValidationError(res, 'Validation failed', [{ field: 'monthlyPrice/pricePer100Views', message: 'Prices must be whole numbers of 0 or more' }]);
    }
    const pricing = await updateAdPricing({ monthlyPrice, pricePer100Views }, req.user!.id);
    return sendSuccess(res, pricing, 'Ad pricing updated. New campaigns use these prices; existing ones keep theirs.');
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Campaigns (owner)
// ---------------------------------------------------------------------------

// Owner (or admin) creates an ad campaign for one of their businesses. It is priced from
// the current price list and goes to the admin review queue; it serves once approved and paid.
export const createAdCampaign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return handleUnauthorized(res, 'Not authenticated');

    const { businessPartnerId, title, description, ctaLabel, ctaUrl } = req.body;
    const placementSlot = req.body.placementSlot || 'tour_sidebar';

    if (!businessPartnerId || !title || !ctaUrl) {
      return sendValidationError(res, 'Validation failed', [
        { field: 'businessPartnerId/title/ctaUrl', message: 'businessPartnerId, title and ctaUrl are required' },
      ]);
    }
    if (!isHttpUrl(ctaUrl)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'ctaUrl', message: 'ctaUrl must be an http(s) link' }]);
    }
    if (!VALID_SLOTS.includes(placementSlot)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'placementSlot', message: `placementSlot must be one of: ${VALID_SLOTS.join(', ')}` }]);
    }
    const order = normaliseAdOrder(req.body);
    if (typeof order === 'string') return sendValidationError(res, 'Validation failed', [{ field: 'billing', message: order }]);
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) {
      return sendForbiddenError(res, 'Not authorized to create ads for this business');
    }

    const pricing = await getAdPricing();
    const file = req.file as Express.Multer.File | undefined;
    const imageUrl = file ? await uploadAdImageFile(file) : req.body.imageUrl;

    const [ad] = await db.insert(advertisements).values({
      businessPartnerId,
      title,
      description,
      imageUrl,
      ctaLabel,
      ctaUrl,
      placementSlot,
      ...order,
      priceAmount: priceAdOrder(order, pricing),
      currency: pricing.currency,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      approvalStatus: 'pending',
      submittedAt: new Date(),
    }).returning();

    await syncAdCategoryTargets(ad.id, parseIdList(req.body.categoryIds));
    await syncAdDestinationTargets(ad.id, parseIdList(req.body.destinationIds));

    return sendSuccess(res, ad, 'Ad campaign submitted for review', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const updateAdCampaign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [existing] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Ad not found');
    if (!(await isAdOwnerOrAdmin(existing, req))) return sendForbiddenError(res, 'Not authorized to update this ad');

    const { title, description, ctaLabel, ctaUrl, placementSlot, campaignStatus } = req.body;
    if (placementSlot && !VALID_SLOTS.includes(placementSlot)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'placementSlot', message: `placementSlot must be one of: ${VALID_SLOTS.join(', ')}` }]);
    }
    if (ctaUrl && !isHttpUrl(ctaUrl)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'ctaUrl', message: 'ctaUrl must be an http(s) link' }]);
    }
    if (campaignStatus && !['draft', 'active', 'paused', 'ended'].includes(campaignStatus)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'campaignStatus', message: 'Invalid campaignStatus' }]);
    }
    if (campaignStatus === 'active' && (existing.approvalStatus !== 'approved' || !existing.isPaid)) {
      return sendValidationError(res, 'An ad campaign can only be activated once it is approved and paid');
    }
    if (campaignStatus === 'active' && existing.endDate && existing.endDate < new Date()) {
      return sendValidationError(res, 'This campaign has finished its run period');
    }

    // What was bought can only change before it is paid for.
    const changesBilling = ['billingModel', 'durationMonths', 'viewQuota'].some((k) => req.body[k] !== undefined);
    let billing: Partial<AdRow> = {};
    if (changesBilling) {
      if (existing.isPaid) return sendValidationError(res, 'Billing cannot be changed after the campaign is paid');
      const order = normaliseAdOrder({
        billingModel: req.body.billingModel ?? existing.billingModel,
        durationMonths: req.body.durationMonths ?? existing.durationMonths,
        viewQuota: req.body.viewQuota ?? existing.viewQuota,
      });
      if (typeof order === 'string') return sendValidationError(res, 'Validation failed', [{ field: 'billing', message: order }]);
      const pricing = await getAdPricing();
      billing = { ...order, priceAmount: priceAdOrder(order, pricing), currency: pricing.currency };
    }

    const file = req.file as Express.Multer.File | undefined;
    const imageUrl = file ? await uploadAdImageFile(file) : req.body.imageUrl;

    const [updated] = await db.update(advertisements).set({
      title: title ?? existing.title,
      description: description ?? existing.description,
      imageUrl: imageUrl ?? existing.imageUrl,
      ctaLabel: ctaLabel ?? existing.ctaLabel,
      ctaUrl: ctaUrl ?? existing.ctaUrl,
      placementSlot: placementSlot ?? existing.placementSlot,
      campaignStatus: campaignStatus ?? existing.campaignStatus,
      ...billing,
      updatedAt: new Date(),
    }).where(eq(advertisements.id, adId)).returning();

    invalidateLiveAds();
    return sendSuccess(res, updated, 'Ad campaign updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getMyAdCampaigns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return handleUnauthorized(res, 'Not authenticated');

    const rows = await db
      .select({ ad: advertisements, business: { id: businessPartners.id, name: businessPartners.name, destinationId: businessPartners.destinationId } })
      .from(advertisements)
      .innerJoin(businessPartners, eq(advertisements.businessPartnerId, businessPartners.id))
      .where(eq(businessPartners.ownerId, userId))
      .orderBy(desc(advertisements.createdAt));

    const targets = await loadTargets(rows.map((r) => r.ad.id));
    return sendSuccess(res, rows.map(({ ad, business }) => ({ ...ad, business, targets: targets.get(ad.id) })), 'Your ad campaigns retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAdById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [ad] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!ad) return sendNotFoundError(res, 'Ad not found');
    if (!(await isAdOwnerOrAdmin(ad, req)) && !(ad.approvalStatus === 'approved' && ad.campaignStatus === 'active')) {
      return sendForbiddenError(res, 'Not authorized to view this ad');
    }
    return sendSuccess(res, ad, 'Ad retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateAdTargeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [existing] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Ad not found');
    if (!(await isAdOwnerOrAdmin(existing, req))) return sendForbiddenError(res, 'Not authorized to update this ad');

    await syncAdCategoryTargets(adId, parseIdList(req.body?.categoryIds) ?? (req.body?.categoryIds !== undefined ? [] : undefined));
    await syncAdDestinationTargets(adId, parseIdList(req.body?.destinationIds) ?? (req.body?.destinationIds !== undefined ? [] : undefined));
    invalidateLiveAds();

    return sendSuccess(res, (await loadTargets([adId])).get(adId), 'Ad targeting updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteAdCampaign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [existing] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Ad not found');
    if (!(await isAdOwnerOrAdmin(existing, req))) return sendForbiddenError(res, 'Not authorized to delete this ad');

    await db.delete(advertisements).where(eq(advertisements.id, adId));
    invalidateLiveAds();
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const getPendingAds = async (req: Request, res: Response, next: NextFunction) => {
  req.query.status = 'pending';
  return getAdminAds(req, res, next);
};

const ADMIN_FILTERS: Record<string, SQL | undefined> = {
  all: undefined,
  pending: eq(advertisements.approvalStatus, 'pending'),
  unpaid: and(eq(advertisements.approvalStatus, 'approved'), eq(advertisements.isPaid, false)),
  active: and(eq(advertisements.campaignStatus, 'active'), eq(advertisements.approvalStatus, 'approved'), eq(advertisements.isPaid, true)),
  ended: eq(advertisements.campaignStatus, 'ended'),
  rejected: eq(advertisements.approvalStatus, 'rejected'),
};

/** Every campaign (filterable), with business, targeting and delivery numbers — for verifying. */
export const getAdminAds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 20, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 20;
    const status = typeof req.query.status === 'string' && req.query.status in ADMIN_FILTERS ? req.query.status : 'all';
    const where = ADMIN_FILTERS[status];

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select({ ad: advertisements, business: { id: businessPartners.id, name: businessPartners.name, type: businessPartners.type, slug: businessPartners.slug } })
        .from(advertisements)
        .innerJoin(businessPartners, eq(advertisements.businessPartnerId, businessPartners.id))
        .where(where)
        .orderBy(desc(advertisements.submittedAt))
        .limit(pageLimit)
        .offset(skip),
      db.select({ value: count() }).from(advertisements).where(where),
    ]);

    const targets = await loadTargets(rows.map((r) => r.ad.id));
    return sendPaginatedResponse(res, rows.map(({ ad, business }) => ({ ...ad, business, targets: targets.get(ad.id) })), {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Ad campaigns retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const approveAd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const approvedBy = req.user!.id;

    const [existing] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Ad not found');

    const now = new Date();
    const [updated] = await db.update(advertisements).set({
      isApproved: true,
      approvalStatus: 'approved',
      approvedBy,
      approvedAt: now,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      ...(existing.isPaid ? goLiveFields(existing, now) : {}),
      updatedAt: now,
    }).where(eq(advertisements.id, adId)).returning();
    invalidateLiveAds();

    const [partner] = await db.select({ ownerId: businessPartners.ownerId }).from(businessPartners).where(eq(businessPartners.id, existing.businessPartnerId)).limit(1);
    if (partner) {
      try {
        await notifications.createAdApprovalNotification(partner.ownerId, approvedBy, existing.title, existing.id);
      } catch (notificationError) {
        console.error('Error creating ad approval notification:', notificationError);
      }
    }

    return sendSuccess(res, updated, existing.isPaid ? 'Ad campaign approved and live' : 'Ad campaign approved — it goes live once marked paid');
  } catch (error) {
    next(error);
  }
};

/** Admin confirms payment was received (no gateway yet). Approved + paid ⇒ live. */
export const markAdPaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [existing] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Ad not found');
    if (existing.isPaid) return sendSuccess(res, existing, 'Already marked paid');

    const now = new Date();
    const [updated] = await db.update(advertisements).set({
      isPaid: true,
      paidAt: now,
      ...(existing.approvalStatus === 'approved' ? goLiveFields(existing, now) : {}),
      updatedAt: now,
    }).where(eq(advertisements.id, adId)).returning();
    invalidateLiveAds();

    return sendSuccess(res, updated, existing.approvalStatus === 'approved' ? 'Payment recorded — campaign is live' : 'Payment recorded — campaign goes live once approved');
  } catch (error) {
    next(error);
  }
};

export const rejectAd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const { reason } = req.body;
    const rejectedBy = req.user!.id;

    if (!reason) {
      return sendValidationError(res, 'Validation failed', [{ field: 'reason', message: 'Rejection reason is required' }]);
    }

    const [existing] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Ad not found');

    const [updated] = await db.update(advertisements).set({
      isApproved: false,
      approvalStatus: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason,
      approvedBy: null,
      approvedAt: null,
      campaignStatus: 'paused',
      updatedAt: new Date(),
    }).where(eq(advertisements.id, adId)).returning();
    invalidateLiveAds();

    const [partner] = await db.select({ ownerId: businessPartners.ownerId }).from(businessPartners).where(eq(businessPartners.id, existing.businessPartnerId)).limit(1);
    if (partner) {
      try {
        await notifications.createAdRejectionNotification(partner.ownerId, rejectedBy, existing.title, existing.id, reason);
      } catch (notificationError) {
        console.error('Error creating ad rejection notification:', notificationError);
      }
    }

    return sendSuccess(res, updated, 'Ad campaign rejected');
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Serving & tracking (public)
// ---------------------------------------------------------------------------

/**
 * The ad-serving endpoint. The page says what it is about — a tour (`tourId`), destination
 * and category ids, and/or a search phrase (`q`) — and gets back only ads connected to it
 * (see adTargeting.ts). No context ⇒ no ads. Views are counted separately, when an ad is
 * actually seen (POST /ads/impressions).
 */
export const getAdsForPlacement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const placementSlot = req.query.placementSlot as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 3, 10);
    if (!placementSlot || !VALID_SLOTS.includes(placementSlot as typeof VALID_SLOTS[number])) {
      return sendValidationError(res, 'Validation failed', [{ field: 'placementSlot', message: `placementSlot must be one of: ${VALID_SLOTS.join(', ')}` }]);
    }

    const ctx: AdContext = {
      destinationIds: [...(parseIdList(req.query.destinationIds) ?? []), ...(parseIdList(req.query.destinationId) ?? [])],
      categoryIds: [...(parseIdList(req.query.categoryIds) ?? []), ...(parseIdList(req.query.categoryId) ?? [])],
    };
    const tourId = typeof req.query.tourId === 'string' ? req.query.tourId : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const [tourCtx, searchCtx] = await Promise.all([
      tourId ? resolveTourContext(tourId) : null,
      q ? resolveSearchContext(q) : null,
    ]);
    for (const extra of [tourCtx, searchCtx]) {
      if (!extra) continue;
      ctx.destinationIds.push(...extra.destinationIds);
      ctx.categoryIds.push(...extra.categoryIds);
    }

    const ads = await findMatchingAds(placementSlot, ctx, limit);
    return sendSuccess(res, ads, 'Ads retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/** Counts ads that were actually on screen. One view per visitor per ad per 30 minutes. */
export const recordAdImpressions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adIds = [...new Set(parseIdList(req.body?.adIds) ?? [])].slice(0, 10);
    if (adIds.length === 0) return sendSuccess(res, { counted: 0 }, 'Nothing to record');

    const visitor = visitorKey(req);
    const fresh: string[] = [];
    for (const adId of adIds) {
      if (await claimOnce(`ads:view:${adId}:${visitor}`, DEDUPE_WINDOW_SECONDS)) fresh.push(adId);
    }
    if (fresh.length === 0) return sendSuccess(res, { counted: 0 }, 'Already counted');

    // Only live campaigns accrue views (and per-view campaigns stop at their quota).
    const counted = await db.update(advertisements)
      .set({ impressionCount: sql`${advertisements.impressionCount} + 1` })
      .where(and(
        inArray(advertisements.id, fresh),
        eq(advertisements.campaignStatus, 'active'),
        sql`(${advertisements.billingModel} <> 'per_view' OR ${advertisements.viewQuota} IS NULL OR ${advertisements.impressionCount} < ${advertisements.viewQuota})`,
      ))
      .returning({ id: advertisements.id, billingModel: advertisements.billingModel, impressionCount: advertisements.impressionCount, viewQuota: advertisements.viewQuota });

    if (counted.length > 0) {
      const today = todayDateString();
      await db.insert(adDailyStats).values(counted.map((a) => ({ adId: a.id, date: today, impressions: 1, clicks: 0 })))
        .onConflictDoUpdate({ target: [adDailyStats.adId, adDailyStats.date], set: { impressions: sql`${adDailyStats.impressions} + 1` } });

      const usedUp = counted.filter((a) => a.billingModel === 'per_view' && a.viewQuota != null && a.impressionCount >= a.viewQuota).map((a) => a.id);
      if (usedUp.length > 0) {
        await db.update(advertisements).set({ campaignStatus: 'ended', updatedAt: new Date() }).where(inArray(advertisements.id, usedUp));
        invalidateLiveAds();
      }
    }

    return sendSuccess(res, { counted: counted.length }, 'Views recorded');
  } catch (error) {
    next(error);
  }
};

export const recordAdClick = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [ad] = await db.select({ id: advertisements.id, ctaUrl: advertisements.ctaUrl }).from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!ad) return sendNotFoundError(res, 'Ad not found');

    // Repeat clicks by the same visitor still open the link but count once per window.
    if (await claimOnce(`ads:click:${adId}:${visitorKey(req)}`, DEDUPE_WINDOW_SECONDS)) {
      const today = todayDateString();
      await Promise.all([
        db.update(advertisements).set({ clickCount: sql`${advertisements.clickCount} + 1` }).where(eq(advertisements.id, adId)),
        db.insert(adDailyStats).values({ adId, date: today, impressions: 0, clicks: 1 })
          .onConflictDoUpdate({ target: [adDailyStats.adId, adDailyStats.date], set: { clicks: sql`${adDailyStats.clicks} + 1` } }),
      ]);
    }

    return sendSuccess(res, { ctaUrl: ad.ctaUrl }, 'Click recorded');
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Stats (owner + admin)
// ---------------------------------------------------------------------------

export const getAdStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [ad] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!ad) return sendNotFoundError(res, 'Ad not found');
    if (!(await isAdOwnerOrAdmin(ad, req))) return sendForbiddenError(res, 'Not authorized to view stats for this ad');

    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
    const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    const daily = await db.select({ date: adDailyStats.date, impressions: adDailyStats.impressions, clicks: adDailyStats.clicks })
      .from(adDailyStats)
      .where(and(eq(adDailyStats.adId, adId), gte(adDailyStats.date, since)))
      .orderBy(adDailyStats.date);

    const now = Date.now();
    return sendSuccess(res, {
      totalImpressions: ad.impressionCount,
      totalClicks: ad.clickCount,
      ctr: ad.impressionCount > 0 ? ad.clickCount / ad.impressionCount : 0,
      billingModel: ad.billingModel,
      viewQuota: ad.viewQuota,
      viewsRemaining: ad.viewQuota != null ? Math.max(ad.viewQuota - ad.impressionCount, 0) : null,
      startDate: ad.startDate,
      endDate: ad.endDate,
      daysRemaining: ad.endDate ? Math.max(Math.ceil((ad.endDate.getTime() - now) / 86_400_000), 0) : null,
      priceAmount: ad.priceAmount,
      currency: ad.currency,
      isPaid: ad.isPaid,
      daily,
    }, 'Ad stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};
