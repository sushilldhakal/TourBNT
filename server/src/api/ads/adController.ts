import { Request, Response, NextFunction } from 'express';
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
import { eq, and, desc, count, inArray, gte, lte, or, isNull, sql } from 'drizzle-orm';
import { HTTP_STATUS, sendSuccess, sendPaginatedResponse, sendValidationError, sendNotFoundError, sendForbiddenError, handleUnauthorized } from '../../utils/apiResponse';
import * as notifications from '../notifications/notificationController';
import { uploadAdImage as uploadAdImageFile } from '../../services/adImageService';

type AdRow = typeof advertisements.$inferSelect;

const VALID_SLOTS = adPlacementSlotEnum.enumValues;

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
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
    await db.insert(adCategoryTargets).values(categoryIds.map((categoryId) => ({ adId, categoryId })));
  }
}

async function syncAdDestinationTargets(adId: string, destinationIds: string[] | undefined) {
  if (destinationIds === undefined) return;
  await db.delete(adDestinationTargets).where(eq(adDestinationTargets.adId, adId));
  if (destinationIds.length > 0) {
    await db.insert(adDestinationTargets).values(destinationIds.map((destinationId) => ({ adId, destinationId })));
  }
}

async function bumpImpressions(adIds: string[]) {
  if (adIds.length === 0) return;
  const today = todayDateString();
  await db.update(advertisements).set({ impressionCount: sql`${advertisements.impressionCount} + 1` }).where(inArray(advertisements.id, adIds));
  for (const adId of adIds) {
    await db.insert(adDailyStats).values({ adId, date: today, impressions: 1, clicks: 0 })
      .onConflictDoUpdate({ target: [adDailyStats.adId, adDailyStats.date], set: { impressions: sql`${adDailyStats.impressions} + 1` } });
  }
}

// Owner (or admin) creates an ad campaign for one of their businesses.
// Submission immediately puts it into the admin review queue; the owner
// separately controls campaignStatus (draft/active/paused) once approved.
export const createAdCampaign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return handleUnauthorized(res, 'Not authenticated');

    const { businessPartnerId, title, description, ctaLabel, ctaUrl, placementSlot, startDate, endDate } = req.body;

    if (!businessPartnerId || !title || !ctaUrl || !placementSlot) {
      return sendValidationError(res, 'Validation failed', [
        { field: 'businessPartnerId/title/ctaUrl/placementSlot', message: 'businessPartnerId, title, ctaUrl and placementSlot are required' },
      ]);
    }
    if (!VALID_SLOTS.includes(placementSlot)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'placementSlot', message: `placementSlot must be one of: ${VALID_SLOTS.join(', ')}` }]);
    }
    if (!(await assertOwnerOrAdmin(businessPartnerId, req))) {
      return sendForbiddenError(res, 'Not authorized to create ads for this business');
    }

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
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      approvalStatus: 'pending',
      submittedAt: new Date(),
    }).returning();

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

    const { title, description, ctaLabel, ctaUrl, placementSlot, campaignStatus, startDate, endDate } = req.body;
    if (placementSlot && !VALID_SLOTS.includes(placementSlot)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'placementSlot', message: `placementSlot must be one of: ${VALID_SLOTS.join(', ')}` }]);
    }
    if (campaignStatus && !['draft', 'active', 'paused', 'ended'].includes(campaignStatus)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'campaignStatus', message: 'Invalid campaignStatus' }]);
    }
    if (campaignStatus === 'active' && existing.approvalStatus !== 'approved') {
      return sendValidationError(res, 'Cannot activate an ad campaign until it has been approved by an admin');
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
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      updatedAt: new Date(),
    }).where(eq(advertisements.id, adId)).returning();

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
      .select({ ad: advertisements, business: { id: businessPartners.id, name: businessPartners.name } })
      .from(advertisements)
      .innerJoin(businessPartners, eq(advertisements.businessPartnerId, businessPartners.id))
      .where(eq(businessPartners.ownerId, userId))
      .orderBy(desc(advertisements.createdAt));

    return sendSuccess(res, rows.map(({ ad, business }) => ({ ...ad, business })), 'Your ad campaigns retrieved successfully');
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

    const { categoryIds, destinationIds } = req.body as { categoryIds?: string[]; destinationIds?: string[] };
    await syncAdCategoryTargets(adId, categoryIds);
    await syncAdDestinationTargets(adId, destinationIds);

    const [categories, destinations] = await Promise.all([
      db.select({ category: globalCategories }).from(adCategoryTargets).innerJoin(globalCategories, eq(adCategoryTargets.categoryId, globalCategories.id)).where(eq(adCategoryTargets.adId, adId)),
      db.select({ destination: globalDestinations }).from(adDestinationTargets).innerJoin(globalDestinations, eq(adDestinationTargets.destinationId, globalDestinations.id)).where(eq(adDestinationTargets.adId, adId)),
    ]);

    return sendSuccess(res, {
      categories: categories.map((c) => c.category),
      destinations: destinations.map((d) => d.destination),
    }, 'Ad targeting updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getPendingAds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;
    const where = eq(advertisements.approvalStatus, 'pending');

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select({ ad: advertisements, business: { id: businessPartners.id, name: businessPartners.name, type: businessPartners.type } })
        .from(advertisements)
        .innerJoin(businessPartners, eq(advertisements.businessPartnerId, businessPartners.id))
        .where(where)
        .orderBy(desc(advertisements.submittedAt))
        .limit(pageLimit)
        .offset(skip),
      db.select({ value: count() }).from(advertisements).where(where),
    ]);

    return sendPaginatedResponse(res, rows.map(({ ad, business }) => ({ ...ad, business })), {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Pending ad campaigns retrieved successfully');
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

    const [updated] = await db.update(advertisements).set({
      isApproved: true,
      approvalStatus: 'approved',
      approvedBy,
      approvedAt: new Date(),
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      updatedAt: new Date(),
    }).where(eq(advertisements.id, adId)).returning();

    const [partner] = await db.select({ ownerId: businessPartners.ownerId }).from(businessPartners).where(eq(businessPartners.id, existing.businessPartnerId)).limit(1);
    if (partner) {
      try {
        await notifications.createAdApprovalNotification(partner.ownerId, approvedBy, existing.title, existing.id);
      } catch (notificationError) {
        console.error('Error creating ad approval notification:', notificationError);
      }
    }

    return sendSuccess(res, updated, 'Ad campaign approved successfully');
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

export const deleteAdCampaign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [existing] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Ad not found');
    if (!(await isAdOwnerOrAdmin(existing, req))) return sendForbiddenError(res, 'Not authorized to delete this ad');

    await db.delete(advertisements).where(eq(advertisements.id, adId));
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

// The ad-serving endpoint: returns approved, active, in-flight ads for a
// given placement slot, hard-filtered to matching category/destination when
// those are provided (so a page only gets ads that specifically targeted
// it — no generic filler).
export const getAdsForPlacement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { placementSlot, categoryId, destinationId } = req.query as { placementSlot?: string; categoryId?: string; destinationId?: string };
    const limit = Math.min(parseInt(req.query.limit as string) || 3, 10);

    if (!placementSlot || !VALID_SLOTS.includes(placementSlot as typeof VALID_SLOTS[number])) {
      return sendValidationError(res, 'Validation failed', [{ field: 'placementSlot', message: `placementSlot must be one of: ${VALID_SLOTS.join(', ')}` }]);
    }

    const now = new Date();
    const conditions = [
      eq(advertisements.placementSlot, placementSlot as typeof VALID_SLOTS[number]),
      eq(advertisements.campaignStatus, 'active'),
      eq(advertisements.approvalStatus, 'approved'),
      or(isNull(advertisements.startDate), lte(advertisements.startDate, now)),
      or(isNull(advertisements.endDate), gte(advertisements.endDate, now)),
    ];

    if (categoryId) {
      conditions.push(inArray(
        advertisements.id,
        db.select({ adId: adCategoryTargets.adId }).from(adCategoryTargets).where(eq(adCategoryTargets.categoryId, categoryId))
      ));
    }
    if (destinationId) {
      conditions.push(inArray(
        advertisements.id,
        db.select({ adId: adDestinationTargets.adId }).from(adDestinationTargets).where(eq(adDestinationTargets.destinationId, destinationId))
      ));
    }

    const rows = await db
      .select({ ad: advertisements, business: { id: businessPartners.id, name: businessPartners.name, slug: businessPartners.slug, type: businessPartners.type } })
      .from(advertisements)
      .innerJoin(businessPartners, eq(advertisements.businessPartnerId, businessPartners.id))
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    const ads = rows.map(({ ad, business }) => ({ ...ad, business }));
    await bumpImpressions(ads.map((a) => a.id));

    return sendSuccess(res, ads, 'Ads retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const recordAdClick = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [ad] = await db.select({ id: advertisements.id, ctaUrl: advertisements.ctaUrl }).from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!ad) return sendNotFoundError(res, 'Ad not found');

    const today = todayDateString();
    await db.update(advertisements).set({ clickCount: sql`${advertisements.clickCount} + 1` }).where(eq(advertisements.id, adId));
    await db.insert(adDailyStats).values({ adId, date: today, impressions: 0, clicks: 1 })
      .onConflictDoUpdate({ target: [adDailyStats.adId, adDailyStats.date], set: { clicks: sql`${adDailyStats.clicks} + 1` } });

    return sendSuccess(res, { ctaUrl: ad.ctaUrl }, 'Click recorded');
  } catch (error) {
    next(error);
  }
};

export const getAdStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adId } = req.params;
    const [ad] = await db.select().from(advertisements).where(eq(advertisements.id, adId)).limit(1);
    if (!ad) return sendNotFoundError(res, 'Ad not found');
    if (!(await isAdOwnerOrAdmin(ad, req))) return sendForbiddenError(res, 'Not authorized to view stats for this ad');

    const daily = await db.select().from(adDailyStats).where(eq(adDailyStats.adId, adId)).orderBy(desc(adDailyStats.date)).limit(30);

    return sendSuccess(res, {
      totalImpressions: ad.impressionCount,
      totalClicks: ad.clickCount,
      daily,
    }, 'Ad stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};
