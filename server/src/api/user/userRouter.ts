import { addOrUpdateSettings, getDecryptedApiKey, getUserSettings } from './userSettingController';
import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  loginUser,
  updateUser,
  deleteUser,
  changeUserRole,
  verifyUser,
  forgotPassword,
  resetPassword,
  getSellerApplications,
  approveSellerApplication,
  rejectSellerApplication,
  deleteSellerApplication
} from "./userController";
import { uploadAvatar, getUserAvatar } from './userAvatarController';
import { body, param } from 'express-validator';
import { authenticate, isAdminOrSeller, isAdmin } from "../../middlewares/authenticate";
import { upload, uploadNone, uploadAvatar as uploadAvatarMiddleware, uploadSellerDocs } from '../../middlewares/multer';

const userRouter = express.Router();

//routes
userRouter.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], createUser);

userRouter.post('/login', [body('email').isEmail(), body('password').isLength({ min: 6 })], loginUser);

userRouter.get('/all', authenticate, getAllUsers);

// Seller application routes (admin only) - MUST come before /:userId route
userRouter.get('/seller-applications', authenticate, getSellerApplications);

// User settings routes - MUST come before /:userId route
userRouter.patch(
  '/setting/:userId', uploadNone, authenticate as any, isAdminOrSeller as any, addOrUpdateSettings as any
);
userRouter.get('/setting/:userId', authenticate, isAdminOrSeller as any, getUserSettings);
// Add route for getting decrypted API keys
userRouter.get('/setting/:userId/key', authenticate as any, isAdminOrSeller as any, getDecryptedApiKey as any);

// Generic user routes - MUST come after specific routes
userRouter.get('/:userId', [param('userId').isMongoId(), authenticate], getUserById);

userRouter.patch(
  '/:userId', uploadSellerDocs, authenticate, updateUser
);

userRouter.delete('/:userId', [param('userId').isMongoId(), authenticate], deleteUser);

userRouter.post('/change-role', authenticate, changeUserRole);
userRouter.patch('/:userId/approve-seller', [param('userId').isMongoId(), authenticate], approveSellerApplication);
userRouter.patch('/:userId/reject-seller', [param('userId').isMongoId(), authenticate], rejectSellerApplication);
userRouter.delete('/:userId/delete-seller', [param('userId').isMongoId(), authenticate], deleteSellerApplication);

userRouter.post('/login/verify', [
  body('token').notEmpty()
], verifyUser);

userRouter.post('/login/forgot', forgotPassword);

userRouter.post('/login/reset', resetPassword);

// Avatar routes
userRouter.post('/:userId/avatar', authenticate, uploadAvatarMiddleware, uploadAvatar);
userRouter.get('/:userId/avatar', authenticate, getUserAvatar);

export default userRouter;