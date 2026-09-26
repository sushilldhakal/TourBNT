import { NextRequest } from 'next/server';
import { db, comments, posts } from '@tourbnt/db';
import { eq, inArray, count, desc } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import { sendPaginated, sendError, sendAuthError, sendForbiddenError, parsePagination, paginationMeta } from '@/lib/server/apiResponse';

/** GET /api/v1/comments — admin sees all comments, sellers see comments on their own posts. */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError();
    if (!hasRole(user, 'admin', 'seller')) return sendForbiddenError();

    const { page, limit, offset } = parsePagination(request.nextUrl.searchParams);
    const isAdmin = hasRole(user, 'admin');

    let where;
    if (!isAdmin) {
      const ownPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, user.id));
      const postIds = ownPosts.map((p) => p.id);
      where = postIds.length ? inArray(comments.postId, postIds) : eq(comments.postId, '__none__');
    }

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.query.comments.findMany({
        where,
        with: {
          user: { columns: { id: true, name: true, avatar: true } },
          post: { columns: { id: true, title: true, authorId: true } },
          replies: { with: { user: { columns: { id: true, name: true, avatar: true } } } },
        },
        orderBy: desc(comments.createdAt),
        limit,
        offset,
      }),
      db.select({ value: count() }).from(comments).where(where),
    ]);

    return sendPaginated(items, paginationMeta(page, limit, totalItems), 'All comments retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/comments:', error);
    return sendError('Failed to get comments');
  }
}
