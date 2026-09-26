import { NextRequest } from 'next/server';
import { db, facts } from '@tourbnt/db';
import { count, desc, inArray, eq } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import {
  sendSuccess,
  sendPaginated,
  sendError,
  sendAuthError,
  sendForbiddenError,
  sendValidationError,
  parsePagination,
  paginationMeta,
  HTTP_STATUS,
} from '@/lib/server/apiResponse';

/**
 * Facts are per-user reusable tour-fact templates, owned end-to-end by this
 * Next.js app (Postgres via Drizzle) — replacing the Express /api/v1/facts
 * endpoints.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError();
    if (!hasRole(user, 'admin', 'seller')) return sendForbiddenError();

    const { page, limit, offset } = parsePagination(request.nextUrl.searchParams);

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.select().from(facts).orderBy(desc(facts.createdAt)).limit(limit).offset(offset),
      db.select({ value: count() }).from(facts),
    ]);

    return sendPaginated(items, paginationMeta(page, limit, totalItems), 'Facts retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/facts:', error);
    return sendError('Server error, please try again later');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');
    if (!hasRole(user, 'admin', 'seller')) return sendForbiddenError();

    const body = await request.json().catch(() => ({}));
    const { name, field_type, value, icon } = body;
    if (!name || !field_type) {
      return sendValidationError('Validation failed', [
        { field: 'name', message: 'name and field_type are required' },
      ]);
    }

    const [fact] = await db
      .insert(facts)
      .values({ userId: user.id, name, fieldType: field_type, value: value ?? [], icon })
      .returning();

    return sendSuccess(fact, 'Fact created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error in POST /api/v1/facts:', error);
    return sendError('Server error, please try again later');
  }
}

/** DELETE /api/v1/facts — bulk delete, body: { ids: string[] } */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return sendValidationError('Invalid or empty ids array');
    }

    const toDelete = await db.select().from(facts).where(inArray(facts.id, ids));
    const isAdmin = hasRole(user, 'admin');

    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      const fact = toDelete.find((f) => f.id === id);
      if (!fact) {
        failed.push({ id, error: 'Not found' });
        continue;
      }
      if (fact.userId !== user.id && !isAdmin) {
        failed.push({ id, error: 'Not authorized' });
        continue;
      }
      await db.delete(facts).where(eq(facts.id, id));
      success.push(id);
    }

    return sendSuccess({ success, failed }, 'Bulk delete operation completed');
  } catch (error) {
    console.error('Error in DELETE /api/v1/facts:', error);
    return sendError('Server error, please try again later');
  }
}
