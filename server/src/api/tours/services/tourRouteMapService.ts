import { db, tours, globalDestinations, businessPartners } from '../../../db';
import { eq, inArray } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { geocodePlace, getCachedGeocode, type GeocodeBias } from '../../../services/geocodeService';

export interface RouteStop {
  /** e.g. "2B" (or just "7" when the day has a single stop). */
  label: string;
  day: number;
  kind: 'location' | 'meal' | 'stay';
  /** What is at this stop: the place itself, a restaurant, a hotel. */
  name: string;
  /** The place name this stop belongs to (the day's location). */
  place: string;
  lat: number;
  lng: number;
  /** True when this meal / hotel has no stored location and is drawn beside the town. */
  approximate?: boolean;
}

export interface RouteDay {
  day: number;
  title: string;
  place: string;
  stops: RouteStop[];
}

type Coord = { lat: number; lng: number };
const MAX_LOOKUPS_PER_REQUEST = 3;

const km = (a: Coord, b: Coord) => {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
/** A partner further than this from the day's place is treated as being at the place (data is usually just a loose "base" city). */
const NEAR_KM = 25;

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Builds the lettered route for a tour: per day, A is the day's location, then each meal
 * partner (B, C…), then the overnight stay last. Locations come from the global destinations
 * first, then OpenStreetMap lookups (cached, a few per request — `pending` says how many remain).
 */
export async function buildTourRouteMap(tourId: string) {
  const [tour] = await db.select({ itinerary: tours.itinerary, destinationId: tours.destinationId }).from(tours).where(eq(tours.id, tourId)).limit(1);
  if (!tour) throw createHttpError(404, 'Tour not found');
  const itinerary = (Array.isArray(tour.itinerary) ? tour.itinerary : []) as Array<Record<string, any>>;

  const [destinations, tourDest] = await Promise.all([
    db.select({ id: globalDestinations.id, name: globalDestinations.name, city: globalDestinations.city, country: globalDestinations.country, lat: globalDestinations.latitude, lng: globalDestinations.longitude }).from(globalDestinations),
    tour.destinationId ? db.select({ country: globalDestinations.country }).from(globalDestinations).where(eq(globalDestinations.id, tour.destinationId)).limit(1) : Promise.resolve([]),
  ]);
  const country = tourDest[0]?.country ?? 'Nepal';
  // Anchor the search on the tour's own region: place names repeat across a country (there is a Tatopani
  // in far-west Nepal and a "Pisang" that resolves to Kathmandu), so look only around where this tour is.
  const anchorRow = tour.destinationId ? destinations.find((d) => d.id === tour.destinationId) : undefined;
  const anchor: Coord | null = anchorRow && typeof anchorRow.lat === 'number' && typeof anchorRow.lng === 'number' ? { lat: anchorRow.lat, lng: anchorRow.lng } : null;
  const bias: GeocodeBias | undefined = anchor ? { viewbox: { west: anchor.lng - 1.2, east: anchor.lng + 1.2, south: anchor.lat - 1.2, north: anchor.lat + 1.2 } } : undefined;
  const withCoords = destinations.filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number');

  const partnerIds = [...new Set(itinerary.flatMap((d) => (d.partners ?? []).map((p: any) => p?.businessPartnerId)).filter(Boolean))] as string[];
  const partnerRows = partnerIds.length
    ? await db.select({ id: businessPartners.id, name: businessPartners.name, destinationId: businessPartners.destinationId, details: businessPartners.details }).from(businessPartners).where(inArray(businessPartners.id, partnerIds))
    : [];
  const partnerById = new Map(partnerRows.map((p) => [p.id, p]));
  const destById = new Map(withCoords.map((d) => [d.id, d]));

  /** A day's place text -> coordinates, via global destinations (id / exact / contains) then geocoding. */
  const placeCache = new Map<string, Coord | null>();
  let lookups = 0;
  let pending = 0;
  const resolvePlace = async (raw: string): Promise<Coord | null> => {
    const key = norm(raw);
    if (placeCache.has(key)) return placeCache.get(key)!;

    const byId = destById.get(raw.trim());
    const match = byId
      ?? withCoords.find((d) => norm(d.name) === key || norm(d.city ?? '') === key)
      ?? withCoords.find((d) => norm(d.name).startsWith(key) || key.startsWith(norm(d.name)));
    let result: Coord | null = match ? { lat: match.lat as number, lng: match.lng as number } : null;

    if (!result) {
      const query = `${raw}, ${country}`;
      const cached = getCachedGeocode(query, bias);
      if (cached !== undefined) result = cached;
      else if (lookups < MAX_LOOKUPS_PER_REQUEST) {
        lookups++;
        result = await geocodePlace(query, bias);
        if (!result && getCachedGeocode(query, bias) === undefined) pending++; // lookup failed this time; retry later
      } else pending++;
      // Never plot a result that is nowhere near the tour's region — better missing than wrong.
      if (result && anchor && km(result, anchor) > 250) result = null;
    }
    placeCache.set(key, result);
    return result;
  };

  const townVisits = new Map<string, number>();
  const days: RouteDay[] = [];
  const unresolved: string[] = [];
  // A day without its own destination is where the tour already is: the previous day's place, or for the
  // first day the tour's main destination. So a tour whose days name no place still gets a map.
  let previousPlace = tour.destinationId ?? '';
  for (let i = 0; i < itinerary.length; i++) {
    const d = itinerary[i];
    const ownPlace = d.destination != null ? String(d.destination).trim() : '';
    const placeRaw = ownPlace || previousPlace;
    previousPlace = placeRaw;
    const place = destById.get(placeRaw)?.name ?? placeRaw;
    if (!place) continue;
    const base = await resolvePlace(placeRaw);
    if (!base) {
      if (getCachedGeocode(`${placeRaw}, ${country}`, bias) === null || (anchor && pending === 0)) unresolved.push(place);
      continue;
    }

    const partners = (Array.isArray(d.partners) ? d.partners : []) as Array<Record<string, any>>;
    const own = (p: Record<string, any>): Coord | null => {
      const live = p.businessPartnerId ? partnerById.get(p.businessPartnerId) : undefined;
      const det = (live?.details ?? {}) as { latitude?: number; longitude?: number };
      const own: Coord | null =
        typeof det.latitude === 'number' && typeof det.longitude === 'number'
          ? { lat: det.latitude, lng: det.longitude }
          : live?.destinationId && destById.get(live.destinationId)
            ? { lat: destById.get(live.destinationId)!.lat as number, lng: destById.get(live.destinationId)!.lng as number }
            : null;
      // Only trust a partner's own spot when it is actually near where the day is; otherwise it is at the day's place.
      return own && km(own, base) <= NEAR_KM ? own : null;
    };

    // The A pin stays on the real town. If earlier days were already in this same town (rest day, two
    // nights), nudge this day's pins sideways so they don't sit exactly on top of each other.
    const townKey = `${base.lat.toFixed(3)},${base.lng.toFixed(3)}`;
    const visit = townVisits.get(townKey) ?? 0;
    townVisits.set(townKey, visit + 1);
    const dayBase: Coord = { lat: base.lat, lng: base.lng + visit * 0.007 };

    const pieces: Array<Pick<RouteStop, 'kind' | 'name'> & Coord & { approximate?: boolean }> = [{ kind: 'location', name: place, ...dayBase }];
    const extras = [
      ...partners.filter((p) => p.role === 'meals').map((p) => ({ kind: 'meal' as const, name: p.name, at: own(p) })),
      ...partners.filter((p) => p.role === 'accommodation').map((p) => ({ kind: 'stay' as const, name: p.name, at: own(p) })),
    ];
    // Partners have no stored coordinates, so a meal / hotel without one is drawn right beside the
    // day's town (a short fixed offset, in order) and marked approximate.
    extras.forEach((e, i) => {
      const angle = Math.PI / 4 + (i * Math.PI) / 2;
      const spot = e.at ?? { lat: dayBase.lat + 0.006 * Math.sin(angle), lng: dayBase.lng + 0.008 * Math.cos(angle) };
      pieces.push({ kind: e.kind, name: e.name, ...spot, approximate: !e.at });
    });

    const dayNo = i + 1;
    days.push({
      day: dayNo,
      title: d.title ?? '',
      place,
      stops: pieces.map((s, idx) => ({ ...s, day: dayNo, place, label: pieces.length === 1 ? String(dayNo) : `${dayNo}${String.fromCharCode(65 + idx)}` })),
    });
  }

  return { days, pending, unresolved };
}
