import Redis from 'ioredis';
import { config } from './config';

/**
 * Lazily created Redis client, mirroring packages/db/src/client.ts: only
 * connects on first use, and every caller treats Redis as best-effort —
 * a miss or connection error must fall back to Postgres, never break the
 * request. Redis is a cache in front of Neon, not a second source of truth.
 */
let _redis: Redis | undefined;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      // No commandTimeout: rate-limit-redis sends SCRIPT LOAD at module load, while startup is
      // still blocking the event loop, and a timed-out command there is an unhandled rejection
      // that crashes the API on boot.
      // Keep reconnecting with a capped backoff. Returning null here (the old behaviour) made a
      // single dropped connection disable the cache — and the Redis rate-limit store — until the
      // next restart, silently sending every request to the database.
      retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
    });
    _redis.on('error', (err) => {
      console.error('Redis error (falling back to Postgres):', err.message);
    });
  }
  return _redis;
}

/** Returns the cached JSON value for `key`, or undefined on a miss or any Redis failure. */
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await getRedis().get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch (err) {
    console.error(`Redis GET ${key} failed (falling back to Postgres):`, (err as Error).message);
    return undefined;
  }
}

/** Best-effort cache write; a failure here must never fail the caller's request. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`Redis SET ${key} failed:`, (err as Error).message);
  }
}

/** Best-effort cache invalidation; a failure here must never fail the caller's request. */
export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch (err) {
    console.error(`Redis DEL ${key} failed:`, (err as Error).message);
  }
}

/**
 * Best-effort bulk invalidation of every key matching `pattern` (e.g. `route:tours:*`).
 * Uses SCAN rather than KEYS so it doesn't block Redis on a large keyspace.
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      if (keys.length) await redis.unlink(...keys);
    } while (cursor !== '0');
  } catch (err) {
    console.error(`Redis pattern invalidation ${pattern} failed:`, (err as Error).message);
  }
}

/**
 * Atomically claims `key` for one-time use (e.g. a password-reset token):
 * true the first time it's called for that key within `ttlSeconds`, false
 * on every call after. Fails OPEN (returns true) if Redis is unavailable —
 * we can't enforce single-use without it, but that must never block a
 * legitimate reset/verify flow.
 */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    const result = await getRedis().set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    console.error(`Redis claim ${key} failed (allowing):`, (err as Error).message);
    return true;
  }
}

/**
 * Raw client for call sites that need primitives the helpers above don't
 * cover (INCR-based counters, a rate-limit store). Still best-effort —
 * callers must handle/tolerate a rejected promise themselves.
 */
export function getRedisClient(): Redis {
  return getRedis();
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = undefined;
  }
}
