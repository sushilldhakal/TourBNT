import { NextRequest } from 'next/server';
import { db, posts } from '@tourbnt/db';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError } from '@/lib/server/apiResponse';

/** GET /api/v1/posts/user — the authenticated user's own posts. */
export async function GET(_request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const items = await db.query.posts.findMany({
      where: eq(posts.authorId, user.id),
      with: { author: { columns: { id: true, name: true } } },
      orderBy: desc(posts.createdAt),
    });

    return sendSuccess(items, 'User posts retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/posts/user:', error);
    return sendError('Failed to get posts');
  }
}
