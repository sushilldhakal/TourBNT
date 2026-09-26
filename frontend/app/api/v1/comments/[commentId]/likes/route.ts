import { NextRequest } from 'next/server';
import { db, comments, commentLikes } from '@tourbnt/db';
import { eq, and, sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError, sendNotFoundError } from '@/lib/server/apiResponse';

/** POST — toggle like on a comment for the current user. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { commentId } = await params;
    const existingLike = await db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, user.id)))
      .limit(1);

    let updated;
    if (existingLike[0]) {
      await db.delete(commentLikes).where(eq(commentLikes.id, existingLike[0].id));
      [updated] = await db
        .update(comments)
        .set({ likes: sql`greatest(${comments.likes} - 1, 0)` })
        .where(eq(comments.id, commentId))
        .returning();
    } else {
      await db.insert(commentLikes).values({ commentId, userId: user.id });
      [updated] = await db
        .update(comments)
        .set({ likes: sql`${comments.likes} + 1` })
        .where(eq(comments.id, commentId))
        .returning();
    }

    if (!updated) return sendNotFoundError('Comment not found');

    return sendSuccess({ ...updated, isLiked: !existingLike[0] }, 'Comment like toggled successfully');
  } catch (error) {
    console.error('Error in POST /api/v1/comments/[commentId]/likes:', error);
    return sendError('Failed to toggle comment like');
  }
}
