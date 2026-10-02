import { db, users } from '../../db';
import { eq } from 'drizzle-orm';
import type { SellerInfo } from './userTypes';
import { cacheGet, cacheSet, cacheDel } from '../../config/redisClient';

/**
 * Postgres-backed user repository — Drizzle is the single source of truth
 * for identity across the whole app.
 */

export type PgUser = typeof users.$inferSelect;
export type NewPgUser = typeof users.$inferInsert;

export async function findUserByEmail(email: string): Promise<PgUser | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function findUserById(id: string): Promise<PgUser | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

const USER_CACHE_TTL_SECONDS = 60;
const userCacheKey = (id: string) => `user:${id}`;

/**
 * Same as findUserById, but cached in Redis for USER_CACHE_TTL_SECONDS.
 * For the hot path — every authenticated request looks a user up by id —
 * where a short staleness window is an acceptable trade for skipping a
 * Postgres round trip. Writes that go through updateUser/removeUser below
 * invalidate the key immediately; a write elsewhere in the codebase that
 * bypasses this repo can leave a stale cached row for up to the TTL.
 */
export async function findUserByIdCached(id: string): Promise<PgUser | undefined> {
  const cached = await cacheGet<PgUser>(userCacheKey(id));
  if (cached) return cached;

  const user = await findUserById(id);
  if (user) await cacheSet(userCacheKey(id), user, USER_CACHE_TTL_SECONDS);
  return user;
}

export async function createUser(data: NewPgUser): Promise<PgUser> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<NewPgUser, 'id' | 'createdAt'>>
): Promise<PgUser | undefined> {
  const [user] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (user) await cacheDel(userCacheKey(id));
  return user;
}

export async function removeUser(id: string): Promise<PgUser | undefined> {
  const [user] = await db.delete(users).where(eq(users.id, id)).returning();
  if (user) await cacheDel(userCacheKey(id));
  return user;
}

export function computeSellerStatus(sellerInfo: SellerInfo | null | undefined): 'none' | 'approved' | 'rejected' | 'pending' {
  if (!sellerInfo) return 'none';
  if (sellerInfo.isApproved) return 'approved';
  if (sellerInfo.rejectionReason) return 'rejected';
  return 'pending';
}

/** Strips the password hash before a user row goes into an API response. */
export function withoutPassword<T extends { password?: unknown }>(user: T): Omit<T, 'password'> {
  const { password, ...rest } = user;
  return rest;
}
