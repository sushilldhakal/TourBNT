import { NextRequest } from 'next/server';
import { db, comments, posts } from '@tourbnt/db';
import { eq, and, inArray, count } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError } from '@/lib/server/apiResponse';

export async function GET(_request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError();

    let where = eq(comments.approve, false);
    if (!hasRole(user, 'admin')) {
      const ownPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, user.id));
      const postIds = ownPosts.map((p) => p.id);
      where = postIds.length
        ? and(eq(comments.approve, false), inArray(comments.postId, postIds))!
        : eq(comments.postId, '__none__');
    }

    const [{ value: unapprovedCount }] = await db.select({ value: count() }).from(comments).where(where);
    return sendSuccess({ unapprovedCount }, 'Unapproved comments count retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/comments/unapproved/count:', error);
    return sendError('Failed to get unapproved comments count');
  }
}
