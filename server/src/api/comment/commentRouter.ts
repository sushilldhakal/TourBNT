import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import {
    getAllComments,
    getCommentWithReplies,
    getUnapprovedCommentsCount,
    addReply,
    likeComment
} from '../post/commentController';

const commentRouter = express.Router();

/**
 * GET /api/v1/comments — admin sees all comments, sellers see comments on their own posts.
 */
commentRouter.get('/', authenticate, authorizeRoles('admin', 'seller') as any, paginationMiddleware(), getAllComments);

/**
 * GET /api/v1/comments/unapproved/count — dashboard moderation badge count.
 * Must stay ahead of /:commentId/replies below (a literal path, not a param).
 */
commentRouter.get('/unapproved/count', authenticate, authorizeRoles('admin', 'seller') as any, getUnapprovedCommentsCount);

/**
 * GET /api/v1/comments/:commentId/replies — fully implemented but never
 * routed; the frontend has been calling this and getting a 404 the whole time.
 */
commentRouter.get('/:commentId/replies', authenticate, getCommentWithReplies);

/**
 * POST /api/v1/comments/:commentId/replies
 */
commentRouter.post('/:commentId/replies', authenticate, addReply);

/**
 * POST /api/v1/comments/:commentId/likes
 */
commentRouter.post('/:commentId/likes', authenticate, likeComment);

export default commentRouter;
