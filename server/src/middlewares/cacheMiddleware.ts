import { Request, Response, NextFunction } from 'express';
import { cacheGetWithEpoch, cacheSetIfEpoch } from '../config/redisClient';

/**
 * Response cache for read-only, side-effect-free public GET endpoints
 * (listings, search, category/destination lookups). Keyed on the full
 * request URL, so distinct query strings (page, filters, sort) each get
 * their own entry.
 *
 * Do not attach this to a route whose handler has a side effect (e.g. the
 * tour-detail route also increments a view counter) — a cache hit skips
 * the handler entirely, so that side effect would stop firing.
 *
 * Freshness: writes invalidate the affected keys right away (see
 * services/cacheInvalidation.ts); `ttlSeconds` is only the safety net for a
 * write path that doesn't. A response is only stored if no invalidation ran
 * while its handler was working (cacheSetIfEpoch), so a slow request can't
 * write an old answer back after the write that should have replaced it.
 */
export function cacheRoute(prefix: string, ttlSeconds: number, varyBy?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `route:${prefix}:${varyBy ? varyBy(req) + ':' : ''}${req.originalUrl}`;

    const { value: cached, epoch } = await cacheGetWithEpoch<{ status: number; body: unknown }>(key);
    if (cached) {
      res.status(cached.status).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void cacheSetIfEpoch(key, { status: res.statusCode, body }, ttlSeconds, epoch);
      }
      return originalJson(body);
    }) as Response['json'];

    next();
  };
}
