import { NextRequest } from 'next/server';
import { db, subscribers } from '@tourbnt/db';
import { count, desc, eq } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import {
  sendSuccess,
  sendPaginated,
  sendError,
  sendValidationError,
  sendConflictError,
  sendAuthError,
  sendForbiddenError,
  parsePagination,
  paginationMeta,
  HTTP_STATUS,
} from '@/lib/server/apiResponse';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/v1/subscribers — admin only, paginated.
 * Newsletter subscribers are owned end-to-end by this Next.js app: this
 * route is the single source of truth (Postgres via Drizzle), replacing
 * the old Express /api/v1/subscribers endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError();
    if (!hasRole(user, 'admin')) return sendForbiddenError();

    const { page, limit, offset } = parsePagination(request.nextUrl.searchParams);

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(limit).offset(offset),
      db.select({ value: count() }).from(subscribers),
    ]);

    return sendPaginated(items, paginationMeta(page, limit, totalItems), 'Subscribers retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/subscribers:', error);
    return sendError('Server error, please try again later');
  }
}

/**
 * POST /api/v1/subscribers — public.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return sendValidationError('Invalid request data', [{ field: 'email', message: 'A valid email is required' }]);
    }

    const existing = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
    if (existing.length > 0) {
      return sendConflictError('Email is already subscribed');
    }

    const [subscriber] = await db.insert(subscribers).values({ email }).returning();

    return sendSuccess({ subscriber }, 'Successfully subscribed to newsletter', HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error in POST /api/v1/subscribers:', error);
    return sendError('Server error, please try again later');
  }
}
