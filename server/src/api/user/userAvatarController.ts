import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import createHttpError from 'http-errors';
import { uploadFileToR2 } from '../../config/r2Config';
import { sendSuccess } from '../../utils/apiResponse';
import * as pgUsers from './userRepo.pg';

// Upload user avatar
export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(createHttpError(401, 'Not authenticated'));
    }

    const userId = req.user.id;
    const currentUserRoles = req.user.roles;

    const user = await pgUsers.findUserById(userId);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    if (userId !== user.id && !currentUserRoles.includes('admin')) {
      return next(createHttpError(403, 'You are not authorized to update this user\'s avatar'));
    }

    let avatarUrl: string;

    if (req.body.avatarUrl) {
      avatarUrl = req.body.avatarUrl;
    } else if (req.file) {
      const result = await uploadFileToR2(req.file.path, 'avatars', req.file.originalname, req.file.mimetype);
      avatarUrl = result.url;

      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting local file:', err);
      });
    } else {
      return next(createHttpError(400, 'No image file or URL provided'));
    }

    const updatedUser = await pgUsers.updateUser(userId, { avatar: avatarUrl });
    if (!updatedUser) {
      return next(createHttpError(404, 'User not found'));
    }

    sendSuccess(res, { user: pgUsers.withoutPassword(updatedUser), avatar: avatarUrl }, 'Avatar uploaded successfully');
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

    const user = await pgUsers.findUserById(userId);
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
