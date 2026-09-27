import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { db, posts, users } from '@tourbnt/db';
import { eq, and, desc, asc, count, type SQL } from 'drizzle-orm';
import { HTTP_STATUS, sendSuccess, sendPaginatedResponse, sendNotFoundError, sendForbiddenError } from '../../utils/apiResponse';

const SORTABLE = new Set(['createdAt', 'updatedAt', 'title', 'views']);

const authorSelect = { id: users.id, name: users.name } as const;

// Add a new post
export const addPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, content, tags, image, status, enableComments } = req.body;
    const authorId = req.user?.id;

    if (!authorId) {
      return next(createHttpError(401, 'Not authenticated'));
    }

    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags || [];
    const parsedContent = typeof content === 'object' ? JSON.stringify(content) : content;

    const [savedPost] = await db
      .insert(posts)
      .values({
        title,
        content: parsedContent,
        authorId,
        tags: parsedTags,
        enableComments: enableComments !== undefined ? enableComments : true,
        image,
        status: status || 'Draft',
      })
      .returning();

    sendSuccess(res, savedPost, 'Post created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    console.error(err);
    next(createHttpError(500, 'Failed to add post'));
  }
};

// Get all posts with optional pagination, sorting, and filtering
export const getAllPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const conditions: SQL[] = [];
    if (req.filters?.status) conditions.push(eq(posts.status, req.filters.status));
    if (req.filters?.author) conditions.push(eq(posts.authorId, req.filters.author));
    const where = conditions.length ? and(...conditions) : undefined;

    const sortField = req.sort?.field && SORTABLE.has(req.sort.field) ? req.sort.field : 'createdAt';
    const sortOrder = req.sort?.order === 'asc' ? asc : desc;
    const orderColumn = posts[sortField as 'createdAt' | 'updatedAt' | 'title' | 'views'];

    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;

    const [items, [{ value: totalItems }]] = await Promise.all([
      db
        .select({ post: posts, author: authorSelect })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(where)
        .orderBy(sortOrder(orderColumn))
        .limit(pageLimit)
        .offset(skip),
      db.select({ value: count() }).from(posts).where(where),
    ]);

    const shaped = items.map(({ post, author }) => ({ ...post, author }));

    sendPaginatedResponse(res, shaped, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Posts retrieved successfully');
  } catch (err) {
    console.error('Error fetching posts:', err);
    next(createHttpError(500, 'Failed to get posts'));
  }
};

export const getAllUserPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isAdmin = req.user?.roles.includes('admin') || false;
    const where = isAdmin ? undefined : eq(posts.authorId, req.user!.id);

    const items = await db
      .select({ post: posts, author: authorSelect })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(where)
      .orderBy(desc(posts.createdAt));

    sendSuccess(res, items.map(({ post, author }) => ({ ...post, author })), 'User posts retrieved successfully');
  } catch (err) {
    console.error('Error fetching posts:', err);
    next(createHttpError(500, 'Failed to get posts'));
  }
};

// Get a specific post by ID
export const getPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;

    const [row] = await db
      .select({ post: posts, author: { id: users.id, name: users.name, avatar: users.avatar } })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, postId));

    if (!row) {
      return sendNotFoundError(res, 'Post not found');
    }

    const postObject = { ...row.post, author: row.author };
    const breadcrumbs = [{ label: postObject.title, url: `/${postId}` }];

    sendSuccess(res, { post: postObject, breadcrumbs }, 'Post retrieved successfully');
  } catch (err) {
    console.error('Error in getPost:', err);
    next(createHttpError(500, 'Failed to get post'));
  }
};

export const getUserPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;
    const isAdmin = req.user?.roles.includes('admin') || false;

    const where = isAdmin ? eq(posts.id, postId) : and(eq(posts.id, postId), eq(posts.authorId, req.user!.id));
    const [row] = await db
      .select({ post: posts, author: authorSelect })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(where);

    if (!row) {
      return sendNotFoundError(res, 'Post not found');
    }

    const post = { ...row.post, author: row.author };
    const breadcrumbs = [{ label: post.title, url: `/${postId}` }];

    sendSuccess(res, { post, breadcrumbs }, 'User post retrieved successfully');
  } catch (err) {
    console.error('Error getting post:', err);
    next(createHttpError(500, 'Failed to get post'));
  }
};

// Delete a post by ID
export const deletePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;

    const [existing] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!existing) {
      return sendNotFoundError(res, 'Post not found');
    }

    const isAdmin = req.user?.roles.includes('admin') || false;
    if (existing.authorId !== req.user?.id && !isAdmin) {
      return sendForbiddenError(res, 'You are not authorized to delete this post');
    }

    await db.delete(posts).where(eq(posts.id, postId));
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (err) {
    console.error('Error deleting post:', err);
    return sendNotFoundError(res, 'Failed to delete post');
  }
};

// Edit a post using PATCH
export const editPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;

    const [existing] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!existing) {
      return sendNotFoundError(res, 'Post not found');
    }

    const isAdmin = req.user?.roles.includes('admin') || false;
    if (existing.authorId !== req.user?.id && !isAdmin) {
      return sendForbiddenError(res, 'You are not authorized to edit this post');
    }

    const updates: Partial<typeof posts.$inferInsert> = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.image !== undefined) updates.image = req.body.image;

    if (req.body.content !== undefined) {
      updates.content = typeof req.body.content === 'string' ? req.body.content : JSON.stringify(req.body.content);
    }

    if (req.body.tags !== undefined) {
      let parsedTags = req.body.tags;
      if (typeof parsedTags === 'string') {
        try {
          parsedTags = JSON.parse(parsedTags);
        } catch {
          parsedTags = [parsedTags];
        }
      }
      updates.tags = Array.isArray(parsedTags) ? parsedTags : [parsedTags];
    }

    if (req.body.enableComments !== undefined) {
      updates.enableComments = req.body.enableComments === 'true' || req.body.enableComments === true;
    }

    updates.updatedAt = new Date();

    const [updatedPostDoc] = await db.update(posts).set(updates).where(eq(posts.id, postId)).returning();

    const [row] = await db
      .select({ post: posts, author: { id: users.id, name: users.name, avatar: users.avatar } })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, postId));

    sendSuccess(res, { ...(row?.post ?? updatedPostDoc), author: row?.author }, 'Post updated successfully');
  } catch (err) {
    console.error('Error editing post:', err);
    next(createHttpError(500, 'Failed to edit post'));
  }
};
