import { addOrUpdateSettings, getDecryptedApiKey, getUserSettings } from './userSettingController';
import express from "express";
import {
  getAllUsers,
  getUserById,
  updateMyProfile,
  updateUserById,
  changeMyPassword,
  deleteUser,
  changeUserRole,
  getSellerApplications,
  approveSellerApplication,
  rejectSellerApplication,
  deleteSellerApplication,
  loginUser,
  logoutUser,
  getCurrentUser
} from "./userController";
import { uploadAvatar, getUserAvatar } from './userAvatarController';
import { body, param } from 'express-validator';
import { authenticate, authorizeRoles, requireOwnerOrAdmin } from "../../middlewares/authenticate";
import { paginationMiddleware } from "../../middlewares/pagination";
import { filterSortMiddleware } from "../../middlewares/filterSort";
import { upload, uploadNone, uploadAvatar as uploadAvatarMiddleware, uploadSellerDocs } from '../../middlewares/multer';
import { authLimiter } from '../../middlewares/rateLimiter';

const userRouter = express.Router();

// ============================================================================
// AUTHENTICATION (Legacy - moved to /api/auth)
// ============================================================================
/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user (deprecated)
 *     description: Use POST /api/auth/login instead
 *     tags: [Users]
 *     deprecated: true
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

userRouter.post('/logout', authLimiter, logoutUser);

// ============================================================================
// CURRENT USER ROUTES (/me) - Self-service
// ============================================================================

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user
 *     description: Retrieve the currently authenticated user's information
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.get('/me', authenticate, getCurrentUser);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile information
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               companyName:
 *                 type: string
 *               companyRegistrationNumber:
 *                 type: string
 *               sellerType:
 *                 type: string
 *               sellerDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.patch('/me', authenticate, uploadSellerDocs, updateMyProfile);

/**
 * @swagger
 * /api/users/me/password:
 *   patch:
 *     summary: Change current user password
 *     description: Change the authenticated user's password
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
userRouter.patch('/me/password', authenticate, changeMyPassword);

/**
 * @swagger
 * /api/users/me/avatar:
 *   post:
 *     summary: Upload current user avatar
 *     description: Upload or update the authenticated user's avatar
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
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
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get current user avatar
 *     description: Retrieve the authenticated user's avatar URL
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Avatar retrieved successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.post('/me/avatar', authenticate, uploadAvatarMiddleware, uploadAvatar);
userRouter.get('/me/avatar', authenticate, getUserAvatar);

/**
 * @swagger
 * /api/users/me/settings:
 *   get:
 *     summary: Get current user settings
 *     description: Retrieve the authenticated user's settings
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update current user settings
 *     description: Update the authenticated user's settings
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               openAIKey:
 *                 type: string
 *               CLOUDINARY_CLOUD:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.get('/me/settings', authenticate, getUserSettings);
userRouter.patch('/me/settings', uploadNone, authenticate, addOrUpdateSettings);

/**
 * @swagger
 * /api/users/me/settings/key:
 *   get:
 *     summary: Get decrypted API key
 *     description: Retrieve decrypted API key for the authenticated user
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: keyType
 *         schema:
 *           type: string
 *         description: Type of API key (openAIKey, CLOUDINARY_API_KEY, etc.)
 *     responses:
 *       200:
 *         description: API key retrieved successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.get('/me/settings/key', authenticate, getDecryptedApiKey);

// ============================================================================
// OWNER OR ADMIN ROUTES - Users can manage their own data, admins can manage any user
// ============================================================================

/**
 * @swagger
 * /api/users/{userId}:
 *   patch:
 *     summary: Update user by ID (owner or admin)
 *     description: Update user information. Users can update their own profile, admins can update any user.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (MongoDB ObjectId)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               roles:
 *                 type: string
 *                 description: Only admins can change roles
 *               password:
 *                 type: string
 *                 description: Only admins can change passwords
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Must be resource owner or admin
 *   delete:
 *     summary: Delete user (owner or admin)
 *     description: Delete a user account. Users can delete their own account, admins can delete any user.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Must be resource owner or admin
 *       404:
 *         description: User not found
 */
userRouter.patch(
  '/:userId',
  [param('userId').isMongoId(), authenticate],
  requireOwnerOrAdmin((req) => req.params.userId),
  uploadSellerDocs,
  updateUserById
);

userRouter.delete(
  '/:userId',
  [param('userId').isMongoId(), authenticate],
  requireOwnerOrAdmin((req) => req.params.userId),
  deleteUser
);

// ============================================================================
// ADMIN ONLY ROUTES - System-wide management
// ============================================================================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     description: Retrieve a paginated list of all users
 *     tags: [Users, Admin]
 *     security:
 *       - cookieAuth: []
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
 *           maximum: 100
 *       - in: query
 *         name: sellerStatus
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
userRouter.get('/',
  authenticate,
  paginationMiddleware,
  filterSortMiddleware(['roles', 'sellerStatus'], ['createdAt', 'name', 'email']),
  authorizeRoles('admin'),
  getAllUsers
);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     description: Retrieve a specific user's information. Admin access required.
 *     tags: [Users, Admin]
 *     security:
 *       - cookieAuth: []
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
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
userRouter.get('/:userId', [param('userId').isMongoId(), authenticate], authorizeRoles('admin'), getUserById);

/**
 * @swagger
 * /api/users/{userId}/role:
 *   patch:
 *     summary: Change user role (admin only)
 *     description: Change a user's role. Admin access required.
 *     tags: [Users, Admin]
 *     security:
 *       - cookieAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
userRouter.patch('/:userId/role', [param('userId').isMongoId(), authenticate], authorizeRoles('admin'), changeUserRole);

// ============================================================================
// SELLER MANAGEMENT (Admin only)
// ============================================================================

/**
 * @swagger
 * /api/users/seller-applications:
 *   get:
 *     summary: Get all seller applications (admin only)
 *     description: Retrieve all seller applications
 *     tags: [Users, Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Seller applications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
userRouter.get('/seller-applications', authenticate, authorizeRoles('admin'), getSellerApplications);

/**
 * @swagger
 * /api/users/{userId}/approve-seller:
 *   patch:
 *     summary: Approve seller application (admin only)
 *     description: Approve a user's seller application
 *     tags: [Users, Admin]
 *     security:
 *       - cookieAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
userRouter.patch('/:userId/approve-seller', [param('userId').isMongoId(), authenticate], authorizeRoles('admin'), approveSellerApplication);

/**
 * @swagger
 * /api/users/{userId}/reject-seller:
 *   patch:
 *     summary: Reject seller application (admin only)
 *     description: Reject a user's seller application
 *     tags: [Users, Admin]
 *     security:
 *       - cookieAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
userRouter.patch('/:userId/reject-seller', [param('userId').isMongoId(), authenticate], authorizeRoles('admin'), rejectSellerApplication);

/**
 * @swagger
 * /api/users/{userId}/seller-status:
 *   patch:
 *     summary: Update seller application status (admin only)
 *     description: Approve or reject a seller application
 *     tags: [Users, Admin]
 *     security:
 *       - cookieAuth: []
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
 *     responses:
 *       200:
 *         description: Seller status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
userRouter.patch('/:userId/seller-status', [param('userId').isMongoId(), authenticate], authorizeRoles('admin'), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

/**
 * @swagger
 * /api/users/{userId}/delete-seller:
 *   delete:
 *     summary: Delete seller application (admin only)
 *     description: Delete a user's seller application
 *     tags: [Users, Admin]
 *     security:
 *       - cookieAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
userRouter.delete('/:userId/delete-seller', [param('userId').isMongoId(), authenticate], authorizeRoles('admin'), deleteSellerApplication);

export default userRouter;