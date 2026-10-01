import { db, tours, globalDestinations, businessPartners } from '@tourbnt/db';
import { eq, inArray } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { geocodePlace, getCachedGeocode } from '../../../services/geocodeService';

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

/** Spread stops that sit on the same coordinates around it, so each letter stays clickable. */
function spread(stops: RouteStop[]) {
  const groups = new Map<string, RouteStop[]>();
  for (const s of stops) {
    const k = `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const radius = 0.012; // ~1.3 km
    group.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      s.lat += radius * Math.sin(angle);
      s.lng += (radius * Math.cos(angle)) / Math.cos((s.lat * Math.PI) / 180);
    });
  }
}

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
      const cached = getCachedGeocode(query);
      if (cached !== undefined) result = cached;
      else if (lookups < MAX_LOOKUPS_PER_REQUEST) {
        lookups++;
        result = await geocodePlace(query);
        if (!result && getCachedGeocode(query) === undefined) pending++; // lookup failed this time; retry later
      } else pending++;
    }
    placeCache.set(key, result);
    return result;
  };

  const days: RouteDay[] = [];
  const unresolved: string[] = [];
  for (let i = 0; i < itinerary.length; i++) {
    const d = itinerary[i];
    const placeRaw = d.destination != null ? String(d.destination).trim() : '';
    const place = destById.get(placeRaw)?.name ?? placeRaw;
    if (!place) continue;
    const base = await resolvePlace(placeRaw);
    if (!base) {
      if (getCachedGeocode(`${placeRaw}, ${country}`) === null) unresolved.push(place);
      continue;
    }

    const partners = (Array.isArray(d.partners) ? d.partners : []) as Array<Record<string, any>>;
    const own = (p: Record<string, any>): Coord => {
      const live = p.businessPartnerId ? partnerById.get(p.businessPartnerId) : undefined;
      const det = (live?.details ?? {}) as { latitude?: number; longitude?: number };
      const own: Coord | null =
        typeof det.latitude === 'number' && typeof det.longitude === 'number'
          ? { lat: det.latitude, lng: det.longitude }
          : live?.destinationId && destById.get(live.destinationId)
            ? { lat: destById.get(live.destinationId)!.lat as number, lng: destById.get(live.destinationId)!.lng as number }
            : null;
      // Only trust a partner's own spot when it is actually near where the day is; otherwise it is at the day's place.
      return own && km(own, base) <= NEAR_KM ? own : base;
    };

    const pieces: Array<Pick<RouteStop, 'kind' | 'name'> & Coord> = [{ kind: 'location', name: place, ...base }];
    partners.filter((p) => p.role === 'meals').forEach((p) => pieces.push({ kind: 'meal', name: p.name, ...own(p) }));
    partners.filter((p) => p.role === 'accommodation').forEach((p) => pieces.push({ kind: 'stay', name: p.name, ...own(p) }));

    const dayNo = i + 1;
    days.push({
      day: dayNo,
      title: d.title ?? '',
      place,
      stops: pieces.map((s, idx) => ({ ...s, day: dayNo, place, label: pieces.length === 1 ? String(dayNo) : `${dayNo}${String.fromCharCode(65 + idx)}` })),
    });
  }

  spread(days.flatMap((d) => d.stops));
  return { days, pending, unresolved };
}
