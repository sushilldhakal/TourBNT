import { and, eq, gt, or, sql } from 'drizzle-orm';
import { db, aiUsageLogs } from '../../db';
import { config } from '../../config/config';
import type { AIAttempt } from './aiRouter';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
/** A 'pending' row older than this is a crashed request and stops counting against the user. */
const PENDING_TTL_MS = 2 * MINUTE_MS;

export type AIReservation =
    | { allowed: true; logId: string; remainingToday: number }
    | { allowed: false; reason: 'user_daily' | 'user_minute' | 'global_daily'; retryAfterSeconds: number };

/** Rows that count toward limits: finished successes, plus requests still in flight. */
const counted = () =>
    or(
        eq(aiUsageLogs.status, 'success'),
        and(eq(aiUsageLogs.status, 'pending'), gt(aiUsageLogs.createdAt, new Date(Date.now() - PENDING_TTL_MS))),
    );

async function countSince(since: Date, userId?: string): Promise<number> {
    const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(aiUsageLogs)
        .where(and(counted(), gt(aiUsageLogs.createdAt, since), userId ? eq(aiUsageLogs.userId, userId) : undefined));
    return row?.n ?? 0;
}

/**
 * Claims one unit of the user's quota *before* any provider is called. The row is inserted first and
 * counted afterwards, so concurrent requests from one user can't all slip under the limit (they may
 * over-reject at the boundary, never over-admit). Only successes consume quota: a request that ends
 * in AI_LIMIT_REACHED or a provider error is not charged to the user.
 */
export async function reserveAIUsage(userId: string, option: string, promptChars: number): Promise<AIReservation> {
    const [row] = await db.insert(aiUsageLogs).values({ userId, option, promptChars, status: 'pending' }).returning({ id: aiUsageLogs.id });
    const logId = row.id;
    const now = Date.now();

    const [today, lastMinute, global] = await Promise.all([
        countSince(new Date(now - DAY_MS), userId),
        countSince(new Date(now - MINUTE_MS), userId),
        config.ai.globalDailyLimit > 0 ? countSince(new Date(now - DAY_MS)) : Promise.resolve(0),
    ]);

    const deny = async (reason: 'user_daily' | 'user_minute' | 'global_daily', retryAfterSeconds: number): Promise<AIReservation> => {
        await db.update(aiUsageLogs).set({ status: 'user_limit', attempts: [{ provider: reason, outcome: 'limit', latencyMs: 0 }] }).where(eq(aiUsageLogs.id, logId));
        return { allowed: false, reason, retryAfterSeconds };
    };

    if (lastMinute > config.ai.userPerMinuteLimit) return deny('user_minute', 60);
    if (today > config.ai.userDailyLimit) return deny('user_daily', 60 * 60);
    if (config.ai.globalDailyLimit > 0 && global > config.ai.globalDailyLimit) return deny('global_daily', 60 * 60);

    return { allowed: true, logId, remainingToday: Math.max(0, config.ai.userDailyLimit - today) };
}

export async function completeAIUsage(
    logId: string,
    result:
        | { status: 'success'; provider: string; model: string; completionChars: number }
        | { status: 'all_providers_exhausted' | 'provider_error' },
    attempts: AIAttempt[],
    latencyMs: number,
) {
    await db
        .update(aiUsageLogs)
        .set({
            status: result.status,
            attempts,
            latencyMs,
            ...(result.status === 'success' && { provider: result.provider, model: result.model, completionChars: result.completionChars }),
        })
        .where(eq(aiUsageLogs.id, logId));
}
