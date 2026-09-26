import { db, users, type Db } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import mongoose from 'mongoose';

/**
 * Postgres-backed user repository — the single source of truth for identity.
 *
 * `createUser`/`loginUser`/`getCurrentUser` in userController.ts read and
 * write through here. Every other user-touching endpoint in this codebase
 * (profile, avatar, seller workflows, admin user management) has not been
 * migrated off Mongoose yet, so `dualWriteToMongo` mirrors new accounts into
 * the legacy MongoDB `User` collection under the *same* id — a standard
 * strangler-fig migration step that keeps those endpoints working during
 * the transition without requiring everything to move at once.
 */

export type PgUser = typeof users.$inferSelect;
export type NewPgUser = typeof users.$inferInsert;

/** A 24-char hex id valid as both a Postgres text primary key and a Mongo ObjectId. */
export function generateSharedUserId(): string {
  return new mongoose.Types.ObjectId().toString();
}

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

/**
 * Best-effort mirror of a newly created user into the legacy MongoDB
 * collection so not-yet-migrated controllers keep working. Never throws —
 * Postgres is the source of truth; a failure here is logged and swallowed.
 */
export async function dualWriteToMongo(user: PgUser): Promise<void> {
  if (mongoose.connection.readyState !== 1) return; // Mongo not connected — nothing to mirror to.

  try {
    const UserModel = (await import('./userModel')).default;
    await UserModel.create({
      _id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone ?? undefined,
      roles: user.role,
      verified: user.verified,
    });
  } catch (error) {
    console.warn('⚠️  Failed to mirror new user into legacy MongoDB collection (non-fatal):', error);
  }
}

export function computeSellerStatus(sellerInfo: Record<string, unknown> | null | undefined): 'none' | 'approved' | 'rejected' | 'pending' {
  if (!sellerInfo) return 'none';
  if (sellerInfo.isApproved) return 'approved';
  if (sellerInfo.rejectionReason) return 'rejected';
  return 'pending';
}

export type { Db };
