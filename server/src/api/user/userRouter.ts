import { addOrUpdateSettings, getDecryptedApiKey, getUserSettings } from './userSettingController';
import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  getSellerApplications,
  approveSellerApplication,
  rejectSellerApplication,
  deleteSellerApplication,
  loginUser
} from "./userController";
import { uploadAvatar, getUserAvatar } from './userAvatarController';
import { body, param } from 'express-validator';
import { authenticate, isAdminOrSeller, isAdmin } from "../../middlewares/authenticate";
import { paginationMiddleware } from "../../middlewares/pagination";
import { filterSortMiddleware } from "../../middlewares/filterSort";
import { upload, uploadNone, uploadAvatar as uploadAvatarMiddleware, uploadSellerDocs } from '../../middlewares/multer';
import { authLimiter } from '../../middlewares/rateLimiter';

const userRouter = express.Router();

// NOTE: Authentication routes (register, login, verify, forgot, reset) have been moved to /api/auth

// Legacy route for backward compatibility - redirects to new auth endpoint
/**
 * @deprecated Use POST /api/auth/login instead
 */
userRouter.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  loginUser
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a paginated list of all users (requires authentication)
 *     tags: [Users]
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
 *       - in: query
 *         name: sellerStatus
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter users by seller application status
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.get('/',
  authenticate,
  paginationMiddleware,
  filterSortMiddleware(['roles', 'verified', 'sellerStatus'], ['createdAt', 'name', 'email']),
  getAllUsers
);

// Seller application routes (admin only) - MUST come before /:userId route
/**
 * @swagger
 * /api/users/seller-applications:
 *   get:
 *     summary: Get all seller applications
 *     description: Retrieve all seller applications (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.get('/seller-applications', authenticate, getSellerApplications);

// User settings routes - MUST come before /:userId route
/**
 * @swagger
 * /api/users/setting/{userId}:
 *   patch:
 *     summary: Update user settings
 *     description: Add or update user settings (admin or seller only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               openAIKey:
 *                 type: string
 *                 description: OpenAI API key (will be encrypted)
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     summary: Get user settings
 *     description: Retrieve user settings (admin or seller only)
 *     tags: [Users]
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
 *         description: Settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.patch(
  '/setting/:userId', uploadNone, authenticate as any, isAdminOrSeller as any, addOrUpdateSettings as any
);
userRouter.get('/setting/:userId', authenticate, isAdminOrSeller as any, getUserSettings);

/**
 * @swagger
 * /api/users/setting/{userId}/key:
 *   get:
 *     summary: Get decrypted API key
 *     description: Retrieve decrypted API key for user (admin or seller only)
 *     tags: [Users]
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
 *         description: API key retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 openAIKey:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.get('/setting/:userId/key', authenticate as any, isAdminOrSeller as any, getDecryptedApiKey as any);

// Generic user routes - MUST come after specific routes
/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user's information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid user ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Update user profile
 *     description: Update user information including seller documents
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: number
 *               sellerDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete user account
 *     description: Delete a user account permanently
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.get('/:userId', [param('userId').isMongoId(), authenticate], getUserById);

userRouter.patch(
  '/:userId', uploadSellerDocs, authenticate, updateUser
);

userRouter.delete('/:userId', [param('userId').isMongoId(), authenticate], deleteUser);

/**
 * @swagger
 * /api/users/{userId}/role:
 *   patch:
 *     summary: Change user role
 *     description: Change a user's role (admin only) - RESTful endpoint
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, seller, subscriber]
 *     responses:
 *       200:
 *         description: Role changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.patch('/:userId/role', [param('userId').isMongoId(), authenticate, isAdmin as any], changeUserRole);

/**
 * @swagger
 * /api/users/{userId}/seller-status:
 *   patch:
 *     summary: Update seller application status
 *     description: Approve or reject a seller application (admin only) - RESTful endpoint
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               rejectionReason:
 *                 type: string
 *                 description: Required when status is rejected
 *     responses:
 *       200:
 *         description: Seller status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.patch('/:userId/seller-status', [param('userId').isMongoId(), authenticate, isAdmin as any], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { status, rejectionReason } = req.body;

  if (status === 'approved') {
    return approveSellerApplication(req, res, next);
  } else if (status === 'rejected') {
    return rejectSellerApplication(req, res, next);
  } else {
    return res.status(400).json({
      error: {
        code: 'INVALID_STATUS',
        message: 'Status must be either "approved" or "rejected"',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
});

// Keep old endpoint for backward compatibility (will be removed later)
/**
 * @deprecated Use PATCH /api/users/{userId}/role instead
 */
userRouter.post('/change-role', authenticate, changeUserRole);

/**
 * @swagger
 * /api/users/{userId}/approve-seller:
 *   patch:
 *     summary: Approve seller application
 *     description: Approve a user's seller application (admin only)
 *     tags: [Users]
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
 *         description: Seller application approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.patch('/:userId/approve-seller', [param('userId').isMongoId(), authenticate], approveSellerApplication);

/**
 * @swagger
 * /api/users/{userId}/reject-seller:
 *   patch:
 *     summary: Reject seller application
 *     description: Reject a user's seller application (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Seller application rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.patch('/:userId/reject-seller', [param('userId').isMongoId(), authenticate], rejectSellerApplication);

/**
 * @swagger
 * /api/users/{userId}/delete-seller:
 *   delete:
 *     summary: Delete seller application
 *     description: Delete a user's seller application (admin only)
 *     tags: [Users]
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
 *         description: Seller application deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.delete('/:userId/delete-seller', [param('userId').isMongoId(), authenticate], deleteSellerApplication);

// NOTE: Authentication routes have been moved to /api/auth
// - POST /api/auth/verify-email (was /api/users/login/verify)
// - POST /api/auth/forgot-password (was /api/users/login/forgot)
// - POST /api/auth/reset-password (was /api/users/login/reset)

// Nested user resource routes (NEW - RESTful)
/**
 * @swagger
 * /api/users/{userId}/tours:
 *   get:
 *     summary: Get user's tours
 *     description: Retrieve all tours created by a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: User tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Note: Implementation will be added when refactoring tour routes

/**
 * @swagger
 * /api/users/{userId}/bookings:
 *   get:
 *     summary: Get user's bookings
 *     description: Retrieve all bookings for a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: User bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Note: Implementation will be added when refactoring booking routes

/**
 * @swagger
 * /api/users/{userId}/posts:
 *   get:
 *     summary: Get user's posts
 *     description: Retrieve all posts created by a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: User posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Note: Implementation will be added when refactoring post routes

/**
 * @swagger
 * /api/users/{userId}/facts:
 *   get:
 *     summary: Get user's facts
 *     description: Retrieve all facts created by a specific user (admin or seller only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: User facts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin/Seller access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Note: Implementation will be added when refactoring facts routes

/**
 * @swagger
 * /api/users/{userId}/faqs:
 *   get:
 *     summary: Get user's FAQs
 *     description: Retrieve all FAQs created by a specific user (admin or seller only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: User FAQs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin/Seller access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Note: Implementation will be added when refactoring FAQ routes

// Avatar routes
/**
 * @swagger
 * /api/users/{userId}/avatar:
 *   post:
 *     summary: Upload user avatar
 *     description: Upload or update user avatar image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     summary: Get user avatar
 *     description: Retrieve user avatar URL
 *     tags: [Users]
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
 *         description: Avatar retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarUrl:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Avatar not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.post('/:userId/avatar', authenticate, uploadAvatarMiddleware, uploadAvatar);
userRouter.get('/:userId/avatar', authenticate, getUserAvatar);

export default userRouter;