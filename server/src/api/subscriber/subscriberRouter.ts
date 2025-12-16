import express from "express";
import { body } from "express-validator";
import { authenticate, authorizeRoles } from "../../middlewares/authenticate";
import { paginationMiddleware } from "../../middlewares/pagination";
import { createSubscriber, deleteSubscriber, getAllSubscribers } from "./subscriberController";

const subscriberRouter = express.Router();

/**
 * @swagger
 * /api/subscribers:
 *   get:
 *     summary: Get all subscribers
 *     description: Retrieve all newsletter subscribers with pagination (admin only)
 *     tags: [Subscribers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Subscribers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscriber'
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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
subscriberRouter.get('/', authenticate as any, authorizeRoles('admin'), paginationMiddleware, getAllSubscribers);

/**
 * @swagger
 * /api/subscribers:
 *   post:
 *     summary: Subscribe to newsletter
 *     description: Add a new email to the newsletter subscription list (public endpoint)
 *     tags: [Subscribers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: Successfully subscribed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subscriber:
 *                   $ref: '#/components/schemas/Subscriber'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
subscriberRouter.post(
    '/',
    [
        body('email')
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Valid email is required')
    ],
    createSubscriber
);

/**
 * @swagger
 * /api/subscribers/{email}:
 *   delete:
 *     summary: Unsubscribe from newsletter
 *     description: Remove an email from the newsletter subscription list (public endpoint)
 *     tags: [Subscribers]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to unsubscribe
 *     responses:
 *       200:
 *         description: Successfully unsubscribed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
subscriberRouter.delete('/:email', deleteSubscriber);

export default subscriberRouter;