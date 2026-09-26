import { NextRequest } from 'next/server';
import { db, faqs } from '@tourbnt/db';
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
 * FAQs are per-user reusable tour-FAQ templates, owned end-to-end by this
 * Next.js app (Postgres via Drizzle) — replacing the Express /api/v1/faqs
 * endpoints. Listing/reading is public, same as before.
 */

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset } = parsePagination(request.nextUrl.searchParams);

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.select().from(faqs).orderBy(desc(faqs.createdAt)).limit(limit).offset(offset),
      db.select({ value: count() }).from(faqs),
    ]);

    return sendPaginated(items, paginationMeta(page, limit, totalItems), 'FAQs retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/faqs:', error);
    return sendError('Server error, please try again later');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');
    if (!hasRole(user, 'admin', 'seller')) return sendForbiddenError();

    const body = await request.json().catch(() => ({}));
    const { question, answer } = body;
    if (!question || !answer) {
      return sendValidationError('Validation failed', [
        { field: 'question', message: 'question and answer are required' },
      ]);
    }

    const [faq] = await db.insert(faqs).values({ userId: user.id, question, answer }).returning();
    return sendSuccess(faq, 'FAQ created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error in POST /api/v1/faqs:', error);
    return sendError('Server error, please try again later');
  }
}

/** DELETE /api/v1/faqs — bulk delete, body: { ids: string[] } */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');
    if (!hasRole(user, 'admin', 'seller')) return sendForbiddenError();

    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return sendValidationError('Invalid or empty ids array');
    }

    const toDelete = await db.select().from(faqs).where(inArray(faqs.id, ids));
    const isAdmin = hasRole(user, 'admin');

    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      const faq = toDelete.find((f) => f.id === id);
      if (!faq) {
        failed.push({ id, error: 'FAQ not found' });
        continue;
      }
      if (faq.userId !== user.id && !isAdmin) {
        failed.push({ id, error: 'Not authorized to delete this FAQ' });
        continue;
      }
      await db.delete(faqs).where(eq(faqs.id, id));
      success.push(id);
    }

    return sendSuccess({ success, failed }, 'Bulk delete operation completed');
  } catch (error) {
    console.error('Error in DELETE /api/v1/faqs:', error);
    return sendError('Server error, please try again later');
  }
}
