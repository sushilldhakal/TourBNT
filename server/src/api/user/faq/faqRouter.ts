import express, { RequestHandler } from "express";
import { authenticate, authorizeRoles, requireOwnerOrAdmin } from "../../../middlewares/authenticate";
import {
  addFaqs,
  getAllFaqs,
  getUserFaqs,
  updateFaqs,
  getSingleFaqs,
  deleteFaqs,
  bulkDeleteFaqs
} from "./faqController";
import { uploadNone } from "../../../middlewares/multer";
import { asyncAuthHandler } from "../../../utils/routeWrapper";
import { paginationMiddleware } from "../../../middlewares/pagination";

const faqsRouter = express.Router();

/**
 * @swagger
 * /api/faqs:
 *   get:
 *     summary: Get all FAQs
 *     description: Retrieve all frequently asked questions with pagination (PUBLIC)
 *     tags: [FAQs]
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: FAQs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 faqs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FAQ'
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
 *     summary: Create FAQ
 *     description: Add a new frequently asked question (admin/seller only)
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *     responses:
 *       201:
 *         description: FAQ created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FAQ'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   delete:
 *     summary: Bulk delete FAQs
 *     description: Delete multiple FAQs at once (admin/seller only)
 *     tags: [FAQs]
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
 *         description: FAQs deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * GET /api/faqs
 * List all FAQs (PUBLIC)
 */
faqsRouter.get('/', paginationMiddleware, asyncAuthHandler(getAllFaqs));

/**
 * POST /api/faqs
 * Create FAQ (Admin or Seller)
 */
faqsRouter.post(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    uploadNone,
    asyncAuthHandler(addFaqs)
);

/**
 * DELETE /api/faqs
 * Bulk delete FAQs (Admin or Seller)
 */
faqsRouter.delete(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(bulkDeleteFaqs)
);

/**
 * @swagger
 * /api/faqs/user/{userId}:
 *   get:
 *     summary: Get user's FAQs
 *     description: Retrieve all FAQs created by a specific user (owner or admin)
 *     tags: [FAQs]
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
 *         description: User FAQs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FAQ'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * GET /api/faqs/user/:userId
 * Get FAQs created by a specific user (Owner or Admin)
 */
faqsRouter.get(
    '/user/:userId',
    authenticate,
    requireOwnerOrAdmin(req => req.params.userId),
    asyncAuthHandler(getUserFaqs)
);

/**
 * @swagger
 * /api/faqs/{faqId}:
 *   get:
 *     summary: Get FAQ by ID
 *     description: Retrieve a specific FAQ by its ID (PUBLIC)
 *     tags: [FAQs]
 *     parameters:
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ID
 *     responses:
 *       200:
 *         description: FAQ retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FAQ'
 *       404:
 *         description: FAQ not found
 *   patch:
 *     summary: Update FAQ
 *     description: Update a frequently asked question (owner or admin)
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FAQ'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: FAQ not found
 *   delete:
 *     summary: Delete FAQ
 *     description: Delete a frequently asked question (owner or admin)
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ID
 *     responses:
 *       204:
 *         description: FAQ deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: FAQ not found
 */

/**
 * GET /api/faqs/:faqId
 * Get single FAQ (PUBLIC)
 */
faqsRouter.get('/:faqId', asyncAuthHandler(getSingleFaqs));

/**
 * PATCH /api/faqs/:faqId
 * Update FAQ (Owner or Admin)
 * Note: Ownership check is handled in the controller by looking up the FAQ's user field
 */
faqsRouter.patch(
    '/:faqId',
    authenticate,
    // Remove uploadNone - we're sending JSON, not FormData
    asyncAuthHandler(updateFaqs)
);

/**
 * DELETE /api/faqs/:faqId
 * Delete FAQ (Owner or Admin)
 * Note: Ownership check is handled in the controller by looking up the FAQ's user field
 */
faqsRouter.delete(
    '/:faqId',
    authenticate,
    asyncAuthHandler(deleteFaqs)
);

export default faqsRouter;



