import { Response } from 'express';
import Notification from './notificationModel';
import { AuthRequest } from '../../middlewares/authenticate';
import { HTTP_STATUS } from '../../utils/httpStatusCodes';

// Get notifications for authenticated user
export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    // Get pagination from middleware
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const { unreadOnly } = req.query;

    let query: any = { recipient: userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.status(HTTP_STATUS.OK).json({
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'FETCH_NOTIFICATIONS_ERROR',
        message: 'Error fetching notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId
    });

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(HTTP_STATUS.OK).json({
      data: notification
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'MARK_READ_ERROR',
        message: 'Error marking notification as read',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId
    });

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    // Return 204 No Content for successful deletion
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'DELETE_NOTIFICATION_ERROR',
        message: 'Error deleting notification',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};
