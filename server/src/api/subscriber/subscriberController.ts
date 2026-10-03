import { Request, Response } from 'express';
import { db, subscribers } from '../../db';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { HTTP_STATUS, sendSuccess, sendPaginatedResponse } from '../../utils/apiResponse';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Subscribe a new email to newsletter
 * POST /api/v1/subscribers
 * PUBLIC endpoint
 */
export const createSubscriber = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email || '');

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: { email: 'A valid email is required' },
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }

  try {
    const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
    // Someone who unsubscribed earlier and signs up again is welcome back.
    if (existing && existing.unsubscribedAt) {
      const [resubscribed] = await db.update(subscribers).set({ unsubscribedAt: null, subscribedAt: new Date(), updatedAt: new Date() }).where(eq(subscribers.id, existing.id)).returning();
      return res.status(HTTP_STATUS.CREATED).json({ message: 'Successfully subscribed to newsletter', subscriber: resubscribed });
    }
    if (existing) {
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

    const [subscriber] = await db.insert(subscribers).values({ email }).returning();
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Successfully subscribed to newsletter',
      subscriber
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
 * GET /api/v1/subscribers
 * Requires authentication and admin role
 */
export const getAllSubscribers = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.select({ id: subscribers.id, email: subscribers.email, subscribedAt: subscribers.subscribedAt, unsubscribedAt: subscribers.unsubscribedAt, createdAt: subscribers.createdAt }).from(subscribers).orderBy(desc(subscribers.createdAt)).limit(pageLimit).offset(skip),
      db.select({ value: count() }).from(subscribers),
    ]);

    sendPaginatedResponse(res, items, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Subscribers retrieved successfully');
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
 * Unsubscribe with the secret token from a newsletter's link. Works for both the confirmation page (POST) and the
 * mail app's one-click button (also POST). Idempotent: unsubscribing twice is fine.
 * POST /api/v1/subscribers/unsubscribe?token=...   (also accepts {token} in the body)
 * PUBLIC endpoint — the token is the credential, so only the inbox owner can use it.
 */
export const unsubscribeByToken = async (req: Request, res: Response) => {
  const token = String(req.query.token ?? req.body?.token ?? '').trim();
  if (!token || token.length < 16) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: { code: 'VALIDATION_ERROR', message: 'This unsubscribe link is not valid.' } });
  }
  try {
    const [row] = await db
      .update(subscribers)
      .set({ unsubscribedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(subscribers.unsubscribeToken, token), isNull(subscribers.unsubscribedAt)))
      .returning({ id: subscribers.id });
    if (!row) {
      // Already unsubscribed, or an unknown token: say OK for the first and 404 for the second.
      const [known] = await db.select({ id: subscribers.id }).from(subscribers).where(eq(subscribers.unsubscribeToken, token)).limit(1);
      if (!known) return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { code: 'NOT_FOUND', message: 'This unsubscribe link is not valid.' } });
    }
    res.json({ message: 'You have been unsubscribed.' });
  } catch (error) {
    console.error('Error in unsubscribeByToken:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: { code: 'SERVER_ERROR', message: 'Server error, please try again later' } });
  }
};

/**
 * Remove an email from the newsletter list (admin only — visitors unsubscribe with the token link in each email)
 * DELETE /api/v1/subscribers/:email
 */
export const deleteSubscriber = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.params.email);

  if (!EMAIL_REGEX.test(email)) {
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
    const [deleted] = await db.delete(subscribers).where(eq(subscribers.email, email)).returning();
    if (!deleted) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Email not found in subscription list',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

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
