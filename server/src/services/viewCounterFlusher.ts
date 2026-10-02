import { db, tours } from '../db';
import { eq, sql } from 'drizzle-orm';
import { getRedisClient } from '../config/redisClient';

const DIRTY_SET_KEY = 'tour:views:dirty';
const pendingKey = (tourId: string) => `tour:views:pending:${tourId}`;

/**
 * Applies every tour's buffered view count (see TourService.incrementTourViews)
 * to Postgres in one pass, then clears it. Best-effort: a tour whose flush
 * fails is left dirty and picked up on the next tick rather than losing the
 * count.
 */
export async function flushViewCounters(): Promise<void> {
  const redis = getRedisClient();
  let tourIds: string[];
  try {
    tourIds = await redis.smembers(DIRTY_SET_KEY);
  } catch (err) {
    console.error('View counter flush: could not read dirty set:', (err as Error).message);
    return;
  }
  if (tourIds.length === 0) return;

  for (const tourId of tourIds) {
    try {
      // Atomically read the accumulated count and reset it to 0, so a view
      // buffered mid-flush isn't lost — it lands in the *next* tick's read.
      const raw = await redis.getset(pendingKey(tourId), '0');
      const delta = parseInt(raw ?? '0', 10) || 0;

      if (delta > 0) {
        await db.update(tours).set({ views: sql`${tours.views} + ${delta}` }).where(eq(tours.id, tourId));
      }
      await redis.srem(DIRTY_SET_KEY, tourId);
    } catch (err) {
      console.error(`View counter flush failed for tour ${tourId}, will retry next tick:`, (err as Error).message);
    }
  }
}

let intervalHandle: ReturnType<typeof setInterval> | undefined;

/** Starts periodically flushing buffered tour views to Postgres. Call once at server boot. */
export function startViewCounterFlusher(intervalMs = 30_000): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    flushViewCounters().catch((err) => console.error('View counter flush tick failed:', err.message));
  }, intervalMs);
  intervalHandle.unref?.(); // don't keep the process alive just for this timer
}

export function stopViewCounterFlusher(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = undefined;
  }
}
