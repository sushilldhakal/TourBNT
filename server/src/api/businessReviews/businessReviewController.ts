import { Request, Response } from 'express';
import { db, businessReviews, businessReviewReplies, businessReviewLikes, businessPartners, users } from '../../db';
import { eq, and, desc, asc, avg, count, inArray, sql } from 'drizzle-orm';
import * as notifications from '../notifications/notificationController';
import { invalidateBusinessPartner } from '../../services/cacheInvalidation';

const USER_COLUMNS = { id: users.id, name: users.name, email: users.email, avatar: users.avatar, roles: users.role } as const;

/** Recomputes and persists a business's averageRating/reviewCount/approvedReviewCount. */
async function recalculateBusinessRating(businessPartnerId: string) {
  const [stats] = await db
    .select({ averageRating: avg(businessReviews.rating), numberOfReviews: count() })
    .from(businessReviews)
    .where(and(eq(businessReviews.businessPartnerId, businessPartnerId), eq(businessReviews.status, 'approved')));

  const [{ value: totalReviews }] = await db.select({ value: count() }).from(businessReviews).where(eq(businessReviews.businessPartnerId, businessPartnerId));

  await db
    .update(businessPartners)
    .set({
      averageRating: stats?.averageRating ? Number(stats.averageRating) : 0,
      approvedReviewCount: stats?.numberOfReviews ?? 0,
      reviewCount: totalReviews,
    })
    .where(eq(businessPartners.id, businessPartnerId));

  // Tour pages embed this partner's rating.
  await invalidateBusinessPartner(businessPartnerId);
}

async function withReplies(reviewIds: string[]) {
  if (reviewIds.length === 0) return new Map<string, unknown[]>();
  const rows = await db
    .select({ reply: businessReviewReplies, user: USER_COLUMNS })
    .from(businessReviewReplies)
    .leftJoin(users, eq(businessReviewReplies.userId, users.id))
    .where(inArray(businessReviewReplies.reviewId, reviewIds));

  const byReview = new Map<string, unknown[]>();
  for (const { reply, user } of rows) {
    const list = byReview.get(reply.reviewId) || [];
    list.push({ ...reply, user });
    byReview.set(reply.reviewId, list);
  }
  return byReview;
}

// Get average rating for a business
export const getBusinessRating = async (req: Request, res: Response) => {
  try {
    const { businessPartnerId } = req.params;
    const [partner] = await db.select({ averageRating: businessPartners.averageRating, reviewCount: businessPartners.approvedReviewCount }).from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);

    res.json({ success: true, data: { averageRating: partner?.averageRating || 0, numberOfReviews: partner?.reviewCount || 0 } });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating business rating', error });
  }
};

// Add a review to a business partner
export const addBusinessReview = async (req: Request, res: Response) => {
  try {
    const { businessPartnerId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'You must be logged in to add a review' });
    }
    if (!rating || rating < 0.5 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 0.5 and 5' });
    }

    const [partner] = await db.select({ id: businessPartners.id, ownerId: businessPartners.ownerId, name: businessPartners.name }).from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!partner) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const roundedRating = Math.round(rating * 2) / 2;

    const [existingReview] = await db.select().from(businessReviews).where(and(eq(businessReviews.businessPartnerId, businessPartnerId), eq(businessReviews.userId, userId))).limit(1);

    let review;
    let isUpdate = false;
    if (existingReview) {
      isUpdate = true;
      [review] = await db
        .update(businessReviews)
        .set({ rating: roundedRating, comment, status: 'pending', updatedAt: new Date() })
        .where(eq(businessReviews.id, existingReview.id))
        .returning();
    } else {
      [review] = await db.insert(businessReviews).values({ businessPartnerId, userId, rating: roundedRating, comment, status: 'pending' }).returning();
    }

    await recalculateBusinessRating(businessPartnerId);
    await db.update(businessPartners).set({ views: sql`${businessPartners.views} + 1` }).where(eq(businessPartners.id, businessPartnerId));

    try {
      await notifications.createBusinessReviewNotification(partner.ownerId, userId, partner.name, businessPartnerId, roundedRating);
    } catch (notificationError) {
      console.error('Error creating business review notification:', notificationError);
    }

    const [updatedPartner] = await db.select({ averageRating: businessPartners.averageRating, reviewCount: businessPartners.reviewCount, approvedReviewCount: businessPartners.approvedReviewCount }).from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);

    res.status(200).json({
      success: true,
      message: isUpdate ? 'Review updated successfully' : 'Review added successfully. It will be visible after approval.',
      data: { review, averageRating: updatedPartner?.averageRating, reviewCount: updatedPartner?.reviewCount, approvedReviewCount: updatedPartner?.approvedReviewCount || 0 }
    });
  } catch (error) {
    console.error('Error in addBusinessReview:', error);
    res.status(500).json({ message: 'Failed to add review', error });
  }
};

// Get reviews for a business
export const getBusinessReviews = async (req: Request, res: Response) => {
  try {
    const { businessPartnerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || 'all';

    const [partner] = await db.select({ averageRating: businessPartners.averageRating, reviewCount: businessPartners.reviewCount, approvedReviewCount: businessPartners.approvedReviewCount }).from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!partner) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const where = status === 'all' ? eq(businessReviews.businessPartnerId, businessPartnerId) : and(eq(businessReviews.businessPartnerId, businessPartnerId), eq(businessReviews.status, status as 'pending' | 'approved' | 'rejected'));

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db
        .select({ review: businessReviews, user: USER_COLUMNS })
        .from(businessReviews)
        .leftJoin(users, eq(businessReviews.userId, users.id))
        .where(where)
        .orderBy(desc(businessReviews.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ value: count() }).from(businessReviews).where(where),
    ]);

    const repliesByReview = await withReplies(rows.map((r) => r.review.id));
    const requesterId = req.user?.id;
    let likedByRequester = new Set<string>();
    if (requesterId && rows.length > 0) {
      const likeRows = await db.select({ reviewId: businessReviewLikes.reviewId }).from(businessReviewLikes).where(and(eq(businessReviewLikes.userId, requesterId), inArray(businessReviewLikes.reviewId, rows.map((r) => r.review.id))));
      likedByRequester = new Set(likeRows.map((l) => l.reviewId));
    }
    const paginatedReviews = rows.map(({ review, user }) => ({ ...review, user, replies: repliesByReview.get(review.id) || [], isLiked: likedByRequester.has(review.id) }));

    if (paginatedReviews.length > 0) {
      await db.update(businessReviews).set({ views: sql`${businessReviews.views} + 1` }).where(inArray(businessReviews.id, paginatedReviews.map((r) => r.id)));
    }

    res.status(200).json({
      success: true,
      data: {
        reviews: paginatedReviews,
        pagination: { currentPage: page, totalPages: Math.ceil(totalItems / limit), totalItems, itemsPerPage: limit },
        averageRating: partner.averageRating,
        reviewCount: partner.reviewCount,
        approvedReviewCount: partner.approvedReviewCount || 0,
      }
    });
  } catch (error) {
    console.error('Error in getBusinessReviews:', error);
    res.status(500).json({ message: 'Failed to get reviews' });
  }
};

// Get pending reviews for the business owner's listings (or all, for admin)
export const getPendingBusinessReviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in to view pending reviews', timestamp: new Date().toISOString(), path: req.path } });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const isAdmin = req.user?.roles.includes('admin') || false;

    const where = isAdmin
      ? eq(businessReviews.status, 'pending')
      : and(eq(businessReviews.status, 'pending'), inArray(businessReviews.businessPartnerId, db.select({ id: businessPartners.id }).from(businessPartners).where(eq(businessPartners.ownerId, userId))));

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({ review: businessReviews, user: USER_COLUMNS, business: { id: businessPartners.id, name: businessPartners.name } })
        .from(businessReviews)
        .leftJoin(users, eq(businessReviews.userId, users.id))
        .leftJoin(businessPartners, eq(businessReviews.businessPartnerId, businessPartners.id))
        .where(where)
        .orderBy(desc(businessReviews.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ value: count() }).from(businessReviews).where(where),
    ]);

    const pendingReviews = rows.map(({ review, user, business }) => ({ ...review, user, businessPartnerId: business?.id, businessName: business?.name }));

    res.status(200).json({ reviews: pendingReviews, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error in getPendingBusinessReviews:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get pending reviews', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};

// Approve or reject a business review
export const updateBusinessReviewStatus = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Status must be either "approved", "rejected", or "pending"', timestamp: new Date().toISOString(), path: req.path } });
    }

    const isAdmin = req.user?.roles.includes('admin') || false;
    const [review] = await db.select().from(businessReviews).where(eq(businessReviews.id, reviewId)).limit(1);
    if (!review) {
      return res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', timestamp: new Date().toISOString(), path: req.path } });
    }

    if (!isAdmin) {
      const [partner] = await db.select({ ownerId: businessPartners.ownerId }).from(businessPartners).where(eq(businessPartners.id, review.businessPartnerId)).limit(1);
      if (!partner || partner.ownerId !== userId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not authorized to manage this review', timestamp: new Date().toISOString(), path: req.path } });
      }
    }

    const [updated] = await db.update(businessReviews).set({ status, updatedAt: new Date() }).where(eq(businessReviews.id, reviewId)).returning();
    await recalculateBusinessRating(review.businessPartnerId);

    const [partner] = await db.select({ averageRating: businessPartners.averageRating, reviewCount: businessPartners.reviewCount, approvedReviewCount: businessPartners.approvedReviewCount }).from(businessPartners).where(eq(businessPartners.id, review.businessPartnerId)).limit(1);

    res.status(200).json({ review: updated, averageRating: partner?.averageRating, reviewCount: partner?.reviewCount, approvedReviewCount: partner?.approvedReviewCount || 0 });
  } catch (error) {
    console.error('Error in updateBusinessReviewStatus:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update review status', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};

// Add a reply to a business review
export const addBusinessReviewReply = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in to reply to a review', timestamp: new Date().toISOString(), path: req.path } });
    }
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Reply comment is required', timestamp: new Date().toISOString(), path: req.path } });
    }

    const [review] = await db.select().from(businessReviews).where(eq(businessReviews.id, reviewId)).limit(1);
    if (!review) {
      return res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', timestamp: new Date().toISOString(), path: req.path } });
    }

    const [reply] = await db.insert(businessReviewReplies).values({ reviewId, userId, comment }).returning();
    const [user] = await db.select(USER_COLUMNS).from(users).where(eq(users.id, userId)).limit(1);

    res.status(201).json({ reply: { ...reply, user } });
  } catch (error) {
    console.error('Error in addBusinessReviewReply:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to add reply', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};

// Toggle a like on a business review (proper per-user toggle, unlike the
// bare-counter tour review likes — mirrors `commentLikes`).
export const toggleBusinessReviewLike = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in to like a review', timestamp: new Date().toISOString(), path: req.path } });
    }

    const [review] = await db.select({ id: businessReviews.id }).from(businessReviews).where(eq(businessReviews.id, reviewId)).limit(1);
    if (!review) {
      return res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', timestamp: new Date().toISOString(), path: req.path } });
    }

    const [existingLike] = await db.select().from(businessReviewLikes).where(and(eq(businessReviewLikes.reviewId, reviewId), eq(businessReviewLikes.userId, userId))).limit(1);

    let isLiked: boolean;
    if (existingLike) {
      await db.delete(businessReviewLikes).where(eq(businessReviewLikes.id, existingLike.id));
      await db.update(businessReviews).set({ likes: sql`greatest(${businessReviews.likes} - 1, 0)` }).where(eq(businessReviews.id, reviewId));
      isLiked = false;
    } else {
      await db.insert(businessReviewLikes).values({ reviewId, userId });
      await db.update(businessReviews).set({ likes: sql`${businessReviews.likes} + 1` }).where(eq(businessReviews.id, reviewId));
      isLiked = true;
    }

    res.status(200).json({ success: true, message: isLiked ? 'Review liked successfully' : 'Review unliked successfully', isLiked });
  } catch (error) {
    console.error('Error in toggleBusinessReviewLike:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to like review', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};

// Get review by ID (public endpoint)
export const getBusinessReviewById = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const [row] = await db
      .select({ review: businessReviews, user: USER_COLUMNS, business: { id: businessPartners.id, name: businessPartners.name, slug: businessPartners.slug } })
      .from(businessReviews)
      .leftJoin(users, eq(businessReviews.userId, users.id))
      .leftJoin(businessPartners, eq(businessReviews.businessPartnerId, businessPartners.id))
      .where(eq(businessReviews.id, reviewId));

    if (!row) {
      return res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', timestamp: new Date().toISOString(), path: req.path } });
    }

    const repliesByReview = await withReplies([reviewId]);

    res.json({
      ...row.review,
      user: row.user,
      businessPartnerId: row.business?.id,
      businessName: row.business?.name,
      businessSlug: row.business?.slug,
      replies: repliesByReview.get(reviewId) || [],
    });
  } catch (error) {
    console.error('Error in getBusinessReviewById:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get review', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};
