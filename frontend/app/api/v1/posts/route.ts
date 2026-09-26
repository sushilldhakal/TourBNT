import { NextRequest } from 'next/server';
import { db, posts } from '@tourbnt/db';
import { count, desc, eq, asc, and, type SQL } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import {
  sendSuccess,
  sendPaginated,
  sendError,
  sendAuthError,
  sendForbiddenError,
  parsePagination,
  paginationMeta,
  HTTP_STATUS,
} from '@/lib/server/apiResponse';

/**
 * Blog posts, owned end-to-end by this Next.js app (Postgres via Drizzle) —
 * replacing the Express /api/v1/posts endpoints. Comments (see
 * app/api/v1/comments and app/api/v1/posts/[postId]/comments) reference
 * `posts.id` directly, which is only possible because posts live in the
 * same Postgres database as comments.
 */

const SORTABLE = new Set(['createdAt', 'updatedAt', 'title', 'views']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { page, limit, offset } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const author = searchParams.get('author');
    const sortField = searchParams.get('sort');
    const sortOrder = searchParams.get('order') === 'asc' ? asc : desc;

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(posts.status, status as 'Draft' | 'Published' | 'Archived'));
    if (author) conditions.push(eq(posts.authorId, author));
    const where = conditions.length ? and(...conditions) : undefined;

    const orderColumn = sortField && SORTABLE.has(sortField)
      ? posts[sortField as 'createdAt' | 'updatedAt' | 'title' | 'views']
      : posts.createdAt;

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.query.posts.findMany({
        where,
        with: { author: { columns: { id: true, name: true } } },
        orderBy: sortOrder(orderColumn),
        limit,
        offset,
      }),
      db.select({ value: count() }).from(posts).where(where),
    ]);

    return sendPaginated(items, paginationMeta(page, limit, totalItems), 'Posts retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/posts:', error);
    return sendError('Failed to get posts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');
    if (!hasRole(user, 'admin', 'seller')) return sendForbiddenError();

    const body = await request.json().catch(() => ({}));
    const { title, content, tags, image, status, enableComments } = body;
    if (!title || !content) {
      return sendError('Title and content are required', HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const [post] = await db
      .insert(posts)
      .values({
        title,
        content: typeof content === 'object' ? JSON.stringify(content) : content,
        authorId: user.id,
        tags: Array.isArray(tags) ? tags : [],
        image: image || '',
        status: status || 'Draft',
        enableComments: enableComments !== undefined ? enableComments : true,
      })
      .returning();

    return sendSuccess(post, 'Post created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error in POST /api/v1/posts:', error);
    return sendError('Failed to add post');
  }
}
