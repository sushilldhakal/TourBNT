import { NextRequest } from 'next/server';
import { db, comments } from '@tourbnt/db';
import { eq, sql } from 'drizzle-orm';
import { sendSuccess, sendError, sendNotFoundError } from '@/lib/server/apiResponse';

/** PATCH — increment a comment's view count (public, no auth required). */
export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params;
    const [updated] = await db
      .update(comments)
      .set({ views: sql`${comments.views} + 1` })
      .where(eq(comments.id, commentId))
      .returning();

    if (!updated) return sendNotFoundError('Comment not found');
    return sendSuccess(updated, 'Comment view tracked successfully');
  } catch (error) {
    console.error('Error in PATCH /api/v1/comments/[commentId]/view:', error);
    return sendError('Failed to track comment view');
  }
}
