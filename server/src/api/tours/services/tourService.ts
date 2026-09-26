import { db, tours, tourCategories, tourAuthors, globalCategories, users, facts as factsTable } from '@tourbnt/db';
import { eq, and, or, ilike, gte, lte, gt, desc, asc, sql, inArray, count, type SQL } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { Tour } from '../tourTypes';

type TourRow = typeof tours.$inferSelect;

/** Simple numeric pagination params — tours never use the "all"/hybrid mode. */
interface TourPaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const AUTHOR_COLUMNS = { id: users.id, name: users.name, email: users.email, roles: users.role } as const;
const CATEGORY_COLUMNS = { id: globalCategories.id, name: globalCategories.name, description: globalCategories.description } as const;

/** Batches author/category lookups for a set of tours and merges them in. */
async function attachRelations(rows: TourRow[]): Promise<any[]> {
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

  static async getAllTours(filters: { destination?: string; category?: string; status?: string } = {}, paginationParams: TourPaginationParams, sortOptions?: { field: string; order: 'asc' | 'desc' }, includeUnpublished: boolean = false) {
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

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select().from(tours).where(where).orderBy(sortOrderFn(orderColumn)).limit(limit).offset(skip),
      db.select({ value: count() }).from(tours).where(where),
    ]);

    const items = await attachRelations(rows);
    return { items, page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) };
  }

  static async getTourById(tourId: string) {
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

    const [enriched] = await attachRelations([newTour]);
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

    const [updatedTour] = await db.update(tours).set(columnData).where(eq(tours.id, tourId)).returning();
    await syncTourCategories(tourId, categoryIds);

    const [enriched] = await attachRelations([updatedTour]);
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
      db.select().from(tours).where(where).orderBy(desc(tours.createdAt)).limit(limit).offset(skip),
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

    const rows = await db.select().from(tours).where(and(...conditions)).orderBy(orderBy).limit(limit);
    return attachRelations(rows);
  }

  static async getUserTours(userId: string, isAdmin: boolean, paginationParams: TourPaginationParams) {
    const where = isAdmin ? undefined : inArray(tours.id, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId)));

    const page = paginationParams.page || 1;
    const limit = paginationParams.limit || 10;
    const skip = (page - 1) * limit;

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select().from(tours).where(where).orderBy(desc(tours.createdAt)).limit(limit).offset(skip),
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

  static async incrementTourViews(tourId: string) {
    const [updated] = await db.update(tours).set({ views: sql`${tours.views} + 1` }).where(eq(tours.id, tourId)).returning({ views: tours.views });
    if (!updated) {
      throw createHttpError(404, 'Tour not found');
    }
    return updated.views;
  }

  static async incrementTourBookings(tourId: string) {
    const [updated] = await db.update(tours).set({ bookingCount: sql`${tours.bookingCount} + 1` }).where(eq(tours.id, tourId)).returning({ bookingCount: tours.bookingCount });
    if (!updated) {
      throw createHttpError(404, 'Tour not found');
    }
    return updated.bookingCount;
  }
}
