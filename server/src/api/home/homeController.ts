import { Request, Response } from 'express';
import { db, tours, globalCategories, globalDestinations, reviews, posts, users } from '@tourbnt/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { sendSuccess } from '../../utils/apiResponse';

/**
 * Card-sized tour columns. The homepage slider and tour cards never render
 * itinerary, gallery, FAQs, or the other JSON blobs, and reading those
 * TOAST values was the slow part of GET /tours/latest.
 */
const TOUR_CARD_COLUMNS = {
  id: tours.id,
  title: tours.title,
  code: tours.code,
  excerpt: tours.excerpt,
  coverImage: tours.coverImage,
  createdAt: tours.createdAt,
  updatedAt: tours.updatedAt,
  price: tours.price,
  saleEnabled: tours.saleEnabled,
  salePrice: tours.salePrice,
  pricingOptions: tours.pricingOptions,
  pricingOptionsEnabled: tours.pricingOptionsEnabled,
  averageRating: tours.averageRating,
  reviewCount: tours.reviewCount,
  approvedReviewCount: tours.approvedReviewCount,
  destinationId: tours.destinationId,
  descriptionSnippet: sql<string>`left(${tours.description}, 800)`.as('description_snippet'),
};

function plainExcerpt(raw: string | null | undefined, max = 280): string {
  if (!raw) return '';
  const texts: string[] = [];
  const pattern = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    try {
      texts.push(JSON.parse(`"${match[1]}"`));
    } catch {
      texts.push(match[1]);
    }
    if (texts.join(' ').length >= max) break;
  }
  const fromJson = texts.join(' ').replace(/\s+/g, ' ').trim();
  const text = fromJson || raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || text.startsWith('{') || text.startsWith('[')) return '';
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

/** Everything the public homepage renders, in one round trip. */
export const getHomeFeed = async (_req: Request, res: Response): Promise<void> => {
  try {
  const approvedCategory = and(eq(globalCategories.isApproved, true), eq(globalCategories.approvalStatus, 'approved'));
  const approvedDestination = and(
    eq(globalDestinations.isActive, true),
    eq(globalDestinations.isApproved, true),
    eq(globalDestinations.approvalStatus, 'approved'),
  );

  const [tourRows, categories, destinations, reviewRows, postRows] = await Promise.all([
    db
      .select(TOUR_CARD_COLUMNS)
      .from(tours)
      .where(eq(tours.tourStatus, 'Published'))
      .orderBy(desc(tours.createdAt))
      .limit(10),
    db
      .select({
        id: globalCategories.id,
        name: globalCategories.name,
        description: globalCategories.description,
        imageUrl: globalCategories.imageUrl,
        slug: globalCategories.slug,
        usageCount: globalCategories.usageCount,
        popularity: globalCategories.popularity,
      })
      .from(globalCategories)
      .where(approvedCategory)
      .orderBy(desc(globalCategories.usageCount), desc(globalCategories.popularity))
      .limit(12),
    db
      .select({
        id: globalDestinations.id,
        name: globalDestinations.name,
        description: globalDestinations.description,
        coverImage: globalDestinations.coverImage,
        country: globalDestinations.country,
        region: globalDestinations.region,
        city: globalDestinations.city,
        popularity: globalDestinations.popularity,
        createdAt: globalDestinations.createdAt,
      })
      .from(globalDestinations)
      .where(approvedDestination)
      .orderBy(desc(globalDestinations.popularity), desc(globalDestinations.createdAt))
      .limit(8),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        likes: reviews.likes,
        views: reviews.views,
        createdAt: reviews.createdAt,
        tourId: tours.id,
        tourTitle: tours.title,
        user: { id: users.id, name: users.name, avatar: users.avatar },
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(tours, eq(reviews.tourId, tours.id))
      .where(eq(reviews.status, 'approved'))
      .orderBy(desc(reviews.likes), desc(reviews.views), desc(reviews.createdAt))
      .limit(9),
    db
      .select({
        id: posts.id,
        title: posts.title,
        image: posts.image,
        likes: posts.likes,
        views: posts.views,
        tags: posts.tags,
        status: posts.status,
        createdAt: posts.createdAt,
        contentSnippet: sql<string>`left(${posts.content}, 2000)`.as('content_snippet'),
        commentCount: sql<number>`(SELECT count(*)::int FROM comments WHERE comments.post_id = ${posts.id})`.mapWith(Number),
        author: { id: users.id, name: users.name },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.status, 'Published'))
      .orderBy(desc(posts.createdAt))
      .limit(6),
  ]);

  const latestTours = tourRows.map(({ descriptionSnippet, excerpt, ...tour }) => {
    const blurb = plainExcerpt(excerpt) || plainExcerpt(descriptionSnippet);
    return { ...tour, excerpt: blurb, description: blurb };
  });

  const recentPosts = postRows.map(({ contentSnippet, commentCount, ...post }) => ({
    ...post,
    excerpt: plainExcerpt(contentSnippet, 220),
    commentCount: Number(commentCount) || 0,
  }));

  sendSuccess(
    res,
    {
      tours: latestTours,
      categories,
      destinations,
      reviews: reviewRows,
      posts: recentPosts,
    },
    'Home feed retrieved successfully',
  );
  } catch (error) {
    console.error('Error fetching home feed:', error);
    res.status(500).json({ success: false, message: 'Failed to load the home page' });
  }
};
