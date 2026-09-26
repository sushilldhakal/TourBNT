import { NextRequest } from 'next/server';
import { db, posts } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError, sendForbiddenError } from '@/lib/server/apiResponse';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { userId } = await params;
    if (!hasRole(user, 'admin') && user.id !== userId) return sendForbiddenError();

    const items = await db.query.posts.findMany({
      where: eq(posts.authorId, userId),
      with: { author: { columns: { id: true, name: true } } },
    });

    return sendSuccess(items, 'User posts retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/posts/user/[userId]:', error);
    return sendError('Failed to get posts');
  }
}
