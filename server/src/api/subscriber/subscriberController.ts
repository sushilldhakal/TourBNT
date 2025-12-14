import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Subscriber from './subscriberModel';
import { HTTP_STATUS } from '../../utils/httpStatusCodes';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Subscribe a new email to newsletter
 * POST /api/subscribers
 * PUBLIC endpoint
 */
export const createSubscriber = async (req: Request, res: Response) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array().reduce((acc, err) => {
          if (err.type === 'field') {
            acc[err.path] = err.msg;
          }
          return acc;
        }, {} as Record<string, string>),
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }

  const email = normalizeEmail(req.body.email);

  try {
    // Check if email already exists
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {
          code: 'DUPLICATE_SUBSCRIPTION',
          message: 'Email is already subscribed',
          details: { email: 'This email is already subscribed to the newsletter' },
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    // Create new subscriber
    const newSubscriber = await Subscriber.create({ email });
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Successfully subscribed to newsletter',
      subscriber: newSubscriber
    });
  } catch (error) {
    console.error('Error in createSubscriber:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Server error, please try again later',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};

/**
 * Get all subscribers with pagination
 * GET /api/subscribers
 * Requires authentication and admin role
 */
export const getAllSubscribers = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = req.pagination!;

    // Get total count
    const total = await Subscriber.countDocuments();

    // Get paginated subscribers
    const subscribers = await Subscriber.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.status(HTTP_STATUS.OK).json({
      data: subscribers,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error in getAllSubscribers:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Server error, please try again later',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};

/**
 * Unsubscribe an email from newsletter
 * DELETE /api/subscribers/:email
 * PUBLIC endpoint
 */
export const deleteSubscriber = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.params.email);

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        details: { email: 'Please provide a valid email address' },
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }

  try {
    const existingSubscriber = await Subscriber.findOne({ email });
    if (!existingSubscriber) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Email not found in subscription list',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    await Subscriber.deleteOne({ email });
    // Return 204 No Content for successful deletion
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    console.error('Error in deleteSubscriber:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Server error, please try again later',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};
