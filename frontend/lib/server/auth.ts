import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

/**
 * Server-side session helper for Next.js route handlers.
 *
 * The Express API and this Next.js app share the same httpOnly auth cookie
 * (`token`) and the same JWT_SECRET, so a session started via Express's
 * /api/v1/auth/login also authenticates requests handled directly by
 * Next.js — there is one login flow and one source of truth for identity.
 */

const COOKIE_NAME = 'token';

export interface SessionUser {
  id: string;
  roles: string[];
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not set — cannot verify sessions in the Next.js API routes.');
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload & { sub?: string; roles?: string | string[] };
    if (!decoded?.sub) return null;

    return {
      id: decoded.sub,
      roles: Array.isArray(decoded.roles) ? decoded.roles : decoded.roles ? [decoded.roles] : [],
    };
  } catch {
    return null;
  }
}

export function hasRole(user: SessionUser | null, ...allowed: string[]): boolean {
  if (!user) return false;
  const normalizedAllowed = allowed.map((r) => r.toLowerCase());
  return user.roles.some((r) => normalizedAllowed.includes(r.toLowerCase()));
}
