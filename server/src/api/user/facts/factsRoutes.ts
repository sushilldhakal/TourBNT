import express, { RequestHandler } from "express";
import { authenticate, isAdminOrSeller, AuthRequest } from "../../../middlewares/authenticate";
import { addFacts, getAllFacts, getUserFacts, updateFacts, getSingleFacts, deleteMultipleFacts } from "./factsController";
import { uploadNone } from "../../../middlewares/multer";
import { asyncHandler } from "../../../utils/routeWrapper";
import { paginationMiddleware } from "../../../middlewares/pagination";

const factsRouter = express.Router();

/**
 * @swagger
 * /api/facts:
 *   get:
 *     summary: Get all facts
 *     description: Retrieve all tour facts (PUBLIC)
 *     tags: [Facts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Facts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 facts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fact'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *   post:
 *     summary: Create tour fact
 *     description: Add a new tour fact (admin/seller only)
 *     tags: [Facts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *               - value
 *             properties:
 *               label:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       201:
 *         description: Fact created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Fact'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Bulk delete facts
 *     description: Delete multiple tour facts at once (admin/seller only)
 *     tags: [Facts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Facts deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: array
 *                   items:
 *                     type: string
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       error:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// GET /api/facts - List all facts with pagination (PUBLIC)
factsRouter.get('/', paginationMiddleware, asyncHandler(getAllFacts));

// POST /api/facts - Create fact (Protected, Admin or Seller)
factsRouter.post(
    '/',
    authenticate,
    uploadNone,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(addFacts)
);

// DELETE /api/facts - Bulk delete facts (Protected, Admin or Seller)
factsRouter.delete(
    '/',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(deleteMultipleFacts)
);

// Get Facts for a Specific User (Protected, Admin or Seller)
/**
 * @swagger
 * /api/facts/user/{userId}:
 *   get:
 *     summary: Get user's facts
 *     description: Retrieve all facts created by a specific user (admin/seller only)
 *     tags: [Facts]
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
 *         description: User facts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Fact'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
factsRouter.get(
    '/user/:userId',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(getUserFacts)
);

/**
 * @swagger
 * /api/facts/{factId}:
 *   get:
 *     summary: Get fact by ID
 *     description: Retrieve a specific fact by its ID (PUBLIC)
 *     tags: [Facts]
 *     parameters:
 *       - in: path
 *         name: factId
 *         required: true
 *         schema:
 *           type: string
 *         description: Fact ID
 *     responses:
 *       200:
 *         description: Fact retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Fact'
 *       404:
 *         description: Fact not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Update fact
 *     description: Update a tour fact (admin/seller only)
 *     tags: [Facts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: factId
 *         required: true
 *         schema:
 *           type: string
 *         description: Fact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Fact updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Fact'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// GET /api/facts/:factId - Get single fact (PUBLIC)
factsRouter.get('/:factId', asyncHandler(getSingleFacts));

// PATCH /api/facts/:factId - Update fact (Protected, Admin or Seller)
factsRouter.patch(
    '/:factId',
    authenticate,
    uploadNone,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(updateFacts)
);

export default factsRouter;