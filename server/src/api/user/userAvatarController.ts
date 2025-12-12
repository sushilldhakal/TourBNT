import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import createHttpError from 'http-errors';
import { AuthRequest } from '../../middlewares/authenticate';
import userModel from './userModel';
import { uploadToCloudinary } from '../../config/cloudinaryConfig';

// Upload user avatar
export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const _req = req as AuthRequest;
    const userId = req.params.userId;
    const currentUserRole = _req.roles;
    const currentUserId = _req.userId;

    // Check if user exists
    const user = await userModel.findById(userId);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    // Only allow admin and the user themselves to update their avatar
    if (currentUserId !== userId && currentUserRole !== 'admin') {
      return next(createHttpError(403, 'You are not authorized to update this user\'s avatar'));
    }

    let avatarUrl;

    // Check if avatarUrl is provided in the request body (from Gallery)
    if (req.body.avatarUrl) {
      avatarUrl = req.body.avatarUrl;
    } 
    // Check if file was uploaded
    else if (req.file) {
      // Upload file to Cloudinary
      const result = await uploadToCloudinary(req.file.path);
      avatarUrl = result.secure_url;

      // Delete local file after upload
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting local file:', err);
      });
    } else {
      return next(createHttpError(400, 'No image file or URL provided'));
    }

    // Update user avatar in database
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        user: updatedUser,
        avatar: avatarUrl
      }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return next(createHttpError(500, 'Error uploading avatar'));
  }
};

// Get user avatar
export const getUserAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    
    // Find user
    const user = await userModel.findById(userId).select('avatar');
    
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }
    
    if (!user.avatar) {
      return res.status(404).json({
        success: false,
        message: 'User does not have an avatar'
      });
    }
    
    res.status(200).json({
      success: true,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Error getting avatar:', error);
    return next(createHttpError(500, 'Error getting avatar'));
  }
};
