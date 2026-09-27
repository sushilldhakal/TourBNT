import express from 'express';
import { db, posts } from '@tourbnt/db';
import { eq, sql } from 'drizzle-orm';
import { addPost, getPost, deletePost, editPost, getAllPosts, getUserPost, getAllUserPosts } from './postController';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import { filterSortMiddleware } from '../../middlewares/filterSort';
import { simpleViewTracking } from '../../middlewares/viewTracking';
import { uploadNone } from '../../middlewares/multer';
import {
  addComment,
  deleteComment,
  editComment,
  getCommentsByPost,
  getUnapprovedCommentsCount,
  addReply,
  likeComment,
  viewComment,
  getCommentWithReplies
} from './commentController';

const postRouter = express.Router();

// Post-related routes - RESTful patterns
postRouter.get('/',
  paginationMiddleware,
  filterSortMiddleware(['status', 'author'], ['createdAt', 'updatedAt', 'title', 'views']),
  getAllPosts
);

postRouter.post('/', uploadNone, authenticate as any, authorizeRoles('admin', 'seller') as any, addPost);

postRouter.get('/user', authenticate, getAllUserPosts);
postRouter.get('/user/:userId', authenticate, getUserPost);

postRouter.get('/:postId',
  simpleViewTracking('post', 'postId', async (postId) => {
    await db.update(posts).set({ views: sql`${posts.views} + 1` }).where(eq(posts.id, postId));
  }),
  getPost
);
postRouter.patch('/:postId', authenticate, uploadNone, editPost);
postRouter.delete('/:postId', authenticate, deletePost);

// Nested post resource routes - RESTful patterns
postRouter.get('/:postId/comments', paginationMiddleware, getCommentsByPost);
postRouter.post('/:postId/comments', authenticate, addComment);

// Old comment routes - kept for backward compatibility during migration
postRouter.post('/comment/:postId', authenticate, addComment);
postRouter.get('/comment/post/:postId', getCommentsByPost);
postRouter.get('/comment/unapproved/count', authenticate, getUnapprovedCommentsCount);
postRouter.patch('/comment/:commentId', authenticate, uploadNone, editComment);
postRouter.delete('/comment/:commentId', authenticate, deleteComment);

postRouter.post('/comment/reply/:commentId', authenticate, addReply);
postRouter.patch('/comment/like/:commentId', authenticate, likeComment);
postRouter.patch('/comment/view/:commentId', viewComment);
postRouter.get('/comment/:commentId/replies', getCommentWithReplies);

export default postRouter;
