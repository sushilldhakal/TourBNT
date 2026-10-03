import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { db, posts, users } from '../../db';
import { eq, and, ne, desc, asc, count, sql, type SQL } from 'drizzle-orm';
import { canModeratePost, optionalViewerId } from './commentController';
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
    // This is the public list (blog, home page, sitemap): published posts only. Authors manage their drafts
    // through /posts/user.
    const conditions: SQL[] = [eq(posts.status, 'Published')];
    if (req.filters?.author) conditions.push(eq(posts.authorId, req.filters.author));
    // ?tag=food: posts carrying that tag (any letter case).
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().slice(0, 50) : '';
    if (tag) conditions.push(sql`exists (select 1 from jsonb_array_elements_text(${posts.tags}) t where lower(t) = lower(${tag}))`);
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

    // Drafts are visible to their author and admins (the dashboard editor loads them here), nobody else.
    if (!row || (row.post.status !== 'Published' && !(await canModeratePost(optionalViewerId(req), row.post.authorId)))) {
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

/**
 * Posts related to one post: other published posts ranked by how many tags they share with it, then newest.
 * If too few share a tag, the newest other posts fill the rest, so the section is never empty.
 * GET /api/v1/posts/:postId/related?limit=3
 */
export const getRelatedPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '3'), 10) || 3, 1), 12);

    const [current] = await db.select({ tags: posts.tags }).from(posts).where(eq(posts.id, postId)).limit(1);
    if (!current) return sendNotFoundError(res, 'Post not found');
    const tags = (current.tags ?? []).map((t) => String(t).toLowerCase().trim()).filter(Boolean);

    const shared = tags.length
      ? sql<number>`(select count(*) from jsonb_array_elements_text(${posts.tags}) t where lower(t) in (${sql.join(tags.map((t) => sql`${t}`), sql`, `)}))::int`
      : sql<number>`0`;

    const rows = await db
      .select({ id: posts.id, title: posts.title, image: posts.image, tags: posts.tags, createdAt: posts.createdAt, author: authorSelect, sharedTags: shared })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.status, 'Published'), ne(posts.id, postId)))
      .orderBy(desc(shared), desc(posts.createdAt))
      .limit(limit);

    sendSuccess(res, rows, 'Related posts');
  } catch (err) {
    console.error('Error fetching related posts:', err);
    next(createHttpError(500, 'Failed to get related posts'));
  }
};
