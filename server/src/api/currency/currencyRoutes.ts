import express from 'express';
import { cacheGet, cacheSet } from '../../config/redisClient';
import { sendSuccess } from '../../utils/apiResponse';

/**
 * GET /api/v1/currency/rates — display-only exchange rates, relative to USD (the currency tours are priced and
 * charged in). The site shows converted prices as a convenience; bookings are always made in USD.
 *
 * Live rates come from open.er-api.com (free, no key; their terms ask for a visible attribution, which the currency
 * menu shows). They are cached for 12 hours. If the source is down we serve the last good rates, and if we have never
 * had any, rough built-in ones, flagged `source: 'fallback'`.
 */
const router = express.Router();

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'INR', 'NPR', 'SGD', 'JPY', 'CNY', 'AED', 'CHF'] as const;

// Rough values, used only when no live rate has ever been fetched. Not for billing.
const FALLBACK: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, AUD: 1.52, CAD: 1.37, INR: 83.5, NPR: 133.5, SGD: 1.35, JPY: 150, CNY: 7.2, AED: 3.67, CHF: 0.88 };

interface Rates { base: 'USD'; rates: Record<string, number>; updatedAt: string; source: 'live' | 'fallback' }

const CACHE_KEY = 'currency:rates:v1';
const TTL_SECONDS = 12 * 3600;
let lastGood: Rates | null = null;

async function fetchLive(): Promise<Rates | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (json.result !== 'success' || !json.rates) return null;
    const rates: Record<string, number> = {};
    for (const code of SUPPORTED_CURRENCIES) {
      const r = json.rates[code];
      if (typeof r === 'number' && r > 0) rates[code] = r;
    }
    if (!rates.USD || Object.keys(rates).length < 5) return null;
    return { base: 'USD', rates, updatedAt: new Date().toISOString(), source: 'live' };
  } catch {
    return null;
  }
}

export async function getRates(): Promise<Rates> {
  const cached = await cacheGet<Rates>(CACHE_KEY);
  if (cached) return cached;
  const live = await fetchLive();
  if (live) {
    lastGood = live;
    await cacheSet(CACHE_KEY, live, TTL_SECONDS);
    return live;
  }
  // Source unavailable: the last good rates, else built-in approximations. Cache briefly so we retry soon.
  const fallback = lastGood ?? { base: 'USD' as const, rates: FALLBACK, updatedAt: new Date().toISOString(), source: 'fallback' as const };
  await cacheSet(CACHE_KEY, fallback, 300);
  return fallback;
}

router.get('/rates', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    sendSuccess(res, await getRates(), 'Exchange rates');
  } catch (err) {
    next(err);
  }
});

export default router;
