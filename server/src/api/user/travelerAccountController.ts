import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { and, desc, eq } from 'drizzle-orm';
import { comments, db, posts, reviews, tours, userWishlists, type SavedCard } from '../../db';
import { sendSuccess } from '../../utils/apiResponse';
import * as pgUsers from './userRepo.pg';

const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'other'] as const;
const MAX_CARDS = 5;

function requireUserId(req: Request): string {
  const userId = req.user?.id;
  if (!userId) throw createHttpError(401, 'Not authenticated');
  return userId;
}

function isCardBrand(value: string): value is SavedCard['brand'] {
  return (CARD_BRANDS as readonly string[]).includes(value);
}

/** Drops anything that is not a display-only card, so a legacy blob cannot leak a number. */
function savedCards(value: unknown): SavedCard[] {
  if (!Array.isArray(value)) return [];
  const cards: SavedCard[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const card = raw as Record<string, unknown>;
    const last4 = typeof card.last4 === 'string' ? card.last4 : '';
    const brand = typeof card.brand === 'string' ? card.brand : '';
    const cardholderName = typeof card.cardholderName === 'string' ? card.cardholderName : '';
    const expiryMonth = Number(card.expiryMonth);
    const expiryYear = Number(card.expiryYear);
    if (!/^\d{4}$/.test(last4) || !isCardBrand(brand)) continue;
    if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) continue;
    if (!Number.isInteger(expiryYear)) continue;
    cards.push({
      id: typeof card.id === 'string' && card.id.length > 0 ? card.id : randomUUID(),
      brand,
      last4,
      expiryMonth,
      expiryYear,
      cardholderName,
    });
  }
  return cards;
}

function parseCards(body: unknown): SavedCard[] {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { cards?: unknown }).cards)) {
    throw createHttpError(400, 'Send a cards list');
  }
  const incoming = (body as { cards: unknown[] }).cards;
  if (incoming.length > MAX_CARDS) throw createHttpError(400, `You can save up to ${MAX_CARDS} cards`);

  return incoming.map((raw) => {
    if (!raw || typeof raw !== 'object') throw createHttpError(400, 'Invalid card');
    const card = raw as Record<string, unknown>;
    if ('cvv' in card || 'cvc' in card || 'pan' in card || 'cardNumber' in card || 'number' in card) {
      throw createHttpError(400, 'Send only the last four digits. Never send the full card number or security code.');
    }
    const last4 = String(card.last4 ?? '');
    if (!/^\d{4}$/.test(last4)) throw createHttpError(400, 'Last four digits must be exactly 4 numbers');
    const brand = String(card.brand ?? '');
    if (!isCardBrand(brand)) throw createHttpError(400, 'Choose a card brand');
    const expiryMonth = Number(card.expiryMonth);
    const expiryYear = Number(card.expiryYear);
    const yearNow = new Date().getFullYear();
    if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) {
      throw createHttpError(400, 'Expiry month is invalid');
    }
    if (!Number.isInteger(expiryYear) || expiryYear < yearNow || expiryYear > yearNow + 20) {
      throw createHttpError(400, 'Expiry year is invalid');
    }
    const cardholderName = String(card.cardholderName ?? '').trim();
    if (cardholderName.length < 2 || cardholderName.length > 80) {
      throw createHttpError(400, 'Enter the name on the card');
    }
    const id = typeof card.id === 'string' && /^[A-Za-z0-9-]{8,80}$/.test(card.id) ? card.id : randomUUID();
    return { id, brand, last4, expiryMonth, expiryYear, cardholderName };
  });
}

export const listWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req);
    const rows = await db
      .select({
        tourId: tours.id,
        title: tours.title,
        code: tours.code,
        coverImage: tours.coverImage,
        price: tours.price,
        savedAt: userWishlists.createdAt,
      })
      .from(userWishlists)
      .innerJoin(tours, eq(userWishlists.tourId, tours.id))
      .where(eq(userWishlists.userId, userId))
      .orderBy(desc(userWishlists.createdAt));
    sendSuccess(res, rows, 'Bookmarks retrieved');
  } catch (err) {
    next(err);
  }
};

export const addWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req);
    const tourId = String(req.body?.tourId ?? '').trim();
    if (!tourId || tourId.length > 80) return next(createHttpError(400, 'A tour id is required'));

    const [tour] = await db.select({ id: tours.id, title: tours.title }).from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) return next(createHttpError(404, 'Tour not found'));

    await db.insert(userWishlists).values({ userId, tourId }).onConflictDoNothing();
    sendSuccess(res, { tourId: tour.id, title: tour.title }, 'Tour saved');
  } catch (err) {
    next(err);
  }
};

export const removeWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req);
    const tourId = String(req.params.tourId ?? '').trim();
    if (!tourId) return next(createHttpError(400, 'A tour id is required'));
    await db.delete(userWishlists).where(and(eq(userWishlists.userId, userId), eq(userWishlists.tourId, tourId)));
    sendSuccess(res, { tourId }, 'Bookmark removed');
  } catch (err) {
    next(err);
  }
};

export const listMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req);
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        status: reviews.status,
        createdAt: reviews.createdAt,
        tourId: tours.id,
        tourTitle: tours.title,
      })
      .from(reviews)
      .innerJoin(tours, eq(reviews.tourId, tours.id))
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));
    sendSuccess(res, rows, 'Reviews retrieved');
  } catch (err) {
    next(err);
  }
};

export const listMyComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req);
    const rows = await db
      .select({
        id: comments.id,
        text: comments.text,
        approve: comments.approve,
        createdAt: comments.createdAt,
        postId: posts.id,
        postTitle: posts.title,
      })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(eq(comments.userId, userId))
      .orderBy(desc(comments.createdAt));
    sendSuccess(res, rows, 'Comments retrieved');
  } catch (err) {
    next(err);
  }
};

export const listPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req);
    const user = await pgUsers.findUserById(userId);
    if (!user) return next(createHttpError(404, 'User not found'));
    sendSuccess(res, savedCards(user.paymentMethods), 'Cards retrieved');
  } catch (err) {
    next(err);
  }
};

export const replacePaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req);
    const cards = parseCards(req.body);
    const updated = await pgUsers.updateUser(userId, { paymentMethods: cards });
    if (!updated) return next(createHttpError(404, 'User not found'));
    sendSuccess(res, savedCards(updated.paymentMethods), 'Cards updated');
  } catch (err) {
    next(err);
  }
};
