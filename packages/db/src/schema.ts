import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

/**
 * TourBNT Postgres schema — the single source of truth for data access.
 *
 * Both the Next.js app (for "simple" resources: subscribers, facts, faqs,
 * comments) and the Express API (for "heavy" resources: auth, tours,
 * bookings, gallery, notifications, posts) read/write through this schema
 * via the shared `@tourbnt/db` package. There is exactly one Postgres
 * database and one schema definition — no duplicate models.
 *
 * IDs: stored as `text` (not native uuid) so that documents migrated from
 * the existing MongoDB deployment can keep their original ObjectId strings
 * as primary keys. New rows created directly in Postgres default to a
 * generated UUID.
 */

const id = () =>
  text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum('user_role', [
  'user',
  'admin',
  'seller',
  'subscriber',
  // Business-partner roles — flipped onto a user by the matching
  // businessPartners approval flow, mirroring how 'seller' is set today.
  'guide',
  'hotel',
  'guesthouse',
  'restaurant',
  'transport',
  'advertiser',
]);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);
export const tourStatusEnum = pgEnum('tour_status', ['Draft', 'Published', 'Archived']);
export const postStatusEnum = pgEnum('post_status', ['Draft', 'Published', 'Archived']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'partial', 'paid', 'refunded']);
// Which payment policy the traveler chose at booking time — full payment now,
// a percentage deposit now with the rest due later, or nothing now (pay in
// person on arrival). Which of these a tour allows is configured on
// `tours.paymentOptions`.
export const paymentTypeEnum = pgEnum('payment_type', ['full_payment', 'deposit_percentage', 'pay_on_arrival']);
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'destination_rejected',
  'destination_approved',
  'destination_deleted',
  'general',
  'business_partner_approved',
  'business_partner_rejected',
  'business_review_received',
  'ad_approved',
  'ad_rejected',
]);
export const mediaKindEnum = pgEnum('media_kind', ['image', 'video', 'pdf']);

// Business-partner domain enums (guides, hotels, guesthouses, restaurants,
// transport/logistics providers, and general advertisers).
export const businessPartnerTypeEnum = pgEnum('business_partner_type', [
  'guide',
  'hotel',
  'guesthouse',
  'restaurant',
  'transport',
  'advertiser',
]);
// The role a business partner plays on a specific tour itinerary day.
export const itineraryPartnerRoleEnum = pgEnum('itinerary_partner_role', [
  'transport',
  'accommodation',
  'guide',
  'meals',
  'other',
]);
// Where on the site an ad campaign is eligible to render.
export const adPlacementSlotEnum = pgEnum('ad_placement_slot', [
  'tour_detail',
  'tour_sidebar',
  'hotel_page',
  'search_results',
  'homepage',
]);
export const adCampaignStatusEnum = pgEnum('ad_campaign_status', ['draft', 'active', 'paused', 'ended']);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  avatar: text('avatar'),
  phone: text('phone'),
  verified: boolean('verified').notNull().default(false),
  paymentMethods: jsonb('payment_methods').$type<
    Array<{ cardNumber?: string; expirationDate?: string; cardholderName?: string }>
  >().default([]),
  // Seller application/profile info (was `sellerInfo` embedded doc in Mongo).
  sellerInfo: jsonb('seller_info').$type<Record<string, unknown> | null>(),
  ...timestamps,
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const userSettings = pgTable('user_settings', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cloudinaryCloud: text('cloudinary_cloud').default(''),
  cloudinaryApiKey: text('cloudinary_api_key').default(''),
  cloudinaryApiSecret: text('cloudinary_api_secret').default(''),
  openaiApiKey: text('openai_api_key').default(''),
  googleApiKey: text('google_api_key').default(''),
  ...timestamps,
}, (table) => ({
  userIdx: uniqueIndex('user_settings_user_idx').on(table.userId),
}));

// User-owned "wishlist" tours (was `wishlists: ObjectId[]` on User).
export const userWishlists = pgTable('user_wishlists', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tourId: text('tour_id').notNull().references(() => tours.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.tourId] }),
}));

// ---------------------------------------------------------------------------
// Global categories / destinations (Next.js-owned)
// ---------------------------------------------------------------------------

export const globalCategories = pgTable('global_categories', {
  id: id(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url'),
  slug: text('slug').notNull(),
  reason: text('reason'),
  isApproved: boolean('is_approved').notNull().default(false),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending'),
  createdBy: text('created_by').notNull().references(() => users.id),
  approvedBy: text('approved_by').references(() => users.id),
  rejectedBy: text('rejected_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  popularity: integer('popularity').notNull().default(0),
  usageCount: integer('usage_count').notNull().default(0),
  metadata: jsonb('metadata').$type<{
    keywords?: string[];
    parentCategory?: string;
    subcategories?: string[];
  } | null>(),
  ...timestamps,
}, (table) => ({
  slugIdx: uniqueIndex('global_categories_slug_idx').on(table.slug),
  approvalIdx: index('global_categories_approval_idx').on(table.approvalStatus),
}));

export const globalDestinations = pgTable('global_destinations', {
  id: id(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  coverImage: text('cover_image'),
  country: text('country').notNull(),
  region: text('region'),
  city: text('city'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  isActive: boolean('is_active').notNull().default(true),
  isApproved: boolean('is_approved').notNull().default(false),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending'),
  createdBy: text('created_by').notNull().references(() => users.id),
  approvedBy: text('approved_by').references(() => users.id),
  rejectedBy: text('rejected_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  reason: text('reason'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: text('deleted_by').references(() => users.id),
  popularity: integer('popularity').notNull().default(0),
  usageCount: integer('usage_count').notNull().default(0),
  sellerCount: integer('seller_count').notNull().default(0),
  metadata: jsonb('metadata').$type<{
    timezone?: string;
    currency?: string;
    language?: string[];
    climate?: string;
    bestTimeToVisit?: string[];
    attractions?: string[];
  } | null>(),
  ...timestamps,
}, (table) => ({
  approvalIdx: index('global_destinations_approval_idx').on(table.approvalStatus),
  countryIdx: index('global_destinations_country_idx').on(table.country, table.region, table.city),
}));

// Per-seller visibility/ordering preferences over the global category/destination lists.
export const sellerCategoryPreferences = pgTable('seller_category_preferences', {
  id: id(),
  sellerId: text('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => globalCategories.id, { onDelete: 'cascade' }),
  isVisible: boolean('is_visible').notNull().default(true),
  isEnabled: boolean('is_enabled').notNull().default(true),
  isFavorite: boolean('is_favorite').notNull().default(false),
  customName: text('custom_name'),
  sortOrder: integer('sort_order').notNull().default(0),
  lastUsed: timestamp('last_used', { withTimezone: true }),
  ...timestamps,
}, (table) => ({
  sellerCategoryIdx: uniqueIndex('seller_category_prefs_idx').on(table.sellerId, table.categoryId),
}));

export const sellerDestinationPreferences = pgTable('seller_destination_preferences', {
  id: id(),
  sellerId: text('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  destinationId: text('destination_id').notNull().references(() => globalDestinations.id, { onDelete: 'cascade' }),
  isVisible: boolean('is_visible').notNull().default(true),
  isEnabled: boolean('is_enabled').notNull().default(true),
  isFavorite: boolean('is_favorite').notNull().default(false),
  customName: text('custom_name'),
  sortOrder: integer('sort_order').notNull().default(0),
  lastUsed: timestamp('last_used', { withTimezone: true }),
  ...timestamps,
}, (table) => ({
  sellerDestinationIdx: uniqueIndex('seller_destination_prefs_idx').on(table.sellerId, table.destinationId),
}));

// Seller-level (not per-category/destination) preference settings — one row
// per seller. Mirrors the `globalSettings` sub-document the Mongo version
// kept alongside its per-category/destination preference arrays.
export const sellerSettings = pgTable('seller_settings', {
  sellerId: text('seller_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  categorySettings: jsonb('category_settings').$type<{
    autoAcceptNewCategories?: boolean;
    defaultVisibility?: boolean;
    hideEmptyCategories?: boolean;
  } | null>(),
  destinationSettings: jsonb('destination_settings').$type<{
    autoAcceptNewDestinations?: boolean;
    defaultVisibility?: boolean;
    hideEmptyDestinations?: boolean;
    groupByCountry?: boolean;
    showPopularFirst?: boolean;
  } | null>(),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Tours (Express-owned; schema defined here as the shared source of truth)
// ---------------------------------------------------------------------------

export const tours = pgTable('tours', {
  id: id(),
  title: text('title').notNull(),
  code: text('code').notNull(),
  description: text('description').notNull(),
  excerpt: text('excerpt'),
  tourStatus: tourStatusEnum('tour_status').notNull().default('Draft'),
  coverImage: text('cover_image'),
  file: text('file'),
  outline: text('outline'),
  destinationId: text('destination_id').references(() => globalDestinations.id),

  // Flexible/nested structures kept as JSONB (itinerary steps, facts/faqs
  // snapshots, gallery items, pricing options, discount rules, tour dates).
  itinerary: jsonb('itinerary').$type<unknown[]>().default([]),
  include: jsonb('include').$type<string[]>().default([]),
  exclude: jsonb('exclude').$type<string[]>().default([]),
  facts: jsonb('facts').$type<unknown[]>().default([]),
  faqs: jsonb('faqs').$type<unknown[]>().default([]),
  gallery: jsonb('gallery').$type<unknown[]>().default([]),
  location: jsonb('location').$type<Record<string, unknown> | null>(),
  fixedDepartures: jsonb('fixed_departures').$type<unknown[]>().default([]),
  discount: jsonb('discount').$type<Record<string, unknown> | null>(),
  pricingOptions: jsonb('pricing_options').$type<unknown[]>().default([]),
  pricingGroups: jsonb('pricing_groups').$type<unknown[]>().default([]),
  tourDates: jsonb('tour_dates').$type<Record<string, unknown> | null>(),

  enquiry: boolean('enquiry').notNull().default(true),
  averageRating: doublePrecision('average_rating').notNull().default(0),
  approvedReviewCount: integer('approved_review_count').notNull().default(0),
  reviewCount: integer('review_count').notNull().default(0),
  isSpecialOffer: boolean('is_special_offer').notNull().default(false),
  views: integer('views').notNull().default(0),
  bookingCount: integer('booking_count').notNull().default(0),

  price: doublePrecision('price'),
  pricePerPerson: boolean('price_per_person').notNull().default(true),
  minSize: integer('min_size').notNull().default(1),
  maxSize: integer('max_size').notNull().default(10),
  groupSize: integer('group_size'),
  saleEnabled: boolean('sale_enabled').notNull().default(false),
  salePrice: doublePrecision('sale_price'),
  priceLockDate: timestamp('price_lock_date', { withTimezone: true }),
  pricingOptionsEnabled: boolean('pricing_options_enabled').notNull().default(false),
  fixedDeparture: boolean('fixed_departure').notNull().default(false),
  multipleDates: boolean('multiple_dates').notNull().default(false),

  // Which payment policies a traveler can choose from when booking this tour.
  // At least one should be enabled; `depositPercentage` only applies when
  // depositEnabled is true. Legacy tours with this unset are treated as
  // full-payment-only (see calculateBookingPricing's DEFAULT_PAYMENT_OPTIONS).
  paymentOptions: jsonb('payment_options').$type<{
    fullPaymentEnabled: boolean;
    depositEnabled: boolean;
    depositPercentage: number;
    payOnArrivalEnabled: boolean;
  } | null>(),

  ...timestamps,
}, (table) => ({
  codeIdx: uniqueIndex('tours_code_idx').on(table.code),
  statusIdx: index('tours_status_idx').on(table.tourStatus),
  destinationIdx: index('tours_destination_idx').on(table.destinationId),
}));

// Tour <-> category (many-to-many; Mongo stored `category: ObjectId[]` on Tour).
export const tourCategories = pgTable('tour_categories', {
  tourId: text('tour_id').notNull().references(() => tours.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => globalCategories.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.tourId, table.categoryId] }),
}));

// Tour <-> author (many-to-many; Mongo stored `author: ObjectId[]` on Tour).
export const tourAuthors = pgTable('tour_authors', {
  tourId: text('tour_id').notNull().references(() => tours.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.tourId, table.userId] }),
}));

// ---------------------------------------------------------------------------
// Bookings (Express-owned)
// ---------------------------------------------------------------------------

export const bookings = pgTable('bookings', {
  id: id(),
  tourId: text('tour_id').notNull().references(() => tours.id),
  tourTitle: text('tour_title').notNull(),
  tourCode: text('tour_code').notNull(),
  userId: text('user_id').references(() => users.id),
  isGuestBooking: boolean('is_guest_booking').notNull().default(false),
  guestInfo: jsonb('guest_info').$type<{
    fullName?: string;
    email?: string;
    phone?: string;
    country?: string;
  } | null>(),
  departureDate: timestamp('departure_date', { withTimezone: true }).notNull(),
  participants: jsonb('participants').$type<{ adults: number; children: number; infants: number }>().notNull(),
  travelers: jsonb('travelers').$type<unknown[]>().default([]),
  pricingOptionId: text('pricing_option_id'),
  pricing: jsonb('pricing').$type<{
    basePrice: number;
    adultPrice: number;
    childPrice: number;
    infantPrice: number;
    totalPrice: number;
    currency: string;
    // Which slice of totalPrice is owed now vs. later, per the chosen
    // paymentType. depositPercentage is only present for 'deposit_percentage'.
    amountDueNow: number;
    amountDueLater: number;
    depositPercentage?: number;
  }>().notNull(),
  // The payment policy the traveler chose (full payment / deposit / pay on
  // arrival) — must be one of the tour's enabled paymentOptions.
  paymentType: paymentTypeEnum('payment_type').notNull().default('full_payment'),
  contactName: text('contact_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone').notNull(),
  specialRequests: text('special_requests'),
  status: bookingStatusEnum('status').notNull().default('pending'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
  paymentMethod: text('payment_method'),
  transactionId: text('transaction_id'),
  paidAmount: doublePrecision('paid_amount').notNull().default(0),
  paymentDetails: jsonb('payment_details').$type<{
    method?: string;
    transactionId?: string;
    paidAt?: string;
  } | null>(),
  bookingDate: timestamp('booking_date', { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  bookingReference: text('booking_reference').notNull(),
  notes: text('notes'),
  ...timestamps,
}, (table) => ({
  referenceIdx: uniqueIndex('bookings_reference_idx').on(table.bookingReference),
  tourDateIdx: index('bookings_tour_date_idx').on(table.tourId, table.departureDate),
  userIdx: index('bookings_user_idx').on(table.userId),
  statusIdx: index('bookings_status_idx').on(table.status),
}));

// ---------------------------------------------------------------------------
// Media / Gallery (Express-owned) — one row per asset instead of the
// embedded images[]/videos[]/PDF[] arrays used in Mongo.
// ---------------------------------------------------------------------------

export const mediaAssets = pgTable('media_assets', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: mediaKindEnum('kind').notNull(),
  url: text('url').notNull(),
  secureUrl: text('secure_url'),
  originalFilename: text('original_filename'),
  displayName: text('display_name'),
  publicId: text('public_id'),
  description: text('description'),
  title: text('title'),
  assetId: text('asset_id'),
  width: integer('width'),
  height: integer('height'),
  format: text('format'),
  resourceType: text('resource_type'),
  tags: jsonb('tags').$type<string[]>().default([]),
  pages: integer('pages'),
  bytes: integer('bytes'),
  etag: text('etag'),
  assetFolder: text('asset_folder').default(''),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('media_assets_user_idx').on(table.userId, table.kind),
}));

// ---------------------------------------------------------------------------
// Notifications (Express-owned)
// ---------------------------------------------------------------------------

export const notifications = pgTable('notifications', {
  id: id(),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: jsonb('data').$type<Record<string, unknown> | null>(),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  ...timestamps,
}, (table) => ({
  recipientIdx: index('notifications_recipient_idx').on(table.recipientId, table.createdAt),
  recipientReadIdx: index('notifications_recipient_read_idx').on(table.recipientId, table.isRead),
}));

// ---------------------------------------------------------------------------
// Posts (Express-owned) + Comments/CommentLikes (Next.js-owned)
// ---------------------------------------------------------------------------

export const posts = pgTable('posts', {
  id: id(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  tags: jsonb('tags').$type<string[]>().default([]),
  image: text('image').default(''),
  status: postStatusEnum('status').notNull().default('Draft'),
  likes: integer('likes').notNull().default(0),
  views: integer('views').notNull().default(0),
  enableComments: boolean('enable_comments').notNull().default(true),
  ...timestamps,
});

export const comments = pgTable('comments', {
  id: id(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  parentId: text('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  approve: boolean('approve').notNull().default(false),
  likes: integer('likes').notNull().default(0),
  views: integer('views').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  postIdx: index('comments_post_idx').on(table.postId),
  parentIdx: index('comments_parent_idx').on(table.parentId),
}));

export const commentLikes = pgTable('comment_likes', {
  id: id(),
  commentId: text('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueLike: uniqueIndex('comment_likes_unique_idx').on(table.commentId, table.userId),
}));

// ---------------------------------------------------------------------------
// Reviews (Next.js-owned) — normalized out of the embedded `Tour.reviews[]`
// array so they can be queried/paginated directly instead of loading whole
// tour documents. Tour aggregate columns (averageRating/reviewCount/
// approvedReviewCount) are kept in sync by the review write endpoints.
// ---------------------------------------------------------------------------

export const reviews = pgTable('reviews', {
  id: id(),
  tourId: text('tour_id').notNull().references(() => tours.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  rating: doublePrecision('rating').notNull(),
  comment: text('comment').notNull(),
  status: reviewStatusEnum('status').notNull().default('pending'),
  likes: integer('likes').notNull().default(0),
  views: integer('views').notNull().default(0),
  ...timestamps,
}, (table) => ({
  tourUserIdx: uniqueIndex('reviews_tour_user_idx').on(table.tourId, table.userId),
  statusIdx: index('reviews_status_idx').on(table.status),
}));

export const reviewReplies = pgTable('review_replies', {
  id: id(),
  reviewId: text('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  comment: text('comment').notNull(),
  likes: integer('likes').notNull().default(0),
  views: integer('views').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  reviewIdx: index('review_replies_review_idx').on(table.reviewId),
}));

// ---------------------------------------------------------------------------
// Subscribers (Next.js-owned)
// ---------------------------------------------------------------------------

export const subscribers = pgTable('subscribers', {
  id: id(),
  email: text('email').notNull(),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
}, (table) => ({
  emailIdx: uniqueIndex('subscribers_email_idx').on(table.email),
}));

// ---------------------------------------------------------------------------
// Facts / FAQs — reusable per-user field templates (Next.js-owned).
// Cascaded copies live in `tours.facts` / `tours.faqs` (JSONB) and are kept
// in sync by the Express tours module once it migrates to this schema.
// ---------------------------------------------------------------------------

export const facts = pgTable('facts', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fieldType: text('field_type').notNull(),
  value: jsonb('value').$type<string[]>().default([]),
  icon: text('icon'),
  ...timestamps,
}, (table) => ({
  userIdx: index('facts_user_idx').on(table.userId),
}));

export const faqs = pgTable('faqs', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  ...timestamps,
}, (table) => ({
  userIdx: index('faqs_user_idx').on(table.userId),
}));

// ---------------------------------------------------------------------------
// Business Partners (Express-owned) — guides, hotels, guesthouses,
// restaurants, transport/logistics providers, and general advertisers.
// Onboarded via the same admin-approval shape as globalCategories/
// globalDestinations (isApproved/approvalStatus/approvedBy/rejectedBy/
// rejectionReason/approvedAt/rejectedAt/submittedAt) rather than another
// JSONB blob on `users` like the seller flow — this one is queryable/
// indexable and supports reviews, itinerary links, and ad campaigns below.
// ---------------------------------------------------------------------------

export const businessPartners = pgTable('business_partners', {
  id: id(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: businessPartnerTypeEnum('type').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  logo: text('logo'),
  coverImage: text('cover_image'),
  email: text('email'),
  phone: text('phone'),
  website: text('website'),
  address: jsonb('address').$type<{
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null>(),
  destinationId: text('destination_id').references(() => globalDestinations.id),
  // Type-specific extras (guide: certifications/languages; hotel/guesthouse:
  // roomCount/amenities; transport: vehicleTypes/capacity; restaurant: cuisine).
  details: jsonb('details').$type<Record<string, unknown> | null>(),
  isApproved: boolean('is_approved').notNull().default(false),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending'),
  approvedBy: text('approved_by').references(() => users.id),
  rejectedBy: text('rejected_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  averageRating: doublePrecision('average_rating').notNull().default(0),
  reviewCount: integer('review_count').notNull().default(0),
  approvedReviewCount: integer('approved_review_count').notNull().default(0),
  views: integer('views').notNull().default(0),
  ...timestamps,
}, (table) => ({
  slugIdx: uniqueIndex('business_partners_slug_idx').on(table.slug),
  ownerIdx: index('business_partners_owner_idx').on(table.ownerId),
  typeIdx: index('business_partners_type_idx').on(table.type),
  statusIdx: index('business_partners_status_idx').on(table.approvalStatus),
}));

export const businessDocuments = pgTable('business_documents', {
  id: id(),
  businessPartnerId: text('business_partner_id').notNull().references(() => businessPartners.id, { onDelete: 'cascade' }),
  docType: text('doc_type').notNull(),
  url: text('url').notNull(),
  publicId: text('public_id'),
  originalFilename: text('original_filename'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  partnerIdx: index('business_documents_partner_idx').on(table.businessPartnerId),
}));

// Directory-discoverability targeting (organic listing/search visibility) —
// separate from the ad-campaign targeting tables further below.
export const businessPartnerCategories = pgTable('business_partner_categories', {
  businessPartnerId: text('business_partner_id').notNull().references(() => businessPartners.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => globalCategories.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.businessPartnerId, table.categoryId] }),
}));

export const businessPartnerDestinations = pgTable('business_partner_destinations', {
  businessPartnerId: text('business_partner_id').notNull().references(() => businessPartners.id, { onDelete: 'cascade' }),
  destinationId: text('destination_id').notNull().references(() => globalDestinations.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.businessPartnerId, table.destinationId] }),
}));

// ---------------------------------------------------------------------------
// Business Reviews (Express-owned) — a parallel review stack for business
// partners, structurally identical to reviews/reviewReplies above but FK'd
// to businessPartnerId. Uses a real per-user like table (businessReviewLikes)
// from the start, unlike reviews.likes' bare counter.
// ---------------------------------------------------------------------------

export const businessReviews = pgTable('business_reviews', {
  id: id(),
  businessPartnerId: text('business_partner_id').notNull().references(() => businessPartners.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  rating: doublePrecision('rating').notNull(),
  comment: text('comment').notNull(),
  status: reviewStatusEnum('status').notNull().default('pending'),
  likes: integer('likes').notNull().default(0),
  views: integer('views').notNull().default(0),
  ...timestamps,
}, (table) => ({
  partnerUserIdx: uniqueIndex('business_reviews_partner_user_idx').on(table.businessPartnerId, table.userId),
  statusIdx: index('business_reviews_status_idx').on(table.status),
}));

export const businessReviewReplies = pgTable('business_review_replies', {
  id: id(),
  reviewId: text('review_id').notNull().references(() => businessReviews.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  comment: text('comment').notNull(),
  likes: integer('likes').notNull().default(0),
  views: integer('views').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  reviewIdx: index('business_review_replies_review_idx').on(table.reviewId),
}));

export const businessReviewLikes = pgTable('business_review_likes', {
  id: id(),
  reviewId: text('review_id').notNull().references(() => businessReviews.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueLike: uniqueIndex('business_review_likes_unique_idx').on(table.reviewId, table.userId),
}));

// ---------------------------------------------------------------------------
// Tour itinerary <-> business partner links. A tour agent can attach a
// registered business (linked, reviewable) or a plain free-typed name
// (businessPartnerId left null) to a specific itinerary day. `dayId` matches
// a stable client-generated id living inside `tours.itinerary`'s JSONB items,
// so links survive day drag-and-drop reordering.
// ---------------------------------------------------------------------------

export const tourItineraryPartners = pgTable('tour_itinerary_partners', {
  id: id(),
  tourId: text('tour_id').notNull().references(() => tours.id, { onDelete: 'cascade' }),
  dayId: text('day_id').notNull(),
  role: itineraryPartnerRoleEnum('role').notNull(),
  businessPartnerId: text('business_partner_id').references(() => businessPartners.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
}, (table) => ({
  tourDayIdx: index('tour_itinerary_partners_tour_day_idx').on(table.tourId, table.dayId),
  partnerIdx: index('tour_itinerary_partners_partner_idx').on(table.businessPartnerId),
}));

// ---------------------------------------------------------------------------
// Ad campaigns (Express-owned) — any approved businessPartners row (not just
// type='advertiser') can run ad creatives, targeted by category/destination
// and a placement slot, so ads only show on relevant pages (e.g. trekking-
// gear ads on trekking-category tour pages, nearby-food ads on hotel pages).
// Billing-ready (`isPaid`) but no payment gateway is wired up in this pass.
// ---------------------------------------------------------------------------

export const advertisements = pgTable('advertisements', {
  id: id(),
  businessPartnerId: text('business_partner_id').notNull().references(() => businessPartners.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  ctaLabel: text('cta_label'),
  ctaUrl: text('cta_url').notNull(),
  placementSlot: adPlacementSlotEnum('placement_slot').notNull(),
  campaignStatus: adCampaignStatusEnum('campaign_status').notNull().default('draft'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  isApproved: boolean('is_approved').notNull().default(false),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending'),
  approvedBy: text('approved_by').references(() => users.id),
  rejectedBy: text('rejected_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  impressionCount: integer('impression_count').notNull().default(0),
  clickCount: integer('click_count').notNull().default(0),
  isPaid: boolean('is_paid').notNull().default(false),
  ...timestamps,
}, (table) => ({
  partnerIdx: index('advertisements_partner_idx').on(table.businessPartnerId),
  slotIdx: index('advertisements_slot_idx').on(table.placementSlot, table.campaignStatus, table.approvalStatus),
}));

export const adCategoryTargets = pgTable('ad_category_targets', {
  adId: text('ad_id').notNull().references(() => advertisements.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => globalCategories.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.adId, table.categoryId] }),
}));

export const adDestinationTargets = pgTable('ad_destination_targets', {
  adId: text('ad_id').notNull().references(() => advertisements.id, { onDelete: 'cascade' }),
  destinationId: text('destination_id').notNull().references(() => globalDestinations.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.adId, table.destinationId] }),
}));

export const adDailyStats = pgTable('ad_daily_stats', {
  id: id(),
  adId: text('ad_id').notNull().references(() => advertisements.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
}, (table) => ({
  adDateIdx: uniqueIndex('ad_daily_stats_ad_date_idx').on(table.adId, table.date),
}));

// ---------------------------------------------------------------------------
// Relations (used for `db.query.*` joined reads)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  facts: many(facts),
  faqs: many(faqs),
  comments: many(comments),
  reviews: many(reviews),
  posts: many(posts),
  mediaAssets: many(mediaAssets),
  businessPartners: many(businessPartners),
  businessReviews: many(businessReviews),
}));

export const globalCategoriesRelations = relations(globalCategories, ({ many }) => ({
  sellerPreferences: many(sellerCategoryPreferences),
  tourCategories: many(tourCategories),
}));

export const globalDestinationsRelations = relations(globalDestinations, ({ many }) => ({
  sellerPreferences: many(sellerDestinationPreferences),
  tours: many(tours),
}));

export const sellerCategoryPreferencesRelations = relations(sellerCategoryPreferences, ({ one }) => ({
  seller: one(users, { fields: [sellerCategoryPreferences.sellerId], references: [users.id] }),
  category: one(globalCategories, { fields: [sellerCategoryPreferences.categoryId], references: [globalCategories.id] }),
}));

export const sellerDestinationPreferencesRelations = relations(sellerDestinationPreferences, ({ one }) => ({
  seller: one(users, { fields: [sellerDestinationPreferences.sellerId], references: [users.id] }),
  destination: one(globalDestinations, { fields: [sellerDestinationPreferences.destinationId], references: [globalDestinations.id] }),
}));

export const toursRelations = relations(tours, ({ one, many }) => ({
  destination: one(globalDestinations, { fields: [tours.destinationId], references: [globalDestinations.id] }),
  categories: many(tourCategories),
  authors: many(tourAuthors),
  reviews: many(reviews),
  bookings: many(bookings),
}));

export const tourCategoriesRelations = relations(tourCategories, ({ one }) => ({
  tour: one(tours, { fields: [tourCategories.tourId], references: [tours.id] }),
  category: one(globalCategories, { fields: [tourCategories.categoryId], references: [globalCategories.id] }),
}));

export const tourAuthorsRelations = relations(tourAuthors, ({ one }) => ({
  tour: one(tours, { fields: [tourAuthors.tourId], references: [tours.id] }),
  author: one(users, { fields: [tourAuthors.userId], references: [users.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  parent: one(comments, { fields: [comments.parentId], references: [comments.id], relationName: 'commentReplies' }),
  replies: many(comments, { relationName: 'commentReplies' }),
  likes: many(commentLikes),
}));

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  comment: one(comments, { fields: [commentLikes.commentId], references: [comments.id] }),
  user: one(users, { fields: [commentLikes.userId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  tour: one(tours, { fields: [reviews.tourId], references: [tours.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  replies: many(reviewReplies),
}));

export const reviewRepliesRelations = relations(reviewReplies, ({ one }) => ({
  review: one(reviews, { fields: [reviewReplies.reviewId], references: [reviews.id] }),
  user: one(users, { fields: [reviewReplies.userId], references: [users.id] }),
}));

export const factsRelations = relations(facts, ({ one }) => ({
  user: one(users, { fields: [facts.userId], references: [users.id] }),
}));

export const faqsRelations = relations(faqs, ({ one }) => ({
  user: one(users, { fields: [faqs.userId], references: [users.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tour: one(tours, { fields: [bookings.tourId], references: [tours.id] }),
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, { fields: [notifications.recipientId], references: [users.id] }),
  sender: one(users, { fields: [notifications.senderId], references: [users.id] }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  owner: one(users, { fields: [mediaAssets.userId], references: [users.id] }),
}));

export const businessPartnersRelations = relations(businessPartners, ({ one, many }) => ({
  owner: one(users, { fields: [businessPartners.ownerId], references: [users.id] }),
  destination: one(globalDestinations, { fields: [businessPartners.destinationId], references: [globalDestinations.id] }),
  documents: many(businessDocuments),
  categories: many(businessPartnerCategories),
  destinations: many(businessPartnerDestinations),
  reviews: many(businessReviews),
  itineraryLinks: many(tourItineraryPartners),
  ads: many(advertisements),
}));

export const businessDocumentsRelations = relations(businessDocuments, ({ one }) => ({
  businessPartner: one(businessPartners, { fields: [businessDocuments.businessPartnerId], references: [businessPartners.id] }),
}));

export const businessPartnerCategoriesRelations = relations(businessPartnerCategories, ({ one }) => ({
  businessPartner: one(businessPartners, { fields: [businessPartnerCategories.businessPartnerId], references: [businessPartners.id] }),
  category: one(globalCategories, { fields: [businessPartnerCategories.categoryId], references: [globalCategories.id] }),
}));

export const businessPartnerDestinationsRelations = relations(businessPartnerDestinations, ({ one }) => ({
  businessPartner: one(businessPartners, { fields: [businessPartnerDestinations.businessPartnerId], references: [businessPartners.id] }),
  destination: one(globalDestinations, { fields: [businessPartnerDestinations.destinationId], references: [globalDestinations.id] }),
}));

export const businessReviewsRelations = relations(businessReviews, ({ one, many }) => ({
  businessPartner: one(businessPartners, { fields: [businessReviews.businessPartnerId], references: [businessPartners.id] }),
  user: one(users, { fields: [businessReviews.userId], references: [users.id] }),
  replies: many(businessReviewReplies),
  likes: many(businessReviewLikes),
}));

export const businessReviewRepliesRelations = relations(businessReviewReplies, ({ one }) => ({
  review: one(businessReviews, { fields: [businessReviewReplies.reviewId], references: [businessReviews.id] }),
  user: one(users, { fields: [businessReviewReplies.userId], references: [users.id] }),
}));

export const businessReviewLikesRelations = relations(businessReviewLikes, ({ one }) => ({
  review: one(businessReviews, { fields: [businessReviewLikes.reviewId], references: [businessReviews.id] }),
  user: one(users, { fields: [businessReviewLikes.userId], references: [users.id] }),
}));

export const tourItineraryPartnersRelations = relations(tourItineraryPartners, ({ one }) => ({
  tour: one(tours, { fields: [tourItineraryPartners.tourId], references: [tours.id] }),
  businessPartner: one(businessPartners, { fields: [tourItineraryPartners.businessPartnerId], references: [businessPartners.id] }),
}));

export const advertisementsRelations = relations(advertisements, ({ one, many }) => ({
  businessPartner: one(businessPartners, { fields: [advertisements.businessPartnerId], references: [businessPartners.id] }),
  categoryTargets: many(adCategoryTargets),
  destinationTargets: many(adDestinationTargets),
  dailyStats: many(adDailyStats),
}));

export const adCategoryTargetsRelations = relations(adCategoryTargets, ({ one }) => ({
  ad: one(advertisements, { fields: [adCategoryTargets.adId], references: [advertisements.id] }),
  category: one(globalCategories, { fields: [adCategoryTargets.categoryId], references: [globalCategories.id] }),
}));

export const adDestinationTargetsRelations = relations(adDestinationTargets, ({ one }) => ({
  ad: one(advertisements, { fields: [adDestinationTargets.adId], references: [advertisements.id] }),
  destination: one(globalDestinations, { fields: [adDestinationTargets.destinationId], references: [globalDestinations.id] }),
}));

export const adDailyStatsRelations = relations(adDailyStats, ({ one }) => ({
  ad: one(advertisements, { fields: [adDailyStats.adId], references: [advertisements.id] }),
}));
