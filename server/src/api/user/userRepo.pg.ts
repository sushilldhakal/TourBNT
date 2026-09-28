import { db, users } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import type { SellerInfo } from './userTypes';

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
  return user;
}

export async function removeUser(id: string): Promise<PgUser | undefined> {
  const [user] = await db.delete(users).where(eq(users.id, id)).returning();
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
