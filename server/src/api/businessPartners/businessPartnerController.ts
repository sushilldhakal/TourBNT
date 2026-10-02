import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import {
  db,
  businessPartners,
  businessDocuments,
  businessPartnerCategories,
  businessPartnerDestinations,
  tourItineraryPartners,
  tours,
  users,
  globalCategories,
  globalDestinations,
  businessPartnerTypeEnum,
} from '../../db';
import { eq, and, ilike, desc, count, inArray, sql } from 'drizzle-orm';
import { HTTP_STATUS, sendSuccess, sendPaginatedResponse, sendValidationError, sendNotFoundError, sendForbiddenError, handleUnauthorized } from '../../utils/apiResponse';
import { uploadBusinessDocuments, deleteBusinessDocuments } from '../../services/businessDocumentService';
import { ensureMediaFolder } from '../../services/mediaFolderService';
import * as notifications from '../notifications/notificationController';
import type { BusinessPartnerType } from './businessPartnerTypes';
import { invalidateBusinessPartner } from '../../services/cacheInvalidation';

type BusinessPartnerRow = typeof businessPartners.$inferSelect;

const VALID_TYPES = businessPartnerTypeEnum.enumValues as readonly BusinessPartnerType[];

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

async function generateUniqueSlug(name: string): Promise<string> {
  const base = toSlug(name) || 'business';
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await db.select({ id: businessPartners.id }).from(businessPartners).where(eq(businessPartners.slug, slug)).limit(1);
    if (!existing) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function isOwnerOrAdmin(partner: Pick<BusinessPartnerRow, 'ownerId'>, req: Request): boolean {
  const isAdmin = req.user?.roles?.includes('admin') ?? false;
  return isAdmin || req.user?.id === partner.ownerId;
}

async function withDocuments(partner: BusinessPartnerRow) {
  const docs = await db.select().from(businessDocuments).where(eq(businessDocuments.businessPartnerId, partner.id));
  return { ...partner, documents: docs };
}

async function syncBusinessCategories(businessPartnerId: string, categoryIds: string[] | undefined) {
  if (categoryIds === undefined) return;
  await db.delete(businessPartnerCategories).where(eq(businessPartnerCategories.businessPartnerId, businessPartnerId));
  if (categoryIds.length > 0) {
    await db.insert(businessPartnerCategories).values(categoryIds.map((categoryId) => ({ businessPartnerId, categoryId })));
  }
}

async function syncBusinessDestinations(businessPartnerId: string, destinationIds: string[] | undefined) {
  if (destinationIds === undefined) return;
  await db.delete(businessPartnerDestinations).where(eq(businessPartnerDestinations.businessPartnerId, businessPartnerId));
  if (destinationIds.length > 0) {
    await db.insert(businessPartnerDestinations).values(destinationIds.map((destinationId) => ({ businessPartnerId, destinationId })));
  }
}

// Authenticated user applies to become a business partner (guide/hotel/
// guesthouse/restaurant/transport/advertiser).
export const applyAsBusinessPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) return handleUnauthorized(res, 'Not authenticated');

    const { type, name, description, email, phone, website } = req.body;
    const address = parseJson(req.body.address, undefined);
    const details = parseJson(req.body.details, undefined);
    const destinationId = req.body.destinationId || undefined;

    if (!type || !VALID_TYPES.includes(type)) {
      return sendValidationError(res, 'Validation failed', [{ field: 'type', message: `type must be one of: ${VALID_TYPES.join(', ')}` }]);
    }
    if (!name) {
      return sendValidationError(res, 'Validation failed', [{ field: 'name', message: 'name is required' }]);
    }

    const slug = await generateUniqueSlug(name);

    const [partner] = await db.insert(businessPartners).values({
      ownerId,
      type,
      name,
      slug,
      description,
      email,
      phone,
      website,
      address: address ?? null,
      destinationId,
      details: details ?? null,
    }).returning();

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files && Object.keys(files).length > 0) {
      const uploaded = await uploadBusinessDocuments(files);
      if (uploaded.length > 0) {
        await db.insert(businessDocuments).values(uploaded.map((doc) => ({
          businessPartnerId: partner.id,
          docType: doc.docType,
          url: doc.url,
          publicId: doc.publicId,
          originalFilename: doc.originalFilename,
        })));
      }
    }

    const result = await withDocuments(partner);
    return sendSuccess(res, result, 'Business application submitted successfully. It will be reviewed by our team.', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

// Current user's own business listings, any approval status.
export const getMyBusinessPartners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) return handleUnauthorized(res, 'Not authenticated');

    const rows = await db.select().from(businessPartners).where(eq(businessPartners.ownerId, ownerId)).orderBy(desc(businessPartners.createdAt));
    const items = await Promise.all(rows.map(withDocuments));
    return sendSuccess(res, items, 'Your business listings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getBusinessPartnerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    const [partner] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!partner) return sendNotFoundError(res, 'Business not found');

    if (!isOwnerOrAdmin(partner, req) && !(partner.approvalStatus === 'approved' && partner.isActive)) {
      return sendForbiddenError(res, 'Not authorized to view this business');
    }

    return sendSuccess(res, await withDocuments(partner), 'Business retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Public profile lookup by slug — only surfaces approved & active listings.
export const getBusinessPartnerBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const [partner] = await db.select().from(businessPartners).where(eq(businessPartners.slug, slug)).limit(1);
    if (!partner || partner.approvalStatus !== 'approved' || !partner.isActive) {
      return sendNotFoundError(res, 'Business not found');
    }

    await db.update(businessPartners).set({ views: sql`${businessPartners.views} + 1` }).where(eq(businessPartners.id, partner.id));

    return sendSuccess(res, partner, 'Business retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Public directory search — used by the itinerary partner-picker and the
// public directory/listing pages.
export const searchBusinessPartners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, destinationId, q, categoryId } = req.query as { type?: string; destinationId?: string; q?: string; categoryId?: string };
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;

    const conditions = [eq(businessPartners.approvalStatus, 'approved'), eq(businessPartners.isActive, true)];
    // `type` may be a comma-separated list ("hotel,guesthouse") so a caller can fetch every
    // type for a role in a single request instead of one per type.
    const types = type ? type.split(',').map((t) => t.trim()).filter((t): t is BusinessPartnerType => VALID_TYPES.includes(t as BusinessPartnerType)) : [];
    if (types.length === 1) conditions.push(eq(businessPartners.type, types[0]));
    else if (types.length > 1) conditions.push(inArray(businessPartners.type, types));
    if (destinationId) conditions.push(eq(businessPartners.destinationId, destinationId));
    if (q) conditions.push(ilike(businessPartners.name, `%${q}%`));
    if (categoryId) {
      conditions.push(inArray(
        businessPartners.id,
        db.select({ businessPartnerId: businessPartnerCategories.businessPartnerId }).from(businessPartnerCategories).where(eq(businessPartnerCategories.categoryId, categoryId))
      ));
    }
    const where = and(...conditions);

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select().from(businessPartners).where(where).orderBy(desc(businessPartners.averageRating)).limit(pageLimit).offset(skip),
      db.select({ value: count() }).from(businessPartners).where(where),
    ]);

    return sendPaginatedResponse(res, rows, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Businesses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Owner (or admin) updates their own business profile.
export const updateMyBusinessPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    const [existing] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Business not found');
    if (!isOwnerOrAdmin(existing, req)) return sendForbiddenError(res, 'Not authorized to update this business');

    const { name, description, email, phone, website, logo, coverImage, isActive } = req.body;
    const address = req.body.address !== undefined ? parseJson(req.body.address, existing.address) : undefined;
    const details = req.body.details !== undefined ? parseJson(req.body.details, existing.details) : undefined;
    const destinationId = req.body.destinationId !== undefined ? req.body.destinationId || null : undefined;

    const [updated] = await db.update(businessPartners).set({
      name: name ?? existing.name,
      description: description ?? existing.description,
      email: email ?? existing.email,
      phone: phone ?? existing.phone,
      website: website ?? existing.website,
      logo: logo ?? existing.logo,
      coverImage: coverImage ?? existing.coverImage,
      ...(address !== undefined && { address }),
      ...(details !== undefined && { details }),
      ...(destinationId !== undefined && { destinationId }),
      ...(isActive !== undefined && { isActive: isActive === true || isActive === 'true' }),
      updatedAt: new Date(),
    }).where(eq(businessPartners.id, businessPartnerId)).returning();
    await invalidateBusinessPartner(businessPartnerId);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files && Object.keys(files).length > 0) {
      const uploaded = await uploadBusinessDocuments(files);
      if (uploaded.length > 0) {
        await db.insert(businessDocuments).values(uploaded.map((doc) => ({
          businessPartnerId,
          docType: doc.docType,
          url: doc.url,
          publicId: doc.publicId,
          originalFilename: doc.originalFilename,
        })));
      }
    }

    return sendSuccess(res, await withDocuments(updated), 'Business updated successfully');
  } catch (error) {
    next(error);
  }
};

// Owner (or admin) sets which categories/destinations this business shows
// up under for organic directory discoverability.
export const updateBusinessPartnerTargeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    const [existing] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Business not found');
    if (!isOwnerOrAdmin(existing, req)) return sendForbiddenError(res, 'Not authorized to update this business');

    const { categoryIds, destinationIds } = req.body as { categoryIds?: string[]; destinationIds?: string[] };
    await syncBusinessCategories(businessPartnerId, categoryIds);
    await syncBusinessDestinations(businessPartnerId, destinationIds);

    const [categories, destinations] = await Promise.all([
      db.select({ category: globalCategories }).from(businessPartnerCategories).innerJoin(globalCategories, eq(businessPartnerCategories.categoryId, globalCategories.id)).where(eq(businessPartnerCategories.businessPartnerId, businessPartnerId)),
      db.select({ destination: globalDestinations }).from(businessPartnerDestinations).innerJoin(globalDestinations, eq(businessPartnerDestinations.destinationId, globalDestinations.id)).where(eq(businessPartnerDestinations.businessPartnerId, businessPartnerId)),
    ]);

    return sendSuccess(res, {
      categories: categories.map((c) => c.category),
      destinations: destinations.map((d) => d.destination),
    }, 'Targeting preferences updated successfully');
  } catch (error) {
    next(error);
  }
};

// Admin: applications queue — filterable by approval status, business type and
// free text, paginated. Defaults to the pending queue.
export const getPendingBusinessPartners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;
    const { type, status, q } = req.query as { type?: string; status?: string; q?: string };

    const conditions = [];
    const approvalStatus = status === 'all' ? null : (['pending', 'approved', 'rejected'].includes(status ?? '') ? status : 'pending');
    if (approvalStatus) conditions.push(eq(businessPartners.approvalStatus, approvalStatus as 'pending' | 'approved' | 'rejected'));
    if (type && VALID_TYPES.includes(type as BusinessPartnerType)) conditions.push(eq(businessPartners.type, type as BusinessPartnerType));
    if (q && q.trim()) conditions.push(ilike(businessPartners.name, `%${q.trim()}%`));
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select().from(businessPartners).where(where).orderBy(desc(businessPartners.submittedAt)).limit(pageLimit).offset(skip),
      db.select({ value: count() }).from(businessPartners).where(where),
    ]);

    const items = await Promise.all(rows.map(withDocuments));
    return sendPaginatedResponse(res, items, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Business applications retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Admin: per-type / per-status head-count used for the tab badges on the Applications page.
export const getBusinessApplicationCounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select({ type: businessPartners.type, status: businessPartners.approvalStatus, value: count() })
      .from(businessPartners)
      .groupBy(businessPartners.type, businessPartners.approvalStatus);
    const byType: Record<string, { pending: number; approved: number; rejected: number }> = {};
    for (const r of rows) {
      byType[r.type] ??= { pending: 0, approved: 0, rejected: 0 };
      byType[r.type][r.status] = Number(r.value);
    }
    return sendSuccess(res, { byType }, 'Application counts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Admin: approve a business application — flips the owner's role to the
// business's type, exactly like seller approval flips role='seller'.
export const approveBusinessPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    const approvedBy = req.user!.id;

    const [existing] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Business not found');
    if (existing.approvalStatus === 'approved') {
      return sendValidationError(res, 'Business is already approved');
    }

    const [updated] = await db.update(businessPartners).set({
      isApproved: true,
      approvalStatus: 'approved',
      approvedBy,
      approvedAt: new Date(),
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      updatedAt: new Date(),
    }).where(eq(businessPartners.id, businessPartnerId)).returning();
    await invalidateBusinessPartner(businessPartnerId);

    // `users.role` is a single column, but ownership of this listing (and
    // therefore access to /dashboard/business, review moderation, ad
    // campaigns, etc.) is entirely governed by businessPartners.ownerId, not
    // by role — every controller in this domain checks ownerId directly.
    // So don't blindly overwrite role: a seller (or admin) who also runs a
    // business listing must keep that role, or they'd be silently locked
    // out of `/dashboard/tours/*` (isAdminOrSeller checks role === 'seller'
    // exactly) the moment their unrelated business application is approved.
    const [owner] = await db.select({ role: users.role }).from(users).where(eq(users.id, existing.ownerId)).limit(1);
    if (owner && owner.role !== 'admin' && owner.role !== 'seller') {
      await db.update(users).set({ role: existing.type, updatedAt: new Date() }).where(eq(users.id, existing.ownerId));
    }

    // Create their tour-media R2 folder now, so it's ready before their first upload.
    await ensureMediaFolder(existing.ownerId, existing.name);

    try {
      await notifications.createBusinessPartnerApprovalNotification(existing.ownerId, approvedBy, existing.name, existing.id);
    } catch (notificationError) {
      console.error('Error creating business approval notification:', notificationError);
    }

    return sendSuccess(res, updated, 'Business approved successfully');
  } catch (error) {
    next(error);
  }
};

// Admin: reject a business application.
export const rejectBusinessPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    const { reason } = req.body;
    const rejectedBy = req.user!.id;

    if (!reason) {
      return sendValidationError(res, 'Validation failed', [{ field: 'reason', message: 'Rejection reason is required' }]);
    }

    const [existing] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Business not found');

    const [updated] = await db.update(businessPartners).set({
      isApproved: false,
      approvalStatus: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason,
      approvedBy: null,
      approvedAt: null,
      updatedAt: new Date(),
    }).where(eq(businessPartners.id, businessPartnerId)).returning();
    await invalidateBusinessPartner(businessPartnerId);

    try {
      await notifications.createBusinessPartnerRejectionNotification(existing.ownerId, rejectedBy, existing.name, existing.id, reason);
    } catch (notificationError) {
      console.error('Error creating business rejection notification:', notificationError);
    }

    return sendSuccess(res, updated, 'Business rejected');
  } catch (error) {
    next(error);
  }
};

// Owner or admin: delete a business listing entirely (cascades documents,
// targeting rows, reviews, ads; itinerary links degrade to plain text).
export const deleteBusinessPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;
    const [existing] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!existing) return sendNotFoundError(res, 'Business not found');
    if (!isOwnerOrAdmin(existing, req)) return sendForbiddenError(res, 'Not authorized to delete this business');

    const docs = await db.select().from(businessDocuments).where(eq(businessDocuments.businessPartnerId, businessPartnerId));
    // The itinerary links are set to null by the delete, so find the affected tours first.
    const linkedTours = await db.selectDistinct({ tourId: tourItineraryPartners.tourId }).from(tourItineraryPartners).where(eq(tourItineraryPartners.businessPartnerId, businessPartnerId));
    await db.delete(businessPartners).where(eq(businessPartners.id, businessPartnerId));
    await invalidateBusinessPartner(businessPartnerId, { tourIds: linkedTours.map((r) => r.tourId) });

    if (docs.length > 0) {
      try {
        await deleteBusinessDocuments(docs.map((d) => d.publicId).filter((id): id is string => !!id));
      } catch (cleanupError) {
        console.error('Error cleaning up business documents:', cleanupError);
      }
    }

    return res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

// Public: reverse lookup — "tours featuring this partner" for the business's
// public profile page.
export const getToursFeaturingBusinessPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessPartnerId } = req.params;

    const tourIds = db.select({ tourId: tourItineraryPartners.tourId }).from(tourItineraryPartners).where(eq(tourItineraryPartners.businessPartnerId, businessPartnerId));

    const rows = await db
      .select({ id: tours.id, title: tours.title, code: tours.code, coverImage: tours.coverImage, price: tours.price, averageRating: tours.averageRating })
      .from(tours)
      .where(and(inArray(tours.id, tourIds), eq(tours.tourStatus, 'Published')))
      .orderBy(desc(tours.averageRating));

    return sendSuccess(res, rows, 'Tours retrieved successfully');
  } catch (error) {
    next(error);
  }
};
