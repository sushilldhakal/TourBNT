import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { db, comments, commentLikes, posts, users } from '../../db';
import { eq, and, inArray, count, desc, sql, ilike } from 'drizzle-orm';
import { sendSuccess, sendPaginatedResponse } from '../../utils/apiResponse';

const userSelect = { id: users.id, name: users.name, avatar: users.avatar } as const;

const withReplies = async (parentIds: string[] | any) => {
  // Accepts explicit ids or a sub-select of ids (so it can run in the same round trip as the page).
  if (Array.isArray(parentIds) && parentIds.length === 0) return new Map<string, unknown[]>();

  const replies = await db
    .select({ reply: comments, user: userSelect })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(inArray(comments.parentId, parentIds));

  const byParent = new Map<string, unknown[]>();
  for (const { reply, user } of replies) {
    const list = byParent.get(reply.parentId!) || [];
    list.push({ ...reply, user });
    byParent.set(reply.parentId!, list);
  }
  return byParent;
};

// Create a new comment
export const addComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { post, text, likes } = req.body;
    const userId = req.user?.id || req.body.user;

    if (!userId) {
      return next(createHttpError(400, 'User ID is required. Please log in to comment.'));
    }
    if (!post || !text) {
      return next(createHttpError(400, 'Post ID and text are required'));
    }

    const [newComment] = await db
      .insert(comments)
      .values({ postId: post, userId, text, likes: likes || 0, approve: false })
      .returning();

    sendSuccess(res, newComment, 'Comment created successfully', 201);
  } catch (err) {
    console.error('Error adding comment:', err);
    next(createHttpError(500, 'Failed to add comment'));
  }
};

// Add a reply to a comment
export const addReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user?.id || req.body.user;

    if (!userId) {
      return next(createHttpError(400, 'User ID is required. Please log in to reply.'));
    }
    if (!text) {
      return next(createHttpError(400, 'Text is required'));
    }

    const [parentComment] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    if (!parentComment) {
      return next(createHttpError(404, 'Parent comment not found'));
    }

    const [newReply] = await db
      .insert(comments)
      .values({ postId: parentComment.postId, userId, parentId: commentId, text, likes: 0, views: 0, approve: false })
      .returning();

    sendSuccess(res, newReply, 'Reply created successfully', 201);
  } catch (err) {
    console.error('Error adding reply:', err);
    next(createHttpError(500, 'Failed to add reply'));
  }
};

// Like/unlike a comment
export const likeComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.body.userId || req.user?.id;

    if (!userId) {
      return next(createHttpError(400, 'User ID is required'));
    }

    const [existingLike] = await db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)))
      .limit(1);

    let updatedComment;
    if (existingLike) {
      await db.delete(commentLikes).where(eq(commentLikes.id, existingLike.id));
      [updatedComment] = await db
        .update(comments)
        .set({ likes: sql`greatest(${comments.likes} - 1, 0)` })
        .where(eq(comments.id, commentId))
        .returning();
    } else {
      await db.insert(commentLikes).values({ commentId, userId });
      [updatedComment] = await db
        .update(comments)
        .set({ likes: sql`${comments.likes} + 1` })
        .where(eq(comments.id, commentId))
        .returning();
    }

    if (!updatedComment) {
      return next(createHttpError(404, 'Comment not found'));
    }

    sendSuccess(res, { ...updatedComment, isLiked: !existingLike }, 'Comment like toggled successfully');
  } catch (err) {
    console.error('Error toggling comment like:', err);
    next(createHttpError(500, 'Failed to toggle comment like'));
  }
};

// Track comment view
export const viewComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;

    const [updatedComment] = await db
      .update(comments)
      .set({ views: sql`${comments.views} + 1` })
      .where(eq(comments.id, commentId))
      .returning();

    if (!updatedComment) {
      return next(createHttpError(404, 'Comment not found'));
    }

    sendSuccess(res, updatedComment, 'Comment view tracked successfully');
  } catch (err) {
    console.error('Error tracking comment view:', err);
    next(createHttpError(500, 'Failed to track comment view'));
  }
};

export const editComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;
    const approveRaw = req.body.approve;

    let approve: boolean;
    if (typeof approveRaw === 'string') {
      approve = approveRaw.toLowerCase() === 'true' || approveRaw === '1';
    } else if (typeof approveRaw === 'boolean') {
      approve = approveRaw;
    } else if (typeof approveRaw === 'number') {
      approve = approveRaw === 1;
    } else {
      approve = false;
    }

    const [existing] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    if (!existing) {
      return next(createHttpError(404, 'Comment not found'));
    }

    await db.update(comments).set({ approve }).where(eq(comments.id, commentId));

    const [row] = await db
      .select({ comment: comments, user: userSelect, post: { id: posts.id, title: posts.title, authorId: posts.authorId } })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .leftJoin(posts, eq(comments.postId, posts.id))
      .where(eq(comments.id, commentId));

    const repliesByParent = await withReplies([commentId]);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    sendSuccess(res, {
      ...row!.comment,
      user: row!.user,
      post: row!.post,
      replies: repliesByParent.get(commentId) || [],
    }, 'Comment updated successfully');
  } catch (err) {
    console.error('Error editing comment:', err);
    next(createHttpError(500, 'Failed to edit comment'));
  }
};

// Get comments for a specific post
export const getCommentsByPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;

    const where = eq(comments.postId, postId);

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db
        .select({ comment: comments, user: userSelect })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(where)
        .orderBy(desc(comments.createdAt))
        .limit(pageLimit)
        .offset(skip),
      db.select({ value: count() }).from(comments).where(where),
    ]);

    const repliesByParent = await withReplies(rows.map((r) => r.comment.id));
    const items = rows.map(({ comment, user }) => ({
      ...comment,
      user,
      replies: repliesByParent.get(comment.id) || [],
    }));

    sendPaginatedResponse(res, items, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Comments retrieved successfully');
  } catch (err) {
    console.error('Error fetching comments:', err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};

// Get a specific comment with its replies
export const getCommentWithReplies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;

    const [row] = await db
      .select({ comment: comments, user: userSelect })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, commentId));

    if (!row) {
      return next(createHttpError(404, 'Comment not found'));
    }

    const repliesByParent = await withReplies([commentId]);
    sendSuccess(res, { ...row.comment, user: row.user, replies: repliesByParent.get(commentId) || [] }, 'Comment with replies retrieved successfully');
  } catch (err) {
    console.error('Error fetching comment with replies:', err);
    next(createHttpError(500, 'Failed to get comment with replies'));
  }
};

export const getAllComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;
    const isAdmin = req.user?.roles.includes('admin') || false;

    let where;
    if (!isAdmin) {
      // Sub-select instead of a separate query for the seller's post ids (saves a round trip).
      where = inArray(comments.postId, db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, req.user!.id)));
    }

    // Server-side text search so the dashboard can page instead of downloading everything.
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      const match = ilike(comments.text, `%${q.replace(/[%_\\]/g, '\\$&')}%`);
      where = where ? and(where, match) : match;
    }

    const pageIds = db.select({ id: comments.id }).from(comments).where(where).orderBy(desc(comments.createdAt)).limit(pageLimit).offset(skip);

    const [rows, [{ value: totalComments }], repliesByParent] = await Promise.all([
      db
        .select({
          comment: comments,
          user: { id: users.id, name: users.name },
          post: { id: posts.id, title: posts.title, authorId: posts.authorId },
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .leftJoin(posts, eq(comments.postId, posts.id))
        .where(where)
        .orderBy(desc(comments.createdAt))
        .limit(pageLimit)
        .offset(skip),
      db.select({ value: count() }).from(comments).where(where),
      withReplies(pageIds),
    ]);

    const commentsWithReplies = rows.map(({ comment, user, post }) => ({
      ...comment,
      user,
      post,
      replies: repliesByParent.get(comment.id) || [],
    }));

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    sendPaginatedResponse(res, commentsWithReplies, {
      page,
      limit: pageLimit,
      totalItems: totalComments,
      totalPages: Math.ceil(totalComments / pageLimit),
    }, 'All comments retrieved successfully');
  } catch (err) {
    console.error('Error fetching comments:', err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};

export const getUnapprovedCommentsCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isAdmin = req.user?.roles.includes('admin') || false;

    let where = eq(comments.approve, false);
    if (!isAdmin) {
      const ownPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, req.user!.id));
      const postIds = ownPosts.map((p) => p.id);
      where = postIds.length
        ? and(eq(comments.approve, false), inArray(comments.postId, postIds))!
        : eq(comments.postId, '__none__');
    }

    const [{ value: unapprovedCount }] = await db.select({ value: count() }).from(comments).where(where);
    sendSuccess(res, { unapprovedCount }, 'Unapproved comments count retrieved successfully');
  } catch (err) {
    console.error('Error fetching unapproved comments count:', err);
    next(createHttpError(500, 'Failed to get unapproved comments count'));
  }
};

// Delete a comment (accepts comma-separated ids for backward compatibility)
export const deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;
    const idsArray = commentId.split(',').map((id) => id.trim());

    // Deleting a comment cascades to its replies (parent_id FK) and likes.
    await db.delete(comments).where(inArray(comments.id, idsArray));

    sendSuccess(res, null, 'Comment deleted successfully');
  } catch (err) {
    console.error('Error deleting comment:', err);
    next(createHttpError(500, 'Failed to delete comment'));
  }
};
