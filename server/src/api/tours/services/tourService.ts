import { db, tours, tourCategories, tourAuthors, globalCategories, users, facts as factsTable, tourItineraryPartners, businessPartners, businessPartnerUnitTypes } from '@tourbnt/db';
import { eq, and, or, ilike, gte, lte, gt, desc, asc, sql, inArray, count, getTableColumns, type SQL } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { Tour } from '../tourTypes';
import { ITINERARY_ROLE_TO_PARTNER_TYPES } from '../../businessPartners/businessPartnerTypes';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern, getRedisClient } from '../../../config/redisClient';
import { ItineraryRequestService } from './itineraryRequestService';

/** Best-effort — a partner-notification hiccup must never fail the tour save itself. */
async function reconcileItineraryRequests(tourId: string) {
  try {
    await ItineraryRequestService.reconcileFixedDepartureRequests(tourId);
  } catch (err) {
    console.error(`Failed to reconcile itinerary partner requests for tour ${tourId}:`, err);
  }
}

type TourRow = typeof tours.$inferSelect;

/** Simple numeric pagination params — tours never use the "all"/hybrid mode. */
interface TourPaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Listing columns: everything except the big per-tour JSON/text blobs
 * (itinerary, gallery, FAQs, facts, include/exclude, outline). Cards and
 * tables never render them, and the full row made every list page haul
 * megabytes over the wire. `getTourById` still returns the whole row.
 */
const {
  itinerary: _itinerary, gallery: _gallery, faqs: _faqs, facts: _facts,
  include: _include, exclude: _exclude, outline: _outline,
  ...LIST_COLUMNS
} = getTableColumns(tours);

const AUTHOR_COLUMNS = { id: users.id, name: users.name, email: users.email, roles: users.role } as const;
const CATEGORY_COLUMNS = { id: globalCategories.id, name: globalCategories.name, description: globalCategories.description } as const;

/** Batches author/category lookups for a set of tours and merges them in. */
async function attachRelations<T extends { id: string }>(rows: T[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const tourIds = rows.map((t) => t.id);

  const [authorRows, categoryRows] = await Promise.all([
    db.select({ tourId: tourAuthors.tourId, author: AUTHOR_COLUMNS }).from(tourAuthors).innerJoin(users, eq(tourAuthors.userId, users.id)).where(inArray(tourAuthors.tourId, tourIds)),
    db.select({ tourId: tourCategories.tourId, category: CATEGORY_COLUMNS }).from(tourCategories).innerJoin(globalCategories, eq(tourCategories.categoryId, globalCategories.id)).where(inArray(tourCategories.tourId, tourIds)),
  ]);

  const authorsByTour = new Map<string, unknown[]>();
  for (const { tourId, author } of authorRows) {
    const list = authorsByTour.get(tourId) || [];
    list.push(author);
    authorsByTour.set(tourId, list);
  }

  const categoriesByTour = new Map<string, unknown[]>();
  for (const { tourId, category } of categoryRows) {
    const list = categoriesByTour.get(tourId) || [];
    list.push(category);
    categoriesByTour.set(tourId, list);
  }

  return rows.map((tour) => ({
    ...tour,
    author: authorsByTour.get(tour.id) || [],
    category: categoriesByTour.get(tour.id) || [],
  }));
}

async function syncTourCategories(tourId: string, categoryIds: string[] | undefined) {
  if (categoryIds === undefined) return;
  await db.delete(tourCategories).where(eq(tourCategories.tourId, tourId));
  if (categoryIds.length > 0) {
    await db.insert(tourCategories).values(categoryIds.map((categoryId) => ({ tourId, categoryId })));
  }
}

async function syncTourAuthors(tourId: string, authorIds: string[] | undefined) {
  if (authorIds === undefined) return;
  await db.delete(tourAuthors).where(eq(tourAuthors.tourId, tourId));
  if (authorIds.length > 0) {
    await db.insert(tourAuthors).values(authorIds.map((userId) => ({ tourId, userId })));
  }
}

/**
 * Flattens each itinerary day's `partners[]` into `tourItineraryPartners`
 * rows (delete-then-reinsert, same sentinel convention as syncTourCategories)
 * so a business partner's own dashboard can reverse-lookup "tours featuring
 * me". Validates that any `businessPartnerId` reference resolves to an
 * approved business of a type compatible with its itinerary role.
 */
async function syncTourItineraryPartners(tourId: string, itinerary: unknown[] | undefined) {
  if (itinerary === undefined) return;

  type LinkRow = { tourId: string; dayId: string; role: 'transport' | 'accommodation' | 'guide' | 'meals' | 'other'; businessPartnerId: string | null; name: string; notes: string | null; sortOrder: number; unitsRequested: number | null; unitType: string | null; unitTypeId: string | null };
  const rows: LinkRow[] = [];

  for (const day of itinerary as any[]) {
    const dayId = day?.id;
    if (!dayId || !Array.isArray(day.partners)) continue;
    day.partners.forEach((p: any, idx: number) => {
      if (!p || !p.role || !p.name) return;
      rows.push({
        tourId,
        dayId,
        role: p.role,
        businessPartnerId: p.businessPartnerId || null,
        name: p.name,
        notes: p.notes || null,
        sortOrder: idx,
        unitsRequested: typeof p.unitsRequested === 'number' ? p.unitsRequested : null,
        unitType: p.unitType || null,
        unitTypeId: p.unitTypeId || null,
      });
    });
  }

  const referencedIds = Array.from(new Set(rows.map((r) => r.businessPartnerId).filter((id): id is string => !!id)));
  if (referencedIds.length > 0) {
    const partners = await db
      .select({ id: businessPartners.id, type: businessPartners.type, approvalStatus: businessPartners.approvalStatus })
      .from(businessPartners)
      .where(inArray(businessPartners.id, referencedIds));
    const byId = new Map(partners.map((p) => [p.id, p]));

    for (const row of rows) {
      if (!row.businessPartnerId) continue;
      const partner = byId.get(row.businessPartnerId);
      if (!partner || partner.approvalStatus !== 'approved') {
        throw createHttpError(400, `Itinerary partner "${row.name}" references an unapproved or unknown business (day ${row.dayId}, role ${row.role})`);
      }
      const allowedTypes = ITINERARY_ROLE_TO_PARTNER_TYPES[row.role] || [];
      if (!allowedTypes.includes(partner.type)) {
        throw createHttpError(400, `Business type "${partner.type}" is not valid for itinerary role "${row.role}" (day ${row.dayId})`);
      }
    }
  }

  // A row's unitTypeId only makes sense against its own businessPartnerId —
  // rather than hard-failing a stale/mismatched one (e.g. the client didn't
  // clear it after a partner swap), just drop it: the free-text unitType
  // name still carries through either way.
  const referencedUnitTypeIds = Array.from(new Set(rows.map((r) => r.unitTypeId).filter((id): id is string => !!id)));
  if (referencedUnitTypeIds.length > 0) {
    const unitTypeRows = await db
      .select({ id: businessPartnerUnitTypes.id, businessPartnerId: businessPartnerUnitTypes.businessPartnerId })
      .from(businessPartnerUnitTypes)
      .where(inArray(businessPartnerUnitTypes.id, referencedUnitTypeIds));
    const ownerByUnitTypeId = new Map(unitTypeRows.map((u) => [u.id, u.businessPartnerId]));
    for (const row of rows) {
      if (row.unitTypeId && ownerByUnitTypeId.get(row.unitTypeId) !== row.businessPartnerId) {
        row.unitTypeId = null;
      }
    }
  }

  // Update in place where a (day, role) link already exists, instead of delete-all +
  // reinsert. Supplier requests hang off the link row with ON DELETE CASCADE, so
  // re-creating the links on every tour save silently wiped every request (and
  // each partner's confirm / counter / decline) for the tour.
  const existing = await db.select().from(tourItineraryPartners).where(eq(tourItineraryPartners.tourId, tourId));
  const keyOf = (r: { dayId: string; role: string }) => `${r.dayId}|${r.role}`;
  const existingByKey = new Map<string, typeof existing>();
  for (const e of existing) {
    const list = existingByKey.get(keyOf(e)) ?? [];
    list.push(e);
    existingByKey.set(keyOf(e), list);
  }

  const keepIds = new Set<string>();
  const toInsert: LinkRow[] = [];
  const updates: Array<PromiseLike<unknown>> = [];
  for (const row of rows) {
    // Same day + role + same business = same link. A different business is a new link (its requests belong to the old one).
    const match = existingByKey.get(keyOf(row))?.find((e) => !keepIds.has(e.id) && (e.businessPartnerId ?? null) === (row.businessPartnerId ?? null) && e.name === row.name);
    if (match) {
      keepIds.add(match.id);
      const changed = (['notes', 'sortOrder', 'unitsRequested', 'unitType', 'unitTypeId'] as const).some((k) => (match[k] ?? null) !== (row[k] ?? null));
      if (changed) updates.push(db.update(tourItineraryPartners).set({ ...row, updatedAt: new Date() }).where(eq(tourItineraryPartners.id, match.id)));
    } else {
      toInsert.push(row);
    }
  }
  await Promise.all(updates);
  const staleIds = existing.filter((e) => !keepIds.has(e.id)).map((e) => e.id);
  if (staleIds.length > 0) {
    await db.delete(tourItineraryPartners).where(inArray(tourItineraryPartners.id, staleIds));
  }
  if (toInsert.length > 0) {
    await db.insert(tourItineraryPartners).values(toInsert);
  }
}

/**
 * Enriches every itinerary day's `partners[]` with the referenced business's
 * *current* name/slug/rating (rather than a stale write-time snapshot). A
 * partner that's since been deleted or unapproved gracefully degrades to
 * plain text — `businessPartnerId` is dropped but the stored `name` remains.
 */
async function enrichItineraryPartners(itinerary: unknown): Promise<unknown> {
  if (!Array.isArray(itinerary)) return itinerary;

  const referencedIds = new Set<string>();
  for (const day of itinerary as any[]) {
    for (const p of day?.partners ?? []) {
      if (p?.businessPartnerId) referencedIds.add(p.businessPartnerId);
    }
  }
  if (referencedIds.size === 0) return itinerary;

  const partnerRows = await db
    .select({ id: businessPartners.id, name: businessPartners.name, slug: businessPartners.slug, type: businessPartners.type, averageRating: businessPartners.averageRating, reviewCount: businessPartners.approvedReviewCount, approvalStatus: businessPartners.approvalStatus })
    .from(businessPartners)
    .where(inArray(businessPartners.id, Array.from(referencedIds)));
  const byId = new Map(partnerRows.map((p) => [p.id, p]));

  return (itinerary as any[]).map((day) => {
    if (!Array.isArray(day?.partners)) return day;
    return {
      ...day,
      partners: day.partners.map((p: any) => {
        if (!p?.businessPartnerId) return p;
        const live = byId.get(p.businessPartnerId);
        if (!live || live.approvalStatus !== 'approved') {
          const { businessPartnerId, ...rest } = p;
          return rest;
        }
        return { ...p, name: live.name, businessPartnerSlug: live.slug, businessPartnerType: live.type, businessPartnerRating: live.averageRating, businessPartnerReviewCount: live.reviewCount };
      }),
    };
  });
}

/** Splits raw tour input into columns that live on `tours` vs. the join tables. */
function splitTourData(tourData: Partial<Tour> & Record<string, unknown>) {
  const { category, author, ...rest } = tourData as Record<string, unknown>;

  const categoryIds = category === undefined ? undefined : (Array.isArray(category) ? category.map(String) : [String(category)]);
  const authorIds = author === undefined ? undefined : (Array.isArray(author) ? author.map(String) : [String(author)]);

  // Only keep known scalar/jsonb columns — extractTourFields may include
  // fields (like `dates`, `pricing`) that were only used to derive other
  // columns and don't map onto the tours table directly.
  const columnData: Partial<typeof tours.$inferInsert> = {};
  const allowedKeys = new Set([
    'title', 'code', 'excerpt', 'description', 'coverImage', 'file', 'tourStatus', 'outline',
    'destination', 'destinationId', 'itinerary', 'include', 'exclude', 'facts', 'faqs', 'gallery',
    'location', 'fixedDepartures', 'discount', 'pricingOptions', 'pricingGroups', 'tourDates',
    'enquiry', 'isSpecialOffer', 'views', 'bookingCount', 'price', 'pricePerPerson', 'minSize',
    'maxSize', 'groupSize', 'saleEnabled', 'salePrice', 'priceLockDate', 'pricingOptionsEnabled',
    'fixedDeparture', 'multipleDates', 'averageRating', 'approvedReviewCount', 'reviewCount',
    'paymentOptions',
  ]);

  for (const [key, value] of Object.entries(rest)) {
    if (!allowedKeys.has(key) || value === undefined) continue;
    if (key === 'destination') {
      (columnData as any).destinationId = value || null;
    } else {
      (columnData as any)[key] = value;
    }
  }

  return { columnData, categoryIds, authorIds };
}

export class TourService {
  /** Tours that aren't currently price-locked (no lock date, or lock date in the future). */
  private static notPriceLocked(): SQL {
    return sql`(${tours.priceLockDate} IS NULL OR ${tours.priceLockDate} > now())`;
  }

  static async getAllTours(filters: { destination?: string; category?: string; status?: string } = {}, paginationParams: TourPaginationParams & { cursor?: string }, sortOptions?: { field: string; order: 'asc' | 'desc' }, includeUnpublished: boolean = false) {
    const conditions: SQL[] = [this.notPriceLocked()];
    if (filters.destination) conditions.push(eq(tours.destinationId, filters.destination));
    if (filters.status) conditions.push(eq(tours.tourStatus, filters.status as 'Draft' | 'Published' | 'Archived'));
    if (!includeUnpublished) conditions.push(eq(tours.tourStatus, 'Published'));

    let where: SQL | undefined = and(...conditions);
    if (filters.category) {
      const matchingTourIds = db.select({ tourId: tourCategories.tourId }).from(tourCategories).innerJoin(globalCategories, eq(tourCategories.categoryId, globalCategories.id)).where(ilike(globalCategories.name, `%${filters.category}%`));
      where = and(where, inArray(tours.id, matchingTourIds))!;
    }

    const sortField = sortOptions?.field && (tours as any)[sortOptions.field] ? sortOptions.field : 'createdAt';
    const sortOrderFn = sortOptions?.order === 'asc' ? asc : desc;
    const orderColumn = (tours as any)[sortField];

    const page = paginationParams.page || 1;
    const limit = paginationParams.limit || 10;
    const skip = (page - 1) * limit;

    // Keyset ("seek") pagination for the default newest-first order: with
    // `cursor`, the query seeks past the last row seen instead of OFFSET-scanning
    // everything before it, so page 500 costs the same as page 1. Opaque cursor
    // comes back as `nextCursor`; the total count is skipped on cursor requests.
    if (paginationParams.cursor !== undefined && sortField === 'createdAt' && sortOptions?.order !== 'asc') {
      const [createdAtIso, cursorId] = Buffer.from(paginationParams.cursor, 'base64url').toString().split('|');
      const cursorDate = new Date(createdAtIso);
      const seek = cursorId && !Number.isNaN(cursorDate.getTime())
        ? sql`(${tours.createdAt}, ${tours.id}) < (${cursorDate.toISOString()}::timestamptz, ${cursorId})`
        : undefined;
      const seekRows = await db
        .select(LIST_COLUMNS)
        .from(tours)
        .where(seek ? and(where, seek) : where)
        .orderBy(desc(tours.createdAt), desc(tours.id))
        .limit(limit + 1);
      const hasMore = seekRows.length > limit;
      const pageRows = hasMore ? seekRows.slice(0, limit) : seekRows;
      const last = pageRows[pageRows.length - 1];
      const nextCursor = hasMore && last ? Buffer.from(`${last.createdAt.toISOString()}|${last.id}`).toString('base64url') : null;
      return { items: await attachRelations(pageRows), page: 1, limit, totalItems: null as number | null, totalPages: null as number | null, nextCursor };
    }

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select(LIST_COLUMNS).from(tours).where(where).orderBy(sortOrderFn(orderColumn)).limit(limit).offset(skip),
      db.select({ value: count() }).from(tours).where(where),
    ]);

    const items = await attachRelations(rows);
    return { items, page, limit, totalItems: totalItems as number | null, totalPages: Math.ceil(totalItems / limit) as number | null, nextCursor: undefined as string | null | undefined };
  }

  private static tourCacheKey(tourId: string) {
    return `tour:by-id:${tourId}`;
  }

  /** Invalidates a single cached tour plus every cached listing/search page — a tour edit can move it in or out of any of them. */
  private static async invalidateTourCaches(tourId: string) {
    await Promise.all([
      cacheDel(TourService.tourCacheKey(tourId)),
      cacheDelPattern('route:tour*'),
    ]);
  }

  static async getTourById(tourId: string) {
    const cached = await cacheGet<any>(TourService.tourCacheKey(tourId));
    if (cached) return cached;

    const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) {
      throw createHttpError(404, 'Tour not found');
    }

    const [enriched] = await attachRelations([tour]);

    // Enrich facts with current data from the master facts table.
    const factsArr = Array.isArray(enriched.facts) ? enriched.facts : [];
    if (factsArr.length > 0) {
      const factIds = factsArr.map((f: any) => f.factId).filter(Boolean);
      const masterFacts = factIds.length
        ? await db.select().from(factsTable).where(inArray(factsTable.id, factIds))
        : [];
      const masterById = new Map(masterFacts.map((f) => [f.id, f]));

      enriched.facts = factsArr.map((fact: any) => {
        const master = fact.factId ? masterById.get(fact.factId) : undefined;
        if (!master) return fact;
        return { ...fact, title: master.name, name: master.name, icon: master.icon, field_type: master.fieldType };
      });
    }

    enriched.itinerary = await enrichItineraryPartners(enriched.itinerary);

    await cacheSet(TourService.tourCacheKey(tourId), enriched, 60);
    return enriched;
  }

  static async createTour(tourData: Partial<Tour> & Record<string, unknown>, authorId: string) {
    const { columnData, categoryIds } = splitTourData(tourData);

    const [newTour] = await db
      .insert(tours)
      .values({ ...columnData, title: columnData.title!, code: columnData.code!, description: columnData.description! } as typeof tours.$inferInsert)
      .returning();

    await syncTourCategories(newTour.id, categoryIds);
    await syncTourAuthors(newTour.id, [authorId]);
    await syncTourItineraryPartners(newTour.id, columnData.itinerary as unknown[] | undefined);
    await reconcileItineraryRequests(newTour.id);

    const [enriched] = await attachRelations([newTour]);
    await cacheDelPattern('route:tour*');
    return enriched;
  }

  static async updateTour(tourId: string, updateData: Partial<Tour> & Record<string, unknown>, authorId?: string) {
    const where = authorId
      ? and(eq(tours.id, tourId), inArray(tours.id, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, authorId))))
      : eq(tours.id, tourId);

    const [existing] = await db.select({ id: tours.id }).from(tours).where(where).limit(1);
    if (!existing) {
      throw createHttpError(404, 'Tour not found or unauthorized');
    }

    const { columnData, categoryIds } = splitTourData(updateData);
    columnData.updatedAt = new Date();

    // Validate itinerary partner links before writing the tour row, so a
    // bad reference rejects the whole update rather than partially applying.
    await syncTourItineraryPartners(tourId, columnData.itinerary as unknown[] | undefined);

    const [updatedTour] = await db.update(tours).set(columnData).where(eq(tours.id, tourId)).returning();
    await syncTourCategories(tourId, categoryIds);
    await reconcileItineraryRequests(tourId);

    const [enriched] = await attachRelations([updatedTour]);
    await TourService.invalidateTourCaches(tourId);
    return enriched;
  }

  static async deleteTour(tourId: string, authorId?: string) {
    const where = authorId
      ? and(eq(tours.id, tourId), inArray(tours.id, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, authorId))))
      : eq(tours.id, tourId);

    const [deleted] = await db.delete(tours).where(where).returning();
    if (!deleted) {
      throw createHttpError(404, 'Tour not found or unauthorized');
    }
    await TourService.invalidateTourCaches(tourId);
    return deleted;
  }

  static async searchTours(searchParams: { keyword?: string; destination?: string; minPrice?: number; maxPrice?: number; rating?: number; category?: string }, paginationParams: TourPaginationParams) {
    const conditions: SQL[] = [eq(tours.tourStatus, 'Published')];

    if (searchParams.keyword) {
      conditions.push(or(ilike(tours.title, `%${searchParams.keyword}%`), ilike(tours.description, `%${searchParams.keyword}%`), ilike(tours.outline, `%${searchParams.keyword}%`))!);
    }
    if (searchParams.destination) conditions.push(eq(tours.destinationId, searchParams.destination));
    if (searchParams.minPrice !== undefined) conditions.push(gte(tours.price, searchParams.minPrice));
    if (searchParams.maxPrice !== undefined) conditions.push(lte(tours.price, searchParams.maxPrice));
    if (searchParams.rating !== undefined) conditions.push(gte(tours.averageRating, searchParams.rating));

    let where: SQL = and(...conditions)!;
    if (searchParams.category) {
      const matchingTourIds = db.select({ tourId: tourCategories.tourId }).from(tourCategories).where(eq(tourCategories.categoryId, searchParams.category));
      where = and(where, inArray(tours.id, matchingTourIds))!;
    }

    const page = paginationParams.page || 1;
    const limit = paginationParams.limit || 10;
    const skip = (page - 1) * limit;

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select(LIST_COLUMNS).from(tours).where(where).orderBy(desc(tours.createdAt)).limit(limit).offset(skip),
      db.select({ value: count() }).from(tours).where(where),
    ]);

    const items = await attachRelations(rows);
    return { items, page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) };
  }

  static async getToursBy(criteria: 'latest' | 'rating' | 'discounted' | 'special-offers', limit: number = 10) {
    const conditions: SQL[] = [eq(tours.tourStatus, 'Published')];
    let orderBy = desc(tours.createdAt);

    switch (criteria) {
      case 'latest':
        break;
      case 'rating':
        conditions.push(gt(tours.reviewCount, 0));
        orderBy = desc(tours.averageRating);
        break;
      case 'discounted':
        conditions.push(sql`(${tours.discount}->>'discountEnabled')::boolean IS TRUE`);
        break;
      case 'special-offers':
        conditions.push(eq(tours.isSpecialOffer, true));
        break;
    }

    const rows = await db.select(LIST_COLUMNS).from(tours).where(and(...conditions)).orderBy(orderBy).limit(limit);
    return attachRelations(rows);
  }

  /** Active (Published) tours a given user/agency is an author of, newest first. */
  static async getPublishedByAuthor(userId: string) {
    const rows = await db
      .select(LIST_COLUMNS)
      .from(tours)
      .where(and(eq(tours.tourStatus, 'Published'), inArray(tours.id, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId)))))
      .orderBy(desc(tours.createdAt));
    return attachRelations(rows);
  }

  static async getUserTours(userId: string, isAdmin: boolean, paginationParams: TourPaginationParams) {
    const where = isAdmin ? undefined : inArray(tours.id, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId)));

    const page = paginationParams.page || 1;
    const limit = paginationParams.limit || 10;
    const skip = (page - 1) * limit;

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select(LIST_COLUMNS).from(tours).where(where).orderBy(desc(tours.createdAt)).limit(limit).offset(skip),
      db.select({ value: count() }).from(tours).where(where),
    ]);

    const items = await attachRelations(rows);
    return { items, page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) };
  }

  static async getUserTourTitles(userId: string) {
    return db
      .select({ id: tours.id, title: tours.title, code: tours.code })
      .from(tours)
      .where(inArray(tours.id, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId))))
      .orderBy(desc(tours.createdAt));
  }

  /**
   * Buffers a view in Redis instead of writing to Postgres on every single
   * page view (this already runs fire-and-forget off the response path —
   * see simpleViewTracking — so the win here is fewer writes hitting the
   * tiny Neon compute under load, not response latency). A background
   * flusher (viewCounterFlusher.ts) periodically applies the accumulated
   * counts to Postgres. Falls back to writing straight to Postgres, as
   * before, if Redis is unavailable — a view is never silently dropped.
   */
  static async incrementTourViews(tourId: string) {
    try {
      const redis = getRedisClient();
      await redis.incr(`tour:views:pending:${tourId}`);
      await redis.sadd('tour:views:dirty', tourId);
    } catch (err) {
      console.error(`Buffering view for tour ${tourId} failed, writing straight to Postgres:`, (err as Error).message);
      await db.update(tours).set({ views: sql`${tours.views} + 1` }).where(eq(tours.id, tourId));
    }
  }

  static async incrementTourBookings(tourId: string) {
    const [updated] = await db.update(tours).set({ bookingCount: sql`${tours.bookingCount} + 1` }).where(eq(tours.id, tourId)).returning({ bookingCount: tours.bookingCount });
    if (!updated) {
      throw createHttpError(404, 'Tour not found');
    }
    return updated.bookingCount;
  }
}
