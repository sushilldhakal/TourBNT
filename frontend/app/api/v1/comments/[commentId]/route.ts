import { NextRequest } from 'next/server';
import { db, comments } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError, sendNotFoundError } from '@/lib/server/apiResponse';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params;
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        user: { columns: { id: true, name: true, avatar: true } },
        replies: { with: { user: { columns: { id: true, name: true, avatar: true } } } },
      },
    });
    if (!comment) return sendNotFoundError('Comment not found');

    return sendSuccess(comment, 'Comment with replies retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/comments/[commentId]:', error);
    return sendError('Failed to get comment with replies');
  }
}

/** PATCH — approve/unapprove a comment (matches the old editComment behavior). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { commentId } = await params;
    const body = await request.json().catch(() => ({}));
    const approve = body.approve === true || body.approve === 'true' || body.approve === 1;

    const [updated] = await db.update(comments).set({ approve }).where(eq(comments.id, commentId)).returning();
    if (!updated) return sendNotFoundError('Comment not found');

    const full = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        user: { columns: { id: true, name: true, avatar: true } },
        post: { columns: { id: true, title: true, authorId: true } },
        replies: { with: { user: { columns: { id: true, name: true, avatar: true } } } },
      },
    });

    return sendSuccess(full, 'Comment updated successfully');
  } catch (error) {
    console.error('Error in PATCH /api/v1/comments/[commentId]:', error);
    return sendError('Failed to edit comment');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { commentId } = await params;
    // Support the legacy comma-separated bulk-delete form of this endpoint.
    const ids = commentId.split(',').map((id) => id.trim());

    for (const id of ids) {
      // Deleting a comment cascades to its replies (parent_id FK) and likes.
      await db.delete(comments).where(eq(comments.id, id));
    }

    return sendSuccess(null, 'Comment deleted successfully');
  } catch (error) {
    console.error('Error in DELETE /api/v1/comments/[commentId]:', error);
    return sendError('Failed to delete comment');
  }
}
