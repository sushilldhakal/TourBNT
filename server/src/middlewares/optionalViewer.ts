import type { Request } from 'express';
import { verify } from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { config } from '../config/config';
import { db, users } from '../db';
import { COOKIE_NAMES } from '../utils/cookieUtils';

/**
 * The signed-in user on a PUBLIC route, if there is one: a valid, unexpired auth cookie. Unlike `authenticate`
 * it never rejects the request. The role is read from the database (not the token) so a changed role counts.
 */
export async function optionalViewer(req: Request): Promise<{ id: string; isAdmin: boolean } | null> {
  if (req.user) return { id: req.user.id, isAdmin: req.user.roles.includes('admin') };
  const token = req.cookies?.[COOKIE_NAMES.AUTH_TOKEN];
  if (!token) return null;
  let id: string | undefined;
  try {
    id = (verify(token, config.jwtSecret) as { sub?: string }).sub;
  } catch {
    return null;
  }
  if (!id) return null;
  const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  return u ? { id, isAdmin: u.role === 'admin' } : null;
}
