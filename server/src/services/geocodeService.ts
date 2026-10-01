import fs from 'fs';
import path from 'path';

/**
 * Place name -> coordinates through OpenStreetMap's Nominatim.
 *
 * Nominatim's usage policy allows ~1 request per second and requires an identifying User-Agent,
 * so lookups run one at a time with spacing, and every answer (including "not found") is cached
 * in memory and in a small JSON file so a place is only ever looked up once.
 */
const CACHE_FILE = path.resolve(__dirname, '../../.cache/geocode-cache.json');
const MIN_GAP_MS = 1100;
const USER_AGENT = 'TourBNT/1.0 (itinerary route maps)';

type Coord = { lat: number; lng: number } | null;
let cache: Record<string, Coord> | null = null;
let lastCall = 0;
let queue: Promise<unknown> = Promise.resolve();

const keyOf = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

function load(): Record<string, Coord> {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { cache = {}; }
  return cache!;
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch { /* cache is best-effort */ }
}

/** Cached answer, or `undefined` if this place was never looked up. */
export function getCachedGeocode(query: string): Coord | undefined {
  const hit = load()[keyOf(query)];
  return hit === undefined ? undefined : hit;
}

/** Looks the place up (rate-limited, serialised) and caches the result. */
export function geocodePlace(query: string): Promise<Coord> {
  const key = keyOf(query);
  const cached = load()[key];
  if (cached !== undefined) return Promise.resolve(cached);

  const run = queue.then(async () => {
    const again = load()[key];
    if (again !== undefined) return again;

    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null; // transient (rate limit etc.): don't cache, try again later
      const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
      const found: Coord = rows[0] ? { lat: Number(rows[0].lat), lng: Number(rows[0].lon) } : null;
      load()[key] = found;
      persist();
      return found;
    } catch {
      return null;
    }
  });
  queue = run.catch(() => undefined);
  return run;
}
