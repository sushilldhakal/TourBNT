import express, { RequestHandler } from "express";
import { authenticate, isAdminOrSeller, AuthRequest } from "../../../middlewares/authenticate";
import { addFaqs, getUserFaqs, updateFaqs, deleteFaqs, getAllFaqs, getSingleFaqs, bulkDeleteFaqs } from "./faqController";
import { uploadNone } from "../../../middlewares/multer";
import { asyncHandler } from "../../../utils/routeWrapper";
import { paginationMiddleware } from "../../../middlewares/pagination";

const faqsRouter = express.Router();

// RESTful FAQ Routes

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/faqs - List all FAQs with pagination (PUBLIC)
faqsRouter.get('/', paginationMiddleware, asyncHandler(getAllFaqs));

// POST /api/faqs - Create FAQ (Protected, Admin or Seller)
faqsRouter.post(
    '/',
    authenticate,
    uploadNone,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(addFaqs)
);

// DELETE /api/faqs - Bulk delete FAQs (Protected, Admin or Seller)
faqsRouter.delete(
    '/',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(bulkDeleteFaqs)
);

// Get FAQs for a Specific User (Protected, Admin or Seller)
/**
 * @swagger
 * /api/faqs/user/{userId}:
 *   get:
 *     summary: Get user's FAQs
 *     description: Retrieve all FAQs created by a specific user (admin/seller only)
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
faqsRouter.get(
    '/user/:userId',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(getUserFaqs)
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Update FAQ
 *     description: Update a frequently asked question (admin/seller only)
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete FAQ
 *     description: Delete a frequently asked question (admin/seller only)
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/faqs/:faqId - Get single FAQ (PUBLIC)
faqsRouter.get('/:faqId', asyncHandler(getSingleFaqs));

// PATCH /api/faqs/:faqId - Update FAQ (Protected, Admin or Seller)
faqsRouter.patch(
    '/:faqId',
    authenticate,
    uploadNone,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(updateFaqs)
);

// DELETE /api/faqs/:faqId - Delete single FAQ (Protected, Admin or Seller)
faqsRouter.delete(
    '/:faqId',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(deleteFaqs)
);

export default faqsRouter;



