import express, { RequestHandler } from "express";
import { authenticate, authorizeRoles, requireOwnerOrAdmin } from "../../../middlewares/authenticate";
import { addFacts, getAllFacts, getUserFacts, updateFacts, getSingleFacts, deleteMultipleFacts, deleteFacts } from "./factsController";
import { uploadNone } from "../../../middlewares/multer";
import { asyncAuthHandler } from "../../../utils/routeWrapper";
import { paginationMiddleware } from "../../../middlewares/pagination";

const factsRouter = express.Router();

/**
 * @swagger
 * /api/v1/facts:
 *   get:
 *     summary: Get all facts
 *     description: Retrieve all tour facts (Admin or Seller only)
 *     tags: [Facts]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
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
 *       403:
 *         description: Forbidden
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * GET /api/v1/facts
 * List all facts (Admin or Seller only)
 */
factsRouter.get(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    paginationMiddleware,
    asyncAuthHandler(getAllFacts)
);

/**
 * POST /api/v1/facts
 * Create a new fact (Admin or Seller only)
 */
factsRouter.post(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    uploadNone,
    asyncAuthHandler(addFacts)
);

factsRouter.delete(
    '/:factId',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(deleteFacts)
);

/**
 * DELETE /api/v1/facts
 * Bulk delete facts (Admin or Seller only)
 */
factsRouter.delete(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(deleteMultipleFacts)
);

/**
 * @swagger
 * /api/v1/facts/user/{userId}:
 *   get:
 *     summary: Get user's facts
 *     description: Retrieve all facts created by a specific user (owner or admin)
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
 *       403:
 *         description: Forbidden
 */

/**
 * GET /api/v1/facts/user/:userId
 * Get facts created by a specific user
 * Owner of the facts or Admin
 */
factsRouter.get(
    '/user/:userId',
    authenticate,
    requireOwnerOrAdmin(req => req.params.userId),
    asyncAuthHandler(getUserFacts)
);

/**
 * @swagger
 * /api/v1/facts/{factId}:
 *   get:
 *     summary: Get fact by ID
 *     description: Retrieve a specific fact by its ID (owner or admin)
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
 *     responses:
 *       200:
 *         description: Fact retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Fact'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Fact not found
 *   patch:
 *     summary: Update fact
 *     description: Update a tour fact (owner or admin)
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
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Fact not found
 */

/**
 * GET /api/v1/facts/:factId
 * Get single fact (Owner or Admin)
 * Note: Ownership check is handled in the controller by looking up the fact's user field
 */
factsRouter.get(
    '/:factId',
    authenticate,
    asyncAuthHandler(getSingleFacts)
);

/**
 * PATCH /api/v1/facts/:factId
 * Update a fact (Owner or Admin)
 * Note: Ownership check is handled in the controller by looking up the fact's user field
 */
factsRouter.patch(
    '/:factId',
    authenticate,
    uploadNone,
    asyncAuthHandler(updateFacts)
);

export default factsRouter;