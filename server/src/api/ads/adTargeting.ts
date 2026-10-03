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
} from '../../db';
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
      ...toPublicAd(live.ad),
      business: { id: live.business.id, name: live.business.name, slug: live.business.slug, type: live.business.type },
    }));
}

/**
 * What any visitor may see of an ad: the creative and where it links. Price, views bought,
 * counters, payment and review details stay with the advertiser and admins.
 */
export function toPublicAd(ad: typeof advertisements.$inferSelect) {
  return {
    id: ad.id,
    businessPartnerId: ad.businessPartnerId,
    title: ad.title,
    description: ad.description,
    imageUrl: ad.imageUrl,
    ctaLabel: ad.ctaLabel,
    ctaUrl: ad.ctaUrl,
    placementSlot: ad.placementSlot,
  };
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

// Destinations with coordinates, for "near me". The list is a dozen rows that rarely change, so it is
// held in memory for 10 minutes instead of being queried per request.
const NEARBY_RADIUS_KM = 100;
const NEARBY_MAX = 3;
let destCoordsCache: { at: number; rows: { id: string; lat: number; lng: number }[] } | null = null;

async function getDestinationCoords() {
  if (destCoordsCache && Date.now() - destCoordsCache.at < 10 * 60_000) return destCoordsCache.rows;
  const rows = await db
    .select({ id: globalDestinations.id, lat: globalDestinations.latitude, lng: globalDestinations.longitude })
    .from(globalDestinations)
    .where(and(eq(globalDestinations.approvalStatus, 'approved'), isNotNull(globalDestinations.latitude), isNotNull(globalDestinations.longitude)));
  destCoordsCache = { at: Date.now(), rows: rows.map((r) => ({ id: r.id, lat: r.lat!, lng: r.lng! })) };
  return destCoordsCache.rows;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The destinations within a day trip (100 km) of a visitor, nearest first, at most 3. Empty when the
 * visitor is nowhere near any (e.g. browsing from abroad) — callers then fall back to other context.
 * The coordinates are used for this lookup only; they are not stored or logged.
 */
export async function resolveNearbyContext(lat: number, lng: number): Promise<AdContext> {
  const rows = await getDestinationCoords();
  const near = rows
    .map((r) => ({ id: r.id, km: distanceKm(lat, lng, r.lat, r.lng) }))
    .filter((r) => r.km <= NEARBY_RADIUS_KM)
    .sort((x, y) => x.km - y.km)
    .slice(0, NEARBY_MAX);
  return { destinationIds: near.map((r) => r.id), categoryIds: [] };
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

// ---------------------------------------------------------------------------
// "Where does this ad show?" — for the advertiser and admin dashboards.
// Mirrors the serving rules above, so what it reports is what visitors get.
// ---------------------------------------------------------------------------

export interface AdPlacementPreview {
  serving: boolean;
  /** Why it is not on the site right now (empty when serving). */
  blockers: string[];
  places: { id: string; name: string; source: 'business location' | 'business listing' | 'ad targeting' }[];
  tourTypes: { id: string; name: string }[];
  /** Published tours whose pages show this ad (first 50). */
  tours: { id: string; title: string }[];
  tourCount: number;
  /** Other surfaces, in plain words. */
  surfaces: string[];
}

export async function previewAdPlacements(ad: typeof advertisements.$inferSelect): Promise<AdPlacementPreview> {
  const now = new Date();
  const [business] = await db
    .select({ id: businessPartners.id, isActive: businessPartners.isActive, destinationId: businessPartners.destinationId })
    .from(businessPartners)
    .where(eq(businessPartners.id, ad.businessPartnerId))
    .limit(1);

  const [adDests, listed, cats] = await Promise.all([
    db.select({ id: globalDestinations.id, name: globalDestinations.name })
      .from(adDestinationTargets).innerJoin(globalDestinations, eq(adDestinationTargets.destinationId, globalDestinations.id))
      .where(eq(adDestinationTargets.adId, ad.id)),
    db.select({ id: globalDestinations.id, name: globalDestinations.name })
      .from(businessPartnerDestinations).innerJoin(globalDestinations, eq(businessPartnerDestinations.destinationId, globalDestinations.id))
      .where(eq(businessPartnerDestinations.businessPartnerId, ad.businessPartnerId)),
    db.select({ id: globalCategories.id, name: globalCategories.name })
      .from(adCategoryTargets).innerJoin(globalCategories, eq(adCategoryTargets.categoryId, globalCategories.id))
      .where(eq(adCategoryTargets.adId, ad.id)),
  ]);
  const home = business?.destinationId
    ? await db.select({ id: globalDestinations.id, name: globalDestinations.name }).from(globalDestinations).where(eq(globalDestinations.id, business.destinationId)).limit(1)
    : [];

  const places = new Map<string, AdPlacementPreview['places'][number]>();
  home.forEach((p) => places.set(p.id, { ...p, source: 'business location' }));
  listed.forEach((p) => places.has(p.id) || places.set(p.id, { ...p, source: 'business listing' }));
  adDests.forEach((p) => places.has(p.id) || places.set(p.id, { ...p, source: 'ad targeting' }));
  const placeList = [...places.values()];
  const placeIds = placeList.map((p) => p.id);
  const catIds = cats.map((c) => c.id);

  const blockers: string[] = [];
  if (ad.approvalStatus !== 'approved') blockers.push(ad.approvalStatus === 'rejected' ? 'Rejected by admin' : 'Waiting for admin review');
  if (!ad.isPaid) blockers.push('Payment not confirmed (admin must click "Mark paid")');
  if (ad.campaignStatus === 'paused') blockers.push('Paused');
  if (ad.campaignStatus === 'draft') blockers.push('Not started');
  if (ad.campaignStatus === 'ended') blockers.push('Campaign has ended');
  if (ad.startDate && ad.startDate > now) blockers.push(`Starts ${ad.startDate.toISOString().slice(0, 10)}`);
  if (ad.endDate && ad.endDate < now) blockers.push(`Ended ${ad.endDate.toISOString().slice(0, 10)}`);
  if (ad.billingModel === 'per_view' && ad.viewQuota != null && ad.impressionCount >= ad.viewQuota) blockers.push('All bought views used');
  if (business && !business.isActive) blockers.push('Business is deactivated');
  if (placeIds.length === 0 && catIds.length === 0) blockers.push('No places or tour types — nothing to match');

  const surfaces: string[] = [];
  let matchedTours: { id: string; title: string }[] = [];
  let tourCount = 0;
  const contextual = slotsServedBy(ad.placementSlot).length > 1;
  const placeNames = placeList.map((p) => p.name).join(', ');
  const typeNames = cats.map((c) => c.name).join(' or ');

  if (contextual && (placeIds.length > 0 || catIds.length > 0)) {
    const placeArr = sql`ARRAY[${sql.join(placeIds.map((id) => sql`${id}`), sql`, `)}]::text[]`;
    const catArr = sql`ARRAY[${sql.join(catIds.map((id) => sql`${id}`), sql`, `)}]::text[]`;
    // Same connection rules as resolveTourContext + findMatchingAds: the tour's main destination,
    // an approved destination named in an itinerary day, or an itinerary business's town — and,
    // if the ad has tour types, one of them.
    const placeMatch = placeIds.length === 0 ? sql`true` : sql`(
      ${tours.destinationId} = ANY(${placeArr})
      OR EXISTS (SELECT 1 FROM ${tourItineraryPartners} tip JOIN ${businessPartners} bp ON bp.id = tip.business_partner_id
                 WHERE tip.tour_id = ${tours.id} AND bp.destination_id = ANY(${placeArr}))
      OR EXISTS (SELECT 1 FROM jsonb_path_query(COALESCE(${tours.itinerary}, '[]'::jsonb), 'lax $.**.destination') AS v(place)
                 JOIN ${globalDestinations} g ON g.id = ANY(${placeArr}) AND length(g.name) >= 3
                 WHERE jsonb_typeof(v.place) = 'string' AND (v.place #>> '{}') ILIKE '%' || g.name || '%')
    )`;
    const typeMatch = catIds.length === 0 ? sql`true` : sql`EXISTS (
      SELECT 1 FROM ${tourCategories} tc WHERE tc.tour_id = ${tours.id} AND tc.category_id = ANY(${catArr})
    )`;
    const where = sql`${tours.tourStatus} = 'Published' AND ${placeMatch} AND ${typeMatch}`;
    const [rows, [{ n }]] = await Promise.all([
      db.select({ id: tours.id, title: tours.title }).from(tours).where(where).orderBy(tours.title).limit(50),
      db.select({ n: sql<number>`count(*)::int` }).from(tours).where(where),
    ]);
    matchedTours = rows;
    tourCount = n;

    surfaces.push(tourCount > 0
      ? `Sidebar of ${tourCount} tour page${tourCount === 1 ? '' : 's'} (listed below)`
      : 'Tour pages: no published tour matches yet');
    if (placeIds.length > 0) {
      surfaces.push(catIds.length > 0
        ? `Tours listing when filtered by ${placeNames} together with ${typeNames}`
        : `Tours listing filtered by ${placeNames}, and searches for those names`);
      surfaces.push(catIds.length > 0
        ? 'Not on destination pages (those have no tour type to match)'
        : `Destination pages: ${placeNames}`);
    } else {
      surfaces.push(`Tours listing filtered by ${typeNames}`);
    }
  } else if (ad.placementSlot === 'hotel_page') {
    surfaces.push(placeIds.length > 0 ? `Business profile pages of hotels/guesthouses in ${placeNames}` : 'Business profile pages: no places to match');
  } else if (ad.placementSlot === 'homepage') {
    surfaces.push('Placement "homepage": the site has no homepage ad slot, so this ad is never shown. Edit it to a tour placement.');
    blockers.push('Placement "homepage" is not shown anywhere on the site');
  }

  return {
    serving: blockers.length === 0 && (tourCount > 0 || surfaces.length > 0) && !surfaces.some((s) => s.includes('never shown')),
    blockers,
    places: placeList,
    tourTypes: cats,
    tours: matchedTours,
    tourCount,
    surfaces,
  };
}
