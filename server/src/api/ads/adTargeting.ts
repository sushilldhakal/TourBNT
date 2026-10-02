import {
  db,
  advertisements,
  adCategoryTargets,
  adDestinationTargets,
  businessPartners,
  businessPartnerDestinations,
  globalDestinations,
  globalCategories,
  tours,
  tourCategories,
  tourItineraryPartners,
} from '@tourbnt/db';
import { and, eq, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { cacheGet, cacheSet } from '../../config/redisClient';

/**
 * Contextual ad matching.
 *
 * An ad's places are its explicit destination targets, plus its business's own
 * destination (a handcraft store in Pokhara targets Pokhara without doing
 * anything), plus the destinations the business is listed under. Its tour
 * types are its explicit category targets.
 *
 * An ad matches a page only through a real connection, never as filler:
 *   - it must target something (a place and/or a tour type),
 *   - if it targets places, the page must involve one of them, and
 *   - if it targets tour types, the page must involve one of them too.
 * Better matches (more overlapping places/types) are shown first; equal
 * matches rotate randomly so every matching business gets its turn.
 */

export interface AdContext {
  destinationIds: string[];
  categoryIds: string[];
}

/** Slots that show "relevant to this trip" ads. Any of them may fill any of the others. */
const CONTEXTUAL_SLOTS = ['tour_detail', 'tour_sidebar', 'search_results'] as const;

export function slotsServedBy(slot: string): string[] {
  return (CONTEXTUAL_SLOTS as readonly string[]).includes(slot) ? [...CONTEXTUAL_SLOTS] : [slot];
}

type LiveAd = {
  ad: typeof advertisements.$inferSelect;
  business: { id: string; name: string; slug: string; type: string; destinationId: string | null };
  destinationIds: Set<string>;
  categoryIds: Set<string>;
};

// The set of currently servable ads is small and changes rarely, so it is held in memory
// and rebuilt at most every 60s; matching a page against it is then pure computation.
const LIVE_TTL_MS = 60_000;
let liveCache: { at: number; ads: LiveAd[] } | null = null;
let liveLoading: Promise<LiveAd[]> | null = null;

/** Drop the in-memory index (call after any write that changes what may serve). */
export function invalidateLiveAds(): void {
  liveCache = null;
}

async function loadLiveAds(): Promise<LiveAd[]> {
  const now = new Date();

  // Campaigns past their end date, or per-view campaigns that used up their views, are over.
  await db.update(advertisements)
    .set({ campaignStatus: 'ended', updatedAt: now })
    .where(and(
      eq(advertisements.campaignStatus, 'active'),
      or(
        lt(advertisements.endDate, now),
        sql`(${advertisements.billingModel} = 'per_view' AND ${advertisements.viewQuota} IS NOT NULL AND ${advertisements.impressionCount} >= ${advertisements.viewQuota})`,
      ),
    ));

  const rows = await db
    .select({
      ad: advertisements,
      business: {
        id: businessPartners.id,
        name: businessPartners.name,
        slug: businessPartners.slug,
        type: businessPartners.type,
        destinationId: businessPartners.destinationId,
      },
    })
    .from(advertisements)
    .innerJoin(businessPartners, eq(advertisements.businessPartnerId, businessPartners.id))
    .where(and(
      eq(advertisements.campaignStatus, 'active'),
      eq(advertisements.approvalStatus, 'approved'),
      eq(advertisements.isPaid, true),
      eq(businessPartners.isActive, true),
      or(isNull(advertisements.startDate), lte(advertisements.startDate, now)),
      or(isNull(advertisements.endDate), gte(advertisements.endDate, now)),
    ));

  if (rows.length === 0) return [];
  const adIds = rows.map((r) => r.ad.id);
  const businessIds = [...new Set(rows.map((r) => r.business.id))];
  const [destRows, catRows, listedRows] = await Promise.all([
    db.select().from(adDestinationTargets).where(inArray(adDestinationTargets.adId, adIds)),
    db.select().from(adCategoryTargets).where(inArray(adCategoryTargets.adId, adIds)),
    // Destinations the business itself chose to be listed under ("Where you show up").
    db.select().from(businessPartnerDestinations).where(inArray(businessPartnerDestinations.businessPartnerId, businessIds)),
  ]);

  return rows.map(({ ad, business }) => {
    const destinationIds = new Set(destRows.filter((d) => d.adId === ad.id).map((d) => d.destinationId));
    if (business.destinationId) destinationIds.add(business.destinationId);
    listedRows.filter((l) => l.businessPartnerId === business.id).forEach((l) => destinationIds.add(l.destinationId));
    const categoryIds = new Set(catRows.filter((c) => c.adId === ad.id).map((c) => c.categoryId));
    return { ad, business, destinationIds, categoryIds };
  });
}

async function getLiveAds(): Promise<LiveAd[]> {
  if (liveCache && Date.now() - liveCache.at < LIVE_TTL_MS) return liveCache.ads;
  if (!liveLoading) {
    liveLoading = loadLiveAds()
      .then((ads) => {
        liveCache = { at: Date.now(), ads };
        return ads;
      })
      .finally(() => { liveLoading = null; });
  }
  return liveLoading;
}

export async function findMatchingAds(slot: string, ctx: AdContext, limit: number) {
  const slots = new Set(slotsServedBy(slot));
  const pageDest = new Set(ctx.destinationIds);
  const pageCat = new Set(ctx.categoryIds);
  if (pageDest.size === 0 && pageCat.size === 0) return [];

  const scored: { live: LiveAd; score: number }[] = [];
  for (const live of await getLiveAds()) {
    if (!slots.has(live.ad.placementSlot)) continue;
    // Per-view campaigns stop at their quota even before the index is rebuilt.
    if (live.ad.billingModel === 'per_view' && live.ad.viewQuota != null && live.ad.impressionCount >= live.ad.viewQuota) continue;
    const hasDest = live.destinationIds.size > 0;
    const hasCat = live.categoryIds.size > 0;
    if (!hasDest && !hasCat) continue;
    const destHits = [...live.destinationIds].filter((id) => pageDest.has(id)).length;
    const catHits = [...live.categoryIds].filter((id) => pageCat.has(id)).length;
    if (hasDest && destHits === 0) continue;
    if (hasCat && catHits === 0) continue;
    // Places outweigh tour types: being in the town the traveller visits is the stronger connection.
    scored.push({ live, score: destHits * 10 + catHits + Math.random() });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ live }) => ({
      ...live.ad,
      business: { id: live.business.id, name: live.business.name, slug: live.business.slug, type: live.business.type },
    }));
}

/**
 * Everything a tour page is "about": its main destination, every approved destination named
 * in its itinerary days (free text like "Pokhara, Nepal"), the home towns of the businesses
 * linked on its itinerary, and its categories. Cached for 10 minutes.
 */
export async function resolveTourContext(tourId: string): Promise<AdContext> {
  const key = `ads:tour-ctx:${tourId}`;
  const cached = await cacheGet<AdContext>(key);
  if (cached) return cached;

  const [tour] = await db
    .select({ destinationId: tours.destinationId, itinerary: tours.itinerary })
    .from(tours)
    .where(eq(tours.id, tourId))
    .limit(1);
  if (!tour) return { destinationIds: [], categoryIds: [] };

  const texts = itineraryPlaceTexts(tour.itinerary);
  const [named, partnerTowns, cats] = await Promise.all([
    texts.length
      ? db.select({ id: globalDestinations.id })
        .from(globalDestinations)
        .where(and(
          eq(globalDestinations.approvalStatus, 'approved'),
          // Very short names would match inside unrelated words.
          sql`length(${globalDestinations.name}) >= 3`,
          // Destination name appears inside any itinerary place text (case-insensitive).
          sql`EXISTS (SELECT 1 FROM unnest(ARRAY[${sql.join(texts.map((t) => sql`${t}`), sql`, `)}]::text[]) AS t(v) WHERE t.v ILIKE '%' || ${globalDestinations.name} || '%')`,
        ))
      : Promise.resolve([] as { id: string }[]),
    db.selectDistinct({ id: businessPartners.destinationId })
      .from(tourItineraryPartners)
      .innerJoin(businessPartners, eq(tourItineraryPartners.businessPartnerId, businessPartners.id))
      .where(and(eq(tourItineraryPartners.tourId, tourId), isNotNull(businessPartners.destinationId))),
    db.select({ id: tourCategories.categoryId }).from(tourCategories).where(eq(tourCategories.tourId, tourId)),
  ]);

  const destinationIds = new Set<string>();
  if (tour.destinationId) destinationIds.add(tour.destinationId);
  named.forEach((d) => destinationIds.add(d.id));
  partnerTowns.forEach((d) => d.id && destinationIds.add(d.id));

  const ctx = { destinationIds: [...destinationIds], categoryIds: cats.map((c) => c.id) };
  await cacheSet(key, ctx, 600);
  return ctx;
}

/** Destinations and categories whose name matches a search phrase ("pokhara", "trek"). */
export async function resolveSearchContext(q: string): Promise<AdContext> {
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return { destinationIds: [], categoryIds: [] };
  const pattern = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const [dests, cats] = await Promise.all([
    db.select({ id: globalDestinations.id }).from(globalDestinations)
      .where(and(eq(globalDestinations.approvalStatus, 'approved'), sql`${globalDestinations.name} ILIKE ${pattern}`))
      .limit(20),
    db.select({ id: globalCategories.id }).from(globalCategories)
      .where(and(eq(globalCategories.approvalStatus, 'approved'), sql`${globalCategories.name} ILIKE ${pattern}`))
      .limit(20),
  ]);
  return { destinationIds: dests.map((d) => d.id), categoryIds: cats.map((c) => c.id) };
}

function itineraryPlaceTexts(itinerary: unknown): string[] {
  // Stored either as a flat array of days or as { options: [[...days]] } from the editor.
  const days: unknown[] = Array.isArray(itinerary)
    ? itinerary
    : Array.isArray((itinerary as { options?: unknown[] })?.options)
      ? ((itinerary as { options: unknown[] }).options.flat() as unknown[])
      : [];
  const out = new Set<string>();
  for (const day of days) {
    const place = (day as { destination?: unknown })?.destination;
    if (typeof place === 'string' && place.trim()) out.add(place.trim().slice(0, 200));
  }
  return [...out].slice(0, 60);
}
