import express from 'express';
import { authenticate, isAdminOrSeller } from '../../middlewares/authenticate';
import { paginationMiddleware } from '../../middlewares/pagination';
import { getAllComments } from './commentController';

const commentRouter = express.Router();

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get all comments
 *     description: Retrieve all comments (admin sees all, sellers see comments on their posts)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalItems:
 *                           type: number
 *                         itemsPerPage:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
commentRouter.get('/', authenticate, isAdminOrSeller as any, paginationMiddleware, getAllComments);

export default commentRouter;
