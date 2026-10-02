import crypto from 'crypto';
import { db, users, businessPartners } from '../db';
import { eq } from 'drizzle-orm';

/** Turns a company/display name into a URL- and R2-key-safe slug. */
const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/**
 * Returns this user's tour-media folder (the R2 key prefix their uploads live
 * under), creating and persisting one on first use if they don't have one
 * yet. Called at onboarding approval time (seller/business-partner) so the
 * folder exists before they ever upload, and again — idempotently — from the
 * upload path itself as a fallback for any owner who uploads without having
 * gone through an approval step (e.g. an admin).
 */
export async function ensureMediaFolder(userId: string, preferredName?: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error(`ensureMediaFolder: user ${userId} not found`);
  }
  if (user.mediaFolder) {
    return user.mediaFolder;
  }

  let baseName = preferredName;
  if (!baseName) {
    const [partner] = await db
      .select({ name: businessPartners.name })
      .from(businessPartners)
      .where(eq(businessPartners.ownerId, userId))
      .limit(1);
    baseName = partner?.name || (user.sellerInfo as { companyName?: string } | null)?.companyName || user.name || user.email.split('@')[0];
  }

  let slug = slugify(baseName) || 'seller';
  // Guarantee uniqueness — append a short random suffix on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${crypto.randomBytes(3).toString('hex')}`;
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.mediaFolder, candidate)).limit(1);
    if (!existing) {
      slug = candidate;
      break;
    }
    if (attempt === 4) {
      slug = `${slug}-${crypto.randomBytes(4).toString('hex')}`;
    }
  }

  await db.update(users).set({ mediaFolder: slug, updatedAt: new Date() }).where(eq(users.id, userId));
  return slug;
}
