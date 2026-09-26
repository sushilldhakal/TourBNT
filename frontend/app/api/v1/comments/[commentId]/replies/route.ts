import { NextRequest } from 'next/server';
import { db, comments } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError, sendNotFoundError, sendValidationError, HTTP_STATUS } from '@/lib/server/apiResponse';

export async function POST(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('You must be logged in to reply.');

    const { commentId } = await params;
    const body = await request.json().catch(() => ({}));
    const text = body.text;
    if (!text) return sendValidationError('Text is required');

    const parent = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    if (!parent[0]) return sendNotFoundError('Parent comment not found');

    const [reply] = await db
      .insert(comments)
      .values({ postId: parent[0].postId, userId: user.id, parentId: commentId, text, approve: false })
      .returning();

    return sendSuccess(reply, 'Reply created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error in POST /api/v1/comments/[commentId]/replies:', error);
    return sendError('Failed to add reply');
  }
}
