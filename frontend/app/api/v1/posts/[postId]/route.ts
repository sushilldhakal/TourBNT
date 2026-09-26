import { NextRequest } from 'next/server';
import { db, posts } from '@tourbnt/db';
import { eq, sql } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError, sendForbiddenError, sendNotFoundError, HTTP_STATUS } from '@/lib/server/apiResponse';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: { author: { columns: { id: true, name: true, avatar: true } } },
    });
    if (!post) return sendNotFoundError('Post not found');

    // View tracking (best-effort, matches the old simpleViewTracking behavior).
    await db.update(posts).set({ views: sql`${posts.views} + 1` }).where(eq(posts.id, postId));

    const breadcrumbs = [{ label: post.title, url: `/${postId}` }];
    return sendSuccess({ post, breadcrumbs }, 'Post retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/posts/[postId]:', error);
    return sendError('Failed to get post');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { postId } = await params;
    const [existing] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!existing) return sendNotFoundError('Post not found');

    if (existing.authorId !== user.id && !hasRole(user, 'admin')) {
      return sendForbiddenError('You are not authorized to edit this post');
    }

    const body = await request.json().catch(() => ({}));
    const updates: Partial<typeof posts.$inferInsert> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.status !== undefined) updates.status = body.status;
    if (body.image !== undefined) updates.image = body.image;
    if (body.enableComments !== undefined) updates.enableComments = Boolean(body.enableComments);
    if (body.content !== undefined) {
      updates.content = typeof body.content === 'string' ? body.content : JSON.stringify(body.content);
    }
    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags) ? body.tags : [body.tags];
    }
    updates.updatedAt = new Date();

    const [updated] = await db.update(posts).set(updates).where(eq(posts.id, postId)).returning();
    return sendSuccess(updated, 'Post updated successfully');
  } catch (error) {
    console.error('Error in PATCH /api/v1/posts/[postId]:', error);
    return sendError('Failed to edit post');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { postId } = await params;
    const [existing] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!existing) return sendNotFoundError('Post not found');

    if (existing.authorId !== user.id && !hasRole(user, 'admin')) {
      return sendForbiddenError('You are not authorized to delete this post');
    }

    await db.delete(posts).where(eq(posts.id, postId));
    return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
  } catch (error) {
    console.error('Error in DELETE /api/v1/posts/[postId]:', error);
    return sendError('Failed to delete post');
  }
}
