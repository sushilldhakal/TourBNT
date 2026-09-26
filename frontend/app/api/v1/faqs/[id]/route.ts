import { NextRequest } from 'next/server';
import { db, faqs } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError, sendForbiddenError, sendNotFoundError, HTTP_STATUS } from '@/lib/server/apiResponse';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [faq] = await db.select().from(faqs).where(eq(faqs.id, id)).limit(1);
    if (!faq) return sendNotFoundError('FAQ not found');
    return sendSuccess({ faq }, 'FAQ retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/faqs/[id]:', error);
    return sendError('Server error, please try again later');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { id } = await params;
    const [existing] = await db.select().from(faqs).where(eq(faqs.id, id)).limit(1);
    if (!existing) return sendNotFoundError('FAQ not found');

    if (existing.userId !== user.id && !hasRole(user, 'admin')) {
      return sendForbiddenError('Not authorized to update this FAQ');
    }

    const body = await request.json().catch(() => ({}));
    const { question, answer } = body;

    const [updated] = await db
      .update(faqs)
      .set({
        question: question ?? existing.question,
        answer: answer ?? existing.answer,
        updatedAt: new Date(),
      })
      .where(eq(faqs.id, id))
      .returning();

    // Note: cascading this change into `tours.faqs` (JSONB snapshots) will
    // apply once the tours module is migrated to Postgres — see project notes.
    return sendSuccess({ faqs: updated, toursUpdated: 0 }, 'FAQ updated successfully');
  } catch (error) {
    console.error('Error in PATCH /api/v1/faqs/[id]:', error);
    return sendError('Server error, please try again later');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { id } = await params;
    const [existing] = await db.select().from(faqs).where(eq(faqs.id, id)).limit(1);
    if (!existing) return sendNotFoundError('FAQ not found');

    if (existing.userId !== user.id && !hasRole(user, 'admin')) {
      return sendForbiddenError('Not authorized to delete this FAQ');
    }

    await db.delete(faqs).where(eq(faqs.id, id));
    return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
  } catch (error) {
    console.error('Error in DELETE /api/v1/faqs/[id]:', error);
    return sendError('Server error, please try again later');
  }
}
