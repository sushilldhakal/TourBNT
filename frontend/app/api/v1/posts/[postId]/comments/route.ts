import { NextRequest } from 'next/server';
import { db, comments } from '@tourbnt/db';
import { eq, count, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/server/auth';
import {
  sendSuccess,
  sendPaginated,
  sendError,
  sendAuthError,
  sendValidationError,
  parsePagination,
  paginationMeta,
  HTTP_STATUS,
} from '@/lib/server/apiResponse';

/** GET /api/v1/posts/:postId/comments — public, top-level comments + their replies. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const { page, limit, offset } = parsePagination(request.nextUrl.searchParams);

    const where = eq(comments.postId, postId);

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.query.comments.findMany({
        where,
        with: {
          user: { columns: { id: true, name: true, avatar: true } },
          replies: { with: { user: { columns: { id: true, name: true, avatar: true } } } },
        },
        orderBy: desc(comments.createdAt),
        limit,
        offset,
      }),
      db.select({ value: count() }).from(comments).where(where),
    ]);

    return sendPaginated(items, paginationMeta(page, limit, totalItems), 'Comments retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/posts/[postId]/comments:', error);
    return sendError('Failed to get comments');
  }
}

/** POST /api/v1/posts/:postId/comments — add a top-level comment. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('You must be logged in to comment.');

    const { postId } = await params;
    const body = await request.json().catch(() => ({}));
    const text = body.text;
    if (!text) return sendValidationError('Text is required');

    const [comment] = await db
      .insert(comments)
      .values({ postId, userId: user.id, text, approve: false })
      .returning();

    return sendSuccess(comment, 'Comment created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error in POST /api/v1/posts/[postId]/comments:', error);
    return sendError('Failed to add comment');
  }
}
