import express from 'express';
import { addPost, getPost, deletePost, editPost, getAllPosts, getUserPost, getAllUserPosts } from './postController';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import { filterSortMiddleware } from '../../middlewares/filterSort';
import { simpleViewTracking } from '../../middlewares/viewTracking';
import Post from './postModel';
import {
  addComment,
  deleteComment,
  editComment,
  getAllComments,
  getCommentsByPost,
  getUnapprovedCommentsCount,
  addReply,
  likeComment,
  viewComment,
  getCommentWithReplies
} from './commentController';

const postRouter = express.Router();

// Post-related routes - RESTful patterns

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts
 *     description: Retrieve all published blog posts with pagination and filtering
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Published, Archived]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, views]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *                 totalItems:
 *                   type: number
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 */
postRouter.get('/',
  paginationMiddleware,
  filterSortMiddleware(['status', 'author'], ['createdAt', 'updatedAt', 'title', 'views']),
  getAllPosts
);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new blog post (RESTful endpoint)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               coverImage:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Draft, Published, Archived]
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
postRouter.post('/', authenticate, authorizeRoles('admin', 'seller') as any, addPost);

/**
 * @swagger
 * /api/posts/user:
 *   get:
 *     summary: Get current user's posts
 *     description: Retrieve all posts created by the authenticated user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
postRouter.get('/user', authenticate, getAllUserPosts);

/**
 * @swagger
 * /api/posts/user/{userId}:
 *   get:
 *     summary: Get user's posts
 *     description: Retrieve all posts created by a specific user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
postRouter.get('/user/:userId', authenticate, getUserPost);

/**
 * @swagger
 * /api/posts/{postId}:
 *   get:
 *     summary: Get post by ID
 *     description: Retrieve a specific post by its ID with automatic view tracking
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Update post
 *     description: Update a post's content
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               coverImage:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Draft, Published, Archived]
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete post
 *     description: Delete a post permanently
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       204:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
postRouter.get('/:postId',
  simpleViewTracking('post', 'postId', async (postId) => {
    await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } });
  }),
  getPost
);
postRouter.patch('/:postId', authenticate, editPost);
postRouter.delete('/:postId', authenticate, deletePost);

// Nested post resource routes - RESTful patterns

/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a post
 *     description: Retrieve all comments for a specific post (PUBLIC)
 *     tags: [Posts, Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *                 totalItems:
 *                   type: number
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *   post:
 *     summary: Add comment to post
 *     description: Add a new comment to a specific post
 *     tags: [Posts, Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
postRouter.get('/:postId/comments', paginationMiddleware, getCommentsByPost);
postRouter.post('/:postId/comments', authenticate, addComment);

// Old comment routes - kept for backward compatibility during migration
postRouter.post('/comment/:postId', authenticate, addComment); // Add comment to a specific post
postRouter.get('/comment/post/:postId', getCommentsByPost);    // Get comments for a specific post
postRouter.get('/comment/unapproved/count', authenticate, getUnapprovedCommentsCount);
postRouter.patch('/comment/:commentId', authenticate, editComment); // Edit comment by ID
postRouter.delete('/comment/:commentId', authenticate, deleteComment); // Delete comment by ID

// New comment functionality routes
postRouter.post('/comment/reply/:commentId', authenticate, addReply); // Add reply to a comment
postRouter.patch('/comment/like/:commentId', authenticate, likeComment); // Like a comment
postRouter.patch('/comment/view/:commentId', viewComment); // Track comment view (no auth required)
postRouter.get('/comment/:commentId/replies', getCommentWithReplies); // Get a comment with its replies

export default postRouter;

/**
 * @swagger
 * /api/posts/comment/{postId}:
 *   post:
 *     summary: Add comment to post
 *     description: Add a new comment to a specific post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
