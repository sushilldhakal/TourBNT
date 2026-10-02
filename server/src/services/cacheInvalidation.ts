import type { NextFunction, Request, Response } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db, tourAuthors, tourItineraryPartners } from '../db';
import { bumpCacheEpoch, cacheDelKeys, cacheDelPattern } from '../config/redisClient';
import { logger } from '../utils/logger';

/**
 * Targeted invalidation for the Redis response cache (middlewares/cacheMiddleware.ts) and the
 * per-tour cache in TourService.getTourById.
 *
 * Writes call one of the invalidate* functions below; they work out which cached responses could
 * contain the changed data and remove only those. Nothing here flushes the database. The TTLs on
 * the cached routes stay as the safety net for any write path that doesn't call in here.
 *
 * Every function is best-effort and never throws: a Redis failure is logged and the write that
 * triggered it still succeeds (the stale entry then simply ages out via its TTL).
 *
 * What embeds what (this decides who must be invalidated):
 *  - tour detail   (`tour:by-id:<id>`)    tour row + authors + categories + each itinerary partner's
 *                                         live name/slug/type/rating (business_partners)
 *  - tour listings (route:tours*, tour-search*) tour columns + authors + categories. NO partner data.
 *  - home feed     latest tours, categories, destinations, approved reviews (+ reviewer name/avatar), posts
 *  - agency        users.seller_info + the user's published tours (tour_authors)
 *  - business partners (guide/hotel/guesthouse/restaurant/transport) have no cached public route of
 *    their own; they only reach the cache by being embedded in tour detail via tour_itinerary_partners.
 */

/** Cached route prefixes (the first argument of cacheRoute) whose responses list tours. */
export const TOUR_LISTING_PREFIXES = [
  'tours',
  'tours-search',
  'tours-latest',
  'tours-by-rating',
  'tours-discounted',
  'tours-special-offers',
  'tour-search',
  'tour-search-latest',
];

const tourDetailKey = (tourId: string) => `tour:by-id:${tourId}`;
// route:<prefix>:<originalUrl> — these two are per-id with a fixed URL, so they can be deleted
// exactly instead of scanned for.
const tourBusinessKey = (tourId: string) => `route:tour-business:/api/v1/tours/${tourId}/business`;
const agencyDetailKey = (userId: string) => `route:agency-detail:/api/v1/agencies/${userId}`;

const familyPattern = (prefix: string) => `route:${prefix}:*`;

async function removeFamilies(prefixes: string[]): Promise<number> {
  const counts = await Promise.all(prefixes.map((p) => cacheDelPattern(familyPattern(p))));
  return counts.reduce((a, b) => a + b, 0);
}

/** Runs the removal, bumps the stale-write epoch, and logs one line. Never throws. */
async function run(label: string, remove: () => Promise<number>, extra?: Record<string, unknown>): Promise<void> {
  try {
    // Epoch first: any fill that started before this point can no longer be stored.
    await bumpCacheEpoch();
    const removed = await remove();
    logger.info(`[cache] invalidated ${label}`, { keys: removed, ...extra });
  } catch (err) {
    logger.warn(`[cache] invalidation of ${label} failed — entries expire via TTL`, { error: (err as Error).message });
  }
}

async function tourIdsOfAuthor(userId: string): Promise<string[]> {
  const rows = await db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId));
  return rows.map((r) => r.tourId);
}

/**
 * Tours were created, edited, published/unpublished, deleted, or had their categories/partners
 * changed. Exact per-tour keys are deleted individually; listings are dropped as a family once,
 * however many tours are passed. Pass `authorIds` when the tour (and so its tour_authors rows) is
 * about to disappear.
 */
export async function invalidateTours(tourIds: string[], opts: { authorIds?: string[]; extraFamilies?: string[] } = {}): Promise<void> {
  if (tourIds.length === 0) return;
  let authorIds = opts.authorIds;
  if (!authorIds) {
    try {
      const rows = await db.selectDistinct({ userId: tourAuthors.userId }).from(tourAuthors).where(inArray(tourAuthors.tourId, tourIds));
      authorIds = rows.map((r) => r.userId);
    } catch (err) {
      authorIds = [];
      logger.warn('[cache] could not look up tour authors; agency pages will age out via TTL', { error: (err as Error).message });
    }
  }
  await run(tourIds.length === 1 ? `tour ${tourIds[0]}` : `${tourIds.length} tours`, async () => {
    const exact = await cacheDelKeys([...tourIds.flatMap((id) => [tourDetailKey(id), tourBusinessKey(id)]), ...authorIds!.map(agencyDetailKey)]);
    // A tour edit can move it into/out of any listing page or filter, so listings are dropped as a family.
    const families = await removeFamilies([...TOUR_LISTING_PREFIXES, 'home-feed', 'agencies-list', ...(opts.extraFamilies ?? [])]);
    return exact + families;
  }, { agencies: authorIds.length });
}

export const invalidateTour = (tourId: string, opts: { authorIds?: string[]; extraFamilies?: string[] } = {}) => invalidateTours([tourId], opts);

/**
 * A business partner (hotel, restaurant, guide, guesthouse, transport, …) changed its public name,
 * slug, type, approval state or rating. Only the tours that list it on an itinerary embed it.
 * Pass `tourIds` when the links are about to be removed (partner deletion).
 */
export async function invalidateBusinessPartner(partnerId: string, opts: { tourIds?: string[] } = {}): Promise<void> {
  let tourIds = opts.tourIds;
  if (!tourIds) {
    try {
      const rows = await db.selectDistinct({ tourId: tourItineraryPartners.tourId }).from(tourItineraryPartners).where(eq(tourItineraryPartners.businessPartnerId, partnerId));
      tourIds = rows.map((r) => r.tourId);
    } catch (err) {
      tourIds = [];
      logger.warn('[cache] could not look up tours for partner; they will age out via TTL', { partnerId, error: (err as Error).message });
    }
  }
  await run(`business partner ${partnerId}`, () => cacheDelKeys(tourIds!.map(tourDetailKey)), { affectedTours: tourIds.length });
}

/** Tour-level inputs to an agency's page changed (seller profile, approval). */
export async function invalidateAgency(userId: string): Promise<void> {
  let tourIds: string[] = [];
  try {
    tourIds = await tourIdsOfAuthor(userId);
  } catch (err) {
    logger.warn('[cache] could not look up agency tours; they will age out via TTL', { userId, error: (err as Error).message });
  }
  await run(`agency ${userId}`, async () => {
    const exact = await cacheDelKeys([agencyDetailKey(userId), ...tourIds.flatMap((id) => [tourDetailKey(id), tourBusinessKey(id)])]);
    // Listings embed the author's name/email, and the agency directory lists every agency.
    const families = await removeFamilies([...TOUR_LISTING_PREFIXES, 'agencies-list']);
    return exact + families;
  }, { affectedTours: tourIds.length });
}

// users columns that show up in a cached public response (author block on tours, reviewer on the
// home feed, agency page). Anything else — last login, tokens, settings — never reaches the cache.
const PUBLIC_USER_FIELDS = new Set(['name', 'email', 'phone', 'avatar', 'role', 'sellerInfo']);

/** A user row changed. No-op unless one of the changed fields is publicly displayed. */
export async function invalidateUser(userId: string, changedFields?: string[]): Promise<void> {
  if (changedFields && !changedFields.some((f) => PUBLIC_USER_FIELDS.has(f))) return;
  await invalidateAgency(userId);
  await run(`user ${userId} (reviewer name/avatar)`, () => removeFamilies(['home-feed', 'reviews']));
}

/** Drops whole route families (categories, destinations, posts, reviews, …). */
export async function invalidateFamilies(prefixes: string[], label = prefixes.join(',')): Promise<void> {
  await run(`families ${label}`, () => removeFamilies(prefixes));
}

/**
 * Router middleware for write endpoints of simple aggregate resources (categories, destinations,
 * posts, reviews): after a successful (2xx/3xx) POST/PUT/PATCH/DELETE, drop `prefixes` BEFORE the
 * response goes out, so the client's very next GET can't be served the old copy.
 */
export function invalidateOnWrite(prefixes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 400) return originalJson(body);
      void invalidateFamilies(prefixes, `${req.method} ${req.baseUrl}${req.path}`).finally(() => originalJson(body));
      return res;
    }) as Response['json'];
    next();
  };
}
