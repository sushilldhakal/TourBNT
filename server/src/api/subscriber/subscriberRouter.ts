import express from "express";
import { body } from "express-validator";
import { authenticate, authorizeRoles } from "../../middlewares/authenticate";
import { paginationMiddleware } from "../../middlewares/pagination";
import { createSubscriber, deleteSubscriber, getAllSubscribers, unsubscribeByToken } from "./subscriberController";
import { requireHuman } from '../../middlewares/turnstile';

const subscriberRouter = express.Router();

/**
 * @swagger
 * /api/v1/subscribers:
 *   get:
 *     summary: Get all subscribers
 *     description: Retrieve all newsletter subscribers with pagination (admin only)
 *     tags: [Subscribers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscribers retrieved successfully
 */
subscriberRouter.get('/', authenticate as any, authorizeRoles('admin'), paginationMiddleware(), getAllSubscribers);

/**
 * @swagger
 * /api/v1/subscribers:
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
 *     responses:
 *       201:
 *         description: Successfully subscribed
 *       409:
 *         description: Already subscribed
 */
subscriberRouter.post(
    '/',
    requireHuman(),
    [body('email').notEmpty().withMessage('Email is required')],
    createSubscriber
);

/**
 * @swagger
 * /api/v1/subscribers/{email}:
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
 *     responses:
 *       204:
 *         description: Successfully unsubscribed
 *       404:
 *         description: Email not found
 */
// Unsubscribe with the secret link from a newsletter email (public; the token is the credential).
subscriberRouter.post('/unsubscribe', unsubscribeByToken);

// Removing an address by name is an admin action: it used to be public, so anyone could unsubscribe anyone.
subscriberRouter.delete('/:email', authenticate as any, authorizeRoles('admin'), deleteSubscriber);

export default subscriberRouter;
