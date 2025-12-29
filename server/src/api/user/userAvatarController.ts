import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import createHttpError from 'http-errors';
import userModel from './userModel';
import { uploadToCloudinary } from '../../config/cloudinaryConfig';
import { sendSuccess } from '../../utils/apiResponse';

// Upload user avatar
export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(createHttpError(401, 'Not authenticated'));
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID is required');
      return next(createHttpError(401, 'Not authenticated'));
    }
    const currentUserRoles = req.user.roles;
    const currentUserId = userId;

    // Check if user exists
    const user = await userModel.findById(userId);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    // Only allow admin or the user themselves to update their avatar
    if (currentUserId !== userId && !currentUserRoles.includes('admin')) {
      return next(createHttpError(403, 'You are not authorized to update this user\'s avatar'));
    }

    let avatarUrl: string;

    // Check if avatarUrl is provided in the request body
    if (req.body.avatarUrl) {
      avatarUrl = req.body.avatarUrl;
    }
    // Check if file was uploaded
    else if (req.file) {
      const result = await uploadToCloudinary(req.file.path);
      avatarUrl = result.secure_url;

      // Delete local file after upload
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting local file:', err);
      });
    } else {
      return next(createHttpError(400, 'No image file or URL provided'));
    }

    // Update user avatar in DB
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    sendSuccess(res, { user: updatedUser, avatar: avatarUrl }, 'Avatar uploaded successfully');
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return next(createHttpError(500, 'Error uploading avatar'));
  }
};

// Get user avatar
export const getUserAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(createHttpError(401, 'Not authenticated'));
    }

    // Find user
    const user = await userModel.findById(userId).select('avatar');
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    if (!user.avatar) {
      return next(createHttpError(404, 'User does not have an avatar'));
    }

    sendSuccess(res, { avatar: user.avatar }, 'Avatar retrieved successfully');
  } catch (error) {
    console.error('Error getting avatar:', error);
    return next(createHttpError(500, 'Error getting avatar'));
  }
};
