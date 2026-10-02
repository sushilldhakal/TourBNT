import Redis from 'ioredis';
import { config } from './config';

/**
 * Lazily created Redis client, mirroring src/db/client.ts: only
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

/**
 * False while the connection is down or reconnecting. Every cache helper below checks this first
 * and gives up immediately: otherwise each call sits through ioredis's retry cycle (seconds), and
 * a request that makes a dozen cache calls — or a write that invalidates a dozen families — would
 * take that long PER OUTAGE instead of simply skipping the cache. 'wait' = lazy client not yet used.
 */
function redisUsable(): boolean {
  const status = getRedis().status;
  return status === 'ready' || status === 'wait';
}

/** Returns the cached JSON value for `key`, or undefined on a miss or any Redis failure. */
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (!redisUsable()) return undefined;
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
  if (!redisUsable()) return ;
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`Redis SET ${key} failed:`, (err as Error).message);
  }
}

/** Best-effort cache invalidation; a failure here must never fail the caller's request. */
export async function cacheDel(key: string): Promise<void> {
  if (!redisUsable()) return ;
  try {
    await getRedis().del(key);
  } catch (err) {
    console.error(`Redis DEL ${key} failed:`, (err as Error).message);
  }
}

/**
 * Best-effort bulk invalidation of every key matching `pattern` (e.g. `route:tours:*`).
 * Uses SCAN rather than KEYS so it doesn't block Redis on a large keyspace.
 * Returns how many keys were removed (0 on failure).
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  let removed = 0;
  if (!redisUsable()) return removed;
  try {
    const redis = getRedis();
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      if (keys.length) removed += await redis.unlink(...keys);
    } while (cursor !== '0');
  } catch (err) {
    console.error(`Redis pattern invalidation ${pattern} failed:`, (err as Error).message);
  }
  return removed;
}

/** Best-effort removal of exact keys. Returns how many existed (0 on failure). */
export async function cacheDelKeys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  if (!redisUsable()) return 0;
  try {
    return await getRedis().unlink(...keys);
  } catch (err) {
    console.error('Redis key invalidation failed:', (err as Error).message);
    return 0;
  }
}

/**
 * Stale-write guard. Every invalidation bumps this counter; a cache fill remembers the value it saw
 * BEFORE it queried the database and is only stored if the counter is unchanged. Without it, a
 * request that read the old row just before a write could land its (now stale) response in Redis
 * just AFTER the invalidation and keep serving it until the TTL expires.
 */
const EPOCH_KEY = 'cache:epoch';

/** Cached JSON for `key` plus the current epoch, in one round trip. `epoch` is undefined if Redis failed. */
export async function cacheGetWithEpoch<T>(key: string): Promise<{ value?: T; epoch?: string }> {
  if (!redisUsable()) return {};
  try {
    const [[getErr, raw], [epochErr, epoch]] = (await getRedis().pipeline().get(key).get(EPOCH_KEY).exec()) as [
      [Error | null, string | null],
      [Error | null, string | null],
    ];
    if (getErr || epochErr) throw getErr || epochErr;
    return { value: raw ? (JSON.parse(raw) as T) : undefined, epoch: epoch ?? '0' };
  } catch (err) {
    console.error(`Redis GET ${key} failed (falling back to Postgres):`, (err as Error).message);
    return {};
  }
}

const SET_IF_EPOCH = `
if (redis.call('GET', KEYS[2]) or '0') == ARGV[2] then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[3]))
  return 1
end
return 0`;

/** Stores `value` only if no invalidation happened since `epoch` was read. Returns whether it was stored. */
export async function cacheSetIfEpoch(key: string, value: unknown, ttlSeconds: number, epoch: string | undefined): Promise<boolean> {
  if (epoch === undefined || !redisUsable()) return false;
  try {
    const stored = await getRedis().eval(SET_IF_EPOCH, 2, key, EPOCH_KEY, JSON.stringify(value), epoch, ttlSeconds);
    return stored === 1;
  } catch (err) {
    console.error(`Redis SET ${key} failed:`, (err as Error).message);
    return false;
  }
}

/** Marks "something was invalidated" so in-flight fills that started earlier are not stored. */
export async function bumpCacheEpoch(): Promise<void> {
  if (!redisUsable()) return ;
  try {
    await getRedis().incr(EPOCH_KEY);
  } catch (err) {
    console.error('Redis epoch bump failed:', (err as Error).message);
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
