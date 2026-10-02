import { db, tours, tourAuthors, users } from '../../../db';
import { and, eq, inArray, sql } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { TourService } from './tourService';

type SellerInfo = {
  companyName?: string;
  phone?: string;
  website?: string;
  businessAddress?: { city?: string; state?: string; country?: string };
  businessDescription?: string;
  isApproved?: boolean;
};

const roundRating = (weighted: number, reviews: number) => (reviews > 0 ? Math.round((weighted / reviews) * 10) / 10 : null);

/** Public view of one agency: company name (the account holder's name only if none is on file), contact details, rating rolled up over all its published tours. */
export async function getAgencyProfile(userId: string) {
  const [owner] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, sellerInfo: users.sellerInfo })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!owner) throw createHttpError(404, 'Agency not found');
  const info = (owner.sellerInfo ?? {}) as SellerInfo;
  if (!info.isApproved) throw createHttpError(404, 'Agency not found');

  const ownTourIds = db.select({ id: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, owner.id));
  const [stats] = await db
    .select({
      tourCount: sql<number>`count(*)::int`,
      reviews: sql<number>`coalesce(sum(${tours.approvedReviewCount}), 0)::int`,
      // Weighted by review count so one 5-star tour with a single review doesn't outweigh a 4.6 with 200.
      weighted: sql<number>`coalesce(sum(${tours.averageRating} * ${tours.approvedReviewCount}), 0)::float`,
    })
    .from(tours)
    .where(and(inArray(tours.id, ownTourIds), eq(tours.tourStatus, 'Published')));

  const reviews = stats?.reviews ?? 0;
  return {
    id: owner.id,
    name: info.companyName?.trim() || owner.name,
    description: info.businessDescription ?? null,
    phone: info.phone || owner.phone || null,
    email: owner.email,
    website: info.website || null,
    location: [info.businessAddress?.city, info.businessAddress?.country].filter(Boolean).join(', ') || null,
    rating: roundRating(stats?.weighted ?? 0, reviews),
    reviewCount: reviews,
    tourCount: stats?.tourCount ?? 0,
  };
}

/** The agency behind a tour (first author), for the contact card on the tour page. */
export async function getTourBusiness(tourId: string) {
  const [author] = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(eq(tourAuthors.tourId, tourId)).limit(1);
  if (!author) throw createHttpError(404, 'No business found for this tour');
  return getAgencyProfile(author.userId);
}

/** Agency page: profile + its active (Published) tours. */
export async function getAgencyWithTours(userId: string) {
  const [agency, agencyTours] = await Promise.all([getAgencyProfile(userId), TourService.getPublishedByAuthor(userId)]);
  return { agency, tours: agencyTours };
}

/** Agencies directory: approved sellers that currently run at least one published tour. */
export async function listAgencies(opts: { page: number; limit: number; search?: string }) {
  const { page, limit, search } = opts;
  const like = search ? `%${search.replace(/[%_\\]/g, '\\$&')}%` : null;

  const rows = await db.execute(sql`
    SELECT u.id,
           COALESCE(NULLIF(TRIM(u.seller_info->>'companyName'), ''), u.name) AS name,
           u.seller_info->>'businessDescription' AS description,
           CONCAT_WS(', ', NULLIF(u.seller_info->'businessAddress'->>'city', ''), NULLIF(u.seller_info->'businessAddress'->>'country', '')) AS location,
           COUNT(t.id)::int AS "tourCount",
           COALESCE(SUM(t.approved_review_count), 0)::int AS "reviewCount",
           COALESCE(SUM(t.average_rating * t.approved_review_count), 0)::float AS weighted
    FROM users u
    JOIN tour_authors ta ON ta.user_id = u.id
    JOIN tours t ON t.id = ta.tour_id AND t.tour_status = 'Published'
    WHERE (u.seller_info->>'isApproved')::boolean IS TRUE
      ${like ? sql`AND COALESCE(NULLIF(TRIM(u.seller_info->>'companyName'), ''), u.name) ILIKE ${like}` : sql``}
    GROUP BY u.id
    ORDER BY "reviewCount" DESC, name ASC
  `);

  const all = (rows as unknown as { rows?: any[] }).rows ?? (rows as unknown as any[]);
  const items = all.slice((page - 1) * limit, page * limit).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) || null,
    location: (r.location as string | null) || null,
    tourCount: r.tourCount as number,
    reviewCount: r.reviewCount as number,
    rating: roundRating(r.weighted as number, r.reviewCount as number),
  }));
  return { items, page, limit, totalItems: all.length, totalPages: Math.max(Math.ceil(all.length / limit), 1) };
}
