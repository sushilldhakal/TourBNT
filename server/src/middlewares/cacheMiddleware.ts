import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '../config/redisClient';

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
 * No explicit invalidation: `ttlSeconds` bounds how stale a listing can be.
 * That's an accepted trade for not having to chase every write path that
 * could affect a given listing (see the write-up in userRepo.pg.ts for the
 * same trade-off applied to user data).
 */
export function cacheRoute(prefix: string, ttlSeconds: number, varyBy?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `route:${prefix}:${varyBy ? varyBy(req) + ':' : ''}${req.originalUrl}`;

    const cached = await cacheGet<{ status: number; body: unknown }>(key);
    if (cached) {
      res.status(cached.status).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void cacheSet(key, { status: res.statusCode, body }, ttlSeconds);
      }
      return originalJson(body);
    }) as Response['json'];

    next();
  };
}
