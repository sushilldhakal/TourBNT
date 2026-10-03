import { Request, Response } from 'express';
import { db, reviews, reviewReplies, tours, tourAuthors, users, bookings } from '../../db';
import { eq, and, or, ilike, desc, asc, avg, count, inArray, sql, type SQLWrapper } from 'drizzle-orm';
import { sendSuccess } from '../../utils/apiResponse';
import { invalidateTour } from '../../services/cacheInvalidation';

const USER_COLUMNS = { id: users.id, name: users.name, email: users.email, avatar: users.avatar, roles: users.role } as const;

/** Recomputes and persists a tour's averageRating/reviewCount/approvedReviewCount. */
async function recalculateTourRating(tourId: string) {
  const [stats] = await db
    .select({ averageRating: avg(reviews.rating), numberOfReviews: count() })
    .from(reviews)
    .where(and(eq(reviews.tourId, tourId), eq(reviews.status, 'approved')));

  const [{ value: totalReviews }] = await db.select({ value: count() }).from(reviews).where(eq(reviews.tourId, tourId));

  await db
    .update(tours)
    .set({
      averageRating: stats?.averageRating ? Number(stats.averageRating) : 0,
      approvedReviewCount: stats?.numberOfReviews ?? 0,
      reviewCount: totalReviews,
    })
    .where(eq(tours.id, tourId));

  // Cards, the home feed and the agency rollup all show this rating.
  await invalidateTour(tourId, { extraFamilies: ['reviews'] });
}

async function withReplies(reviewIds: string[] | SQLWrapper) {
  // Accepts explicit ids or a sub-select of ids (so it can run in the same round trip as the page).
  if (Array.isArray(reviewIds) && reviewIds.length === 0) return new Map<string, unknown[]>();
  const rows = await db
    .select({ reply: reviewReplies, user: USER_COLUMNS })
    .from(reviewReplies)
    .leftJoin(users, eq(reviewReplies.userId, users.id))
    .where(inArray(reviewReplies.reviewId, reviewIds));

  const byReview = new Map<string, unknown[]>();
  for (const { reply, user } of rows) {
    const list = byReview.get(reply.reviewId) || [];
    list.push({ ...reply, user });
    byReview.set(reply.reviewId, list);
  }
  return byReview;
}

// Get average rating for a tour
export const getTourRating = async (req: Request, res: Response) => {
  try {
    const { tourId } = req.params;
    const [tour] = await db.select({ averageRating: tours.averageRating, reviewCount: tours.approvedReviewCount }).from(tours).where(eq(tours.id, tourId)).limit(1);

    return sendSuccess(res, {
      averageRating: tour?.averageRating || 0,
      numberOfReviews: tour?.reviewCount || 0,
    }, 'Tour rating retrieved successfully');
  } catch (error) {
    res.status(500).json({ message: 'Error calculating tour rating', error });
  }
};

// Get all approved reviews (public endpoint for guest users)
export const getAllApprovedReviews = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;
    const status = (req.filters?.status as string) || 'approved';
    const sortField = req.sort?.field === 'rating' ? reviews.rating : reviews.createdAt;
    const sortOrderFn = req.sort?.order === 'asc' ? asc : desc;

    const where = eq(reviews.status, status as 'pending' | 'approved' | 'rejected');

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({ review: reviews, user: USER_COLUMNS, tour: { id: tours.id, title: tours.title, coverImage: tours.coverImage } })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(tours, eq(reviews.tourId, tours.id))
        .where(where)
        .orderBy(sortOrderFn(sortField))
        .limit(pageLimit)
        .offset(skip),
      db.select({ value: count() }).from(reviews).where(where),
    ]);

    const repliesByReview = await withReplies(rows.map((r) => r.review.id));
    const allReviews = rows.map(({ review, user, tour }) => ({
      ...review,
      user,
      tourId: tour?.id,
      tourTitle: tour?.title,
      tourImage: tour?.coverImage,
      replies: repliesByReview.get(review.id) || [],
    }));

    res.json({ reviews: allReviews, total, page, limit: pageLimit, totalPages: Math.ceil(total / pageLimit) });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error fetching reviews', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path }
    });
  }
};

/**
 * Who may write a tour review: only a traveller whose booking on this tour was confirmed or completed AND whose
 * departure date has passed — i.e. someone who has actually taken the trip. Admins may always review (moderation,
 * testing); the tour's own sellers may not review it.
 */
async function reviewEligibility(userId: string, roles: string[], tourId: string): Promise<{ canReview: boolean; reason?: 'own_tour' | 'no_booking' | 'trip_not_taken'; message?: string; tripDate?: Date }> {
  if (roles.includes('admin')) return { canReview: true };

  const [own] = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(and(eq(tourAuthors.tourId, tourId), eq(tourAuthors.userId, userId))).limit(1);
  if (own) return { canReview: false, reason: 'own_tour', message: 'You cannot review a tour you run.' };

  const mine = await db
    .select({ departureDate: bookings.departureDate })
    .from(bookings)
    .where(and(eq(bookings.tourId, tourId), eq(bookings.userId, userId), inArray(bookings.status, ['confirmed', 'completed'])));
  if (mine.length === 0) return { canReview: false, reason: 'no_booking', message: 'Only travellers who booked this tour can review it. Book a departure and share your experience after the trip.' };

  const now = new Date();
  if (!mine.some((b) => new Date(b.departureDate) <= now)) {
    const next = mine.map((b) => new Date(b.departureDate)).sort((a, b) => a.getTime() - b.getTime())[0];
    return { canReview: false, reason: 'trip_not_taken', tripDate: next, message: `You can review this tour after your trip on ${next.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}.` };
  }
  return { canReview: true };
}

// Can the signed-in user review this tour? (drives the review form on the tour page)
export const getReviewEligibility = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'You must be logged in to add a review' });
    const result = await reviewEligibility(req.user.id, req.user.roles ?? [], req.params.tourId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ message: 'Could not check review eligibility' });
  }
};

// Add a review to a tour
export const addReview = async (req: Request, res: Response) => {
  try {
    const { tourId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'You must be logged in to add a review' });
    }
    if (!rating || rating < 0.5 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 0.5 and 5' });
    }

    const [tour] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }

    const roundedRating = Math.round(rating * 2) / 2;

    const [existingReview] = await db.select().from(reviews).where(and(eq(reviews.tourId, tourId), eq(reviews.userId, userId))).limit(1);

    // Editing your own earlier review is always allowed; a NEW review needs a taken trip (see reviewEligibility).
    if (!existingReview) {
      const eligibility = await reviewEligibility(userId, req.user?.roles ?? [], tourId);
      if (!eligibility.canReview) return res.status(403).json({ message: eligibility.message ?? 'You cannot review this tour.' });
    }

    let review;
    let isUpdate = false;
    if (existingReview) {
      isUpdate = true;
      [review] = await db
        .update(reviews)
        .set({ rating: roundedRating, comment, status: 'pending', updatedAt: new Date() })
        .where(eq(reviews.id, existingReview.id))
        .returning();
    } else {
      [review] = await db.insert(reviews).values({ tourId, userId, rating: roundedRating, comment, status: 'pending' }).returning();
    }

    await recalculateTourRating(tourId);
    await db.update(tours).set({ views: sql`${tours.views} + 1` }).where(eq(tours.id, tourId));

    const [updatedTour] = await db.select({ averageRating: tours.averageRating, reviewCount: tours.reviewCount, approvedReviewCount: tours.approvedReviewCount }).from(tours).where(eq(tours.id, tourId)).limit(1);

    res.status(200).json({
      success: true,
      message: isUpdate ? 'Review updated successfully' : 'Review added successfully. It will be visible after approval.',
      data: { review, averageRating: updatedTour?.averageRating, reviewCount: updatedTour?.reviewCount, approvedReviewCount: updatedTour?.approvedReviewCount || 0 }
    });
  } catch (error) {
    console.error('Error in addReview:', error);
    res.status(500).json({ message: 'Failed to add review', error });
  }
};

// Get reviews for a tour
export const getTourReviews = async (req: Request, res: Response) => {
  try {
    const { tourId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || 'all';

    const [tour] = await db.select({ averageRating: tours.averageRating, reviewCount: tours.reviewCount, approvedReviewCount: tours.approvedReviewCount }).from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }

    const where = status === 'all' ? eq(reviews.tourId, tourId) : and(eq(reviews.tourId, tourId), eq(reviews.status, status as 'pending' | 'approved' | 'rejected'));

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db
        .select({ review: reviews, user: USER_COLUMNS })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(where)
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ value: count() }).from(reviews).where(where),
    ]);

    const repliesByReview = await withReplies(rows.map((r) => r.review.id));
    const paginatedReviews = rows.map(({ review, user }) => ({ ...review, user, replies: repliesByReview.get(review.id) || [] }));

    // Track a view per review being displayed on this page.
    if (paginatedReviews.length > 0) {
      await db.update(reviews).set({ views: sql`${reviews.views} + 1` }).where(inArray(reviews.id, paginatedReviews.map((r) => r.id)));
    }

    res.status(200).json({
      success: true,
      data: {
        reviews: paginatedReviews,
        pagination: { currentPage: page, totalPages: Math.ceil(totalItems / limit), totalItems, itemsPerPage: limit },
        averageRating: tour.averageRating,
        reviewCount: tour.reviewCount,
        approvedReviewCount: tour.approvedReviewCount || 0,
      }
    });
  } catch (error) {
    console.error('Error in getTourReviews:', error);
    res.status(500).json({ message: 'Failed to get reviews' });
  }
};

// Get pending reviews for a seller's tours
export const getPendingReviews = async (req: Request, res: Response) => {
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
      ? eq(reviews.status, 'pending')
      : and(eq(reviews.status, 'pending'), inArray(reviews.tourId, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId))));

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({ review: reviews, user: USER_COLUMNS, tour: { id: tours.id, title: tours.title } })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(tours, eq(reviews.tourId, tours.id))
        .where(where)
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ value: count() }).from(reviews).where(where),
    ]);

    const pendingReviews = rows.map(({ review, user, tour }) => ({ ...review, user, tourId: tour?.id, tourTitle: tour?.title }));

    res.status(200).json({ reviews: pendingReviews, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error in getPendingReviews:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get pending reviews', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};

// Get all reviews for a seller (any status)
export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'You must be logged in to view reviews' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const isAdmin = req.user?.roles.includes('admin') || false;

    const where = isAdmin ? undefined : inArray(reviews.tourId, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId)));

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db
        .select({ review: reviews, user: USER_COLUMNS, tour: { id: tours.id, title: tours.title } })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(tours, eq(reviews.tourId, tours.id))
        .where(where)
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(skip),
      db.select({ value: count() }).from(reviews).where(where),
    ]);

    const repliesByReview = await withReplies(rows.map((r) => r.review.id));
    const allReviews = rows.map(({ review, user, tour }) => ({ ...review, user, tourId: tour?.id, tourTitle: tour?.title, replies: repliesByReview.get(review.id) || [] }));

    res.status(200).json({
      success: true,
      data: { reviews: allReviews, pagination: { currentPage: page, totalPages: Math.ceil(totalItems / limit), totalItems, itemsPerPage: limit } }
    });
  } catch (error) {
    console.error('Error in getAllReviews:', error);
    res.status(500).json({ message: 'Failed to get reviews' });
  }
};

// Approve or reject a review
export const updateReviewStatus = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Status must be either "approved", "rejected", or "pending"', timestamp: new Date().toISOString(), path: req.path } });
    }

    const isAdmin = req.user?.roles.includes('admin') || false;
    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
    if (!review) {
      return res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', timestamp: new Date().toISOString(), path: req.path } });
    }

    if (!isAdmin) {
      const [isAuthor] = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(and(eq(tourAuthors.tourId, review.tourId), eq(tourAuthors.userId, userId!))).limit(1);
      if (!isAuthor) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not authorized to manage this review', timestamp: new Date().toISOString(), path: req.path } });
      }
    }

    const [updated] = await db.update(reviews).set({ status, updatedAt: new Date() }).where(eq(reviews.id, reviewId)).returning();
    await recalculateTourRating(review.tourId);

    const [tour] = await db.select({ averageRating: tours.averageRating, reviewCount: tours.reviewCount, approvedReviewCount: tours.approvedReviewCount }).from(tours).where(eq(tours.id, review.tourId)).limit(1);

    res.status(200).json({ review: updated, averageRating: tour?.averageRating, reviewCount: tour?.reviewCount, approvedReviewCount: tour?.approvedReviewCount || 0 });
  } catch (error) {
    console.error('Error in updateReviewStatus:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update review status', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};

// Add a reply to a review
export const addReviewReply = async (req: Request, res: Response) => {
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

    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
    if (!review) {
      return res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', timestamp: new Date().toISOString(), path: req.path } });
    }

    const [reply] = await db.insert(reviewReplies).values({ reviewId, userId, comment }).returning();
    const [user] = await db.select(USER_COLUMNS).from(users).where(eq(users.id, userId)).limit(1);

    res.status(201).json({ reply: { ...reply, user } });
  } catch (error) {
    console.error('Error in addReviewReply:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to add reply', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};

// Like a review
export const likeReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in to like a review', timestamp: new Date().toISOString(), path: req.path } });
    }

    const [updated] = await db.update(reviews).set({ likes: sql`${reviews.likes} + 1` }).where(eq(reviews.id, reviewId)).returning({ id: reviews.id });
    if (!updated) {
      return res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', timestamp: new Date().toISOString(), path: req.path } });
    }

    res.status(200).json({ message: 'Review liked successfully' });
  } catch (error) {
    console.error('Error in likeReview:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to like review', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};

// Like a review reply
export const likeReviewReply = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'You must be logged in to like a reply' });
    }

    const [updated] = await db.update(reviewReplies).set({ likes: sql`${reviewReplies.likes} + 1` }).where(eq(reviewReplies.id, replyId)).returning({ id: reviewReplies.id });
    if (!updated) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    res.status(200).json({ success: true, message: 'Reply liked successfully' });
  } catch (error) {
    console.error('Error in likeReviewReply:', error);
    res.status(500).json({ message: 'Failed to like reply', error });
  }
};

// Increment view count for a review
export const incrementReviewView = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const [updated] = await db.update(reviews).set({ views: sql`${reviews.views} + 1` }).where(eq(reviews.id, reviewId)).returning({ id: reviews.id });
    if (!updated) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.status(200).json({ success: true, message: 'Review view count incremented' });
  } catch (error) {
    console.error('Error in incrementReviewView:', error);
    res.status(500).json({ message: 'Failed to increment view count', error });
  }
};

// Increment view count for a reply
export const incrementReplyView = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const [updated] = await db.update(reviewReplies).set({ views: sql`${reviewReplies.views} + 1` }).where(eq(reviewReplies.id, replyId)).returning({ id: reviewReplies.id });
    if (!updated) {
      return res.status(404).json({ message: 'Reply not found' });
    }
    res.status(200).json({ success: true, message: 'Reply view count incremented' });
  } catch (error) {
    console.error('Error in incrementReplyView:', error);
    res.status(500).json({ message: 'Failed to increment view count', error });
  }
};

// Get review by ID (public endpoint)
export const getReviewById = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const [row] = await db
      .select({ review: reviews, user: USER_COLUMNS, tour: { id: tours.id, title: tours.title, coverImage: tours.coverImage } })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(tours, eq(reviews.tourId, tours.id))
      .where(eq(reviews.id, reviewId));

    if (!row) {
      return res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found', timestamp: new Date().toISOString(), path: req.path } });
    }

    const repliesByReview = await withReplies([reviewId]);

    res.json({
      ...row.review,
      user: row.user,
      tourId: row.tour?.id,
      tourTitle: row.tour?.title,
      tourImage: row.tour?.coverImage,
      replies: repliesByReview.get(reviewId) || [],
    });
  } catch (error) {
    console.error('Error in getReviewById:', error);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get review', details: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString(), path: req.path } });
  }
};


/**
 * Moderation list for the dashboard: every review (any status) on the caller's
 * tours — or on every tour for an admin — filterable by status and free text,
 * with per-status counts for the tabs.
 * GET /api/v1/reviews/manage?status=&q=&page=&limit=
 */
export const listManagedReviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'You must be logged in to view reviews' });

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const isAdmin = req.user?.roles.includes('admin') || false;

    const scope = isAdmin ? undefined : inArray(reviews.tourId, db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId)));
    const conditions = [];
    if (scope) conditions.push(scope);
    if (['pending', 'approved', 'rejected'].includes(status)) conditions.push(eq(reviews.status, status as 'pending' | 'approved' | 'rejected'));
    if (q) {
      const like = `%${q}%`;
      conditions.push(or(ilike(reviews.comment, like), ilike(tours.title, like), ilike(users.name, like)));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    // Ids of exactly this page (same joins/filter/order/limit) so the replies can be fetched in the
    // same round trip as the page itself.
    const pageIds = db
      .select({ id: reviews.id })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(tours, eq(reviews.tourId, tours.id))
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [rows, [{ value: totalItems }], statusRows, repliesByReview] = await Promise.all([
      db
        .select({ review: reviews, user: USER_COLUMNS, tour: { id: tours.id, title: tours.title, code: tours.code } })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(tours, eq(reviews.tourId, tours.id))
        .where(where)
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: count() }).from(reviews).leftJoin(users, eq(reviews.userId, users.id)).leftJoin(tours, eq(reviews.tourId, tours.id)).where(where),
      db.select({ status: reviews.status, value: count() }).from(reviews).where(scope).groupBy(reviews.status),
      withReplies(pageIds),
    ]);

    const items = rows.map(({ review, user, tour }) => ({ ...review, user, tourId: tour?.id, tourTitle: tour?.title, tourCode: tour?.code, replies: repliesByReview.get(review.id) || [] }));
    const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const r of statusRows) counts[r.status] = Number(r.value);

    res.status(200).json({ success: true, items, counts, pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } });
  } catch (error) {
    console.error('Error in listManagedReviews:', error);
    res.status(500).json({ message: 'Failed to get reviews' });
  }
};
