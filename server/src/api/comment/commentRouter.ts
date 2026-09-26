import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import {
    getAllComments,
    addReply,
    likeComment
} from '../post/commentController';

const commentRouter = express.Router();

/**
 * GET /api/v1/comments — admin sees all comments, sellers see comments on their own posts.
 */
commentRouter.get('/', authenticate, authorizeRoles('admin', 'seller') as any, paginationMiddleware, getAllComments);

/**
 * POST /api/v1/comments/:commentId/replies
 */
commentRouter.post('/:commentId/replies', authenticate, addReply);

/**
 * POST /api/v1/comments/:commentId/likes
 */
commentRouter.post('/:commentId/likes', authenticate, likeComment);

export default commentRouter;
