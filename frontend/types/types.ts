// User – canonical in user.ts; import for use below, re-export for consumers
import type { User } from './user';
export type { User } from './user';

// Review types
export interface Reply {
    id: string;
    comment: string;
    user: User;
    createdAt: string;
    likes: number;
    views: number;
    replies?: Reply[]; // Support nested replies
}

export interface Review {
    id: string;
    rating: number;
    title: string;
    comment: string;
    user?: User;
    name?: string; // For non-authenticated users
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    likes: number;
    views: number;
    replies?: Reply[];
    tour: string;
    tourId?: string;
    tourTitle?: string;
}

export interface Author {
    id: string;
    name: string;
    email?: string;
    profilePicture?: string;
    avatar?: string;
}

// Blog/Post types
export interface Post {
    id: string;
    title: string;
    content: string;
    author: Author;
    tags: string[];
    image: string;
    status: 'draft' | 'published' | 'archived';
    likes: number;
    comments: Comment[];
    commentsCount?: number;
    enableComments: boolean;
    views: number;
    createdAt: string;
    updatedAt: string;
    liked?: boolean;
    __v: number;
}


export interface Comment {
    id: string;
    user: User;
    text: string;
    post: Post;
    createdAt: string;
    status: "pending" | "approved" | "rejected";
    approve: boolean;
    created_at: string;
}

export interface PostResponse {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    posts: Post[];
}

// Category types
export interface Category {
    id: string;
    name: string;
    description?: string;
    image?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CategoryData {
    id: string;
    /** Set by normalizeCategories (useCategories.ts); the user-category id the dashboard edits by. */
    _id?: string;
    name: string;
    description: string;
    imageUrl?: string;
    isActive?: boolean;
    userId: string;
    isApproved: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string; // Reason for rejection (when approvalStatus is 'rejected')
    rejectedAt?: string; // Timestamp when category was rejected
    rejectedBy?: string; // ID of admin who rejected the category
    usageCount?: number;
    featuredTours?: string[];
    reason?: string; // Add this field
    createdBy?: string;
}

// Destination types
export interface Destination {
    id: string;
    name: string;
    description: string;
    coverImage: string;
    country: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    featuredTours?: Tour[];
    popularity?: number;
    usageCount?: number;
}

export interface DestinationTypes {
    approvalStatus: string;
    _id?: string; // MongoDB _id
    id?: string; // API response id (normalized to _id)
    name: string;
    description: string;
    coverImage: string;
    country: string;
    region?: string;
    city?: string;
    isActive: boolean;
    featuredTours?: string[];
    popularity?: number;
    createdAt: string;
    userId?: string;
    reason?: string;
    submittedAt?: string;
    createdBy?: string | { name?: string };
    rejectionReason?: string; // Reason for rejection (when approvalStatus is 'rejected')
    rejectedAt?: string; // Timestamp when destination was rejected
    rejectedBy?: string; // ID of admin who rejected the destination
}

// Destination component types
export interface TourTitle {
    id: string;
    title: string;
    code?: string;
}

export interface TourObject {
    _id?: string;
    id?: string;
    title?: string;
}

export interface DescriptionContent {
    type?: string;
    content?: Array<{
        type?: string;
        content?: Array<{
            type?: string;
            text?: string;
        }>;
    }>;
}

export interface DestinationGridViewProps {
    destinations: DestinationTypes[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

export interface DestinationTableViewProps {
    destinations: DestinationTypes[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

export interface EditDestinationDialogProps {
    destinationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

// Discount types
// Control presence with discountEnabled, not with type: 'none'
/** A discount as the API stores it on a tour or on one of its pricing options. */
export interface Discount {
    discountEnabled?: boolean;
    /** true = percentage off (discountPercentage), false = fixed amount off (discountPrice). */
    percentageOrPrice?: boolean;
    discountPercentage?: number;
    discountPrice?: number;
    discountDateRange?: { from?: string; to?: string };
    discountCode?: string;
    description?: string;
}

// Gallery types
export interface GalleryItem {
    _id?: string;
    id?: string;
    image: string;
    alt?: string;
    sortOrder?: number;
    isFeatured?: boolean;
    public_id?: string;
    url?: string;
    width?: number;
    height?: number;
    format?: string;
    resource_type?: string;
    created_at?: string | Date;
    bytes?: number;
    secure_url?: string;
}

/** Tour gallery carousel item (image or video) */
export interface TourGalleryItem {
    image: string;
    alt: string;
    type: 'image' | 'video';
}

// Fact types – canonical in facts.ts
export type { FactData } from './facts';

// Itinerary types
export interface ItineraryPartner {
    role: 'transport' | 'accommodation' | 'guide' | 'meals' | 'other';
    businessPartnerId?: string;
    name: string;
    notes?: string;
    // Enriched at read time from the live business record when businessPartnerId is set.
    businessPartnerSlug?: string;
    businessPartnerType?: string;
    businessPartnerRating?: number;
    businessPartnerReviewCount?: number;
}

/** One itinerary day. Dates arrive from the API as ISO strings. */
export interface Itinerary {
    id?: string;
    day?: string;
    title: string;
    description: string;
    dateTime?: Date | string;
    date?: string | Date;
    time?: string;
    destination?: string;
    outline?: string;
    partners?: ItineraryPartner[];
}

// FAQ types – canonical in faq.ts
export type { FaqData } from './faq';

// Date Range types
export interface DateRange {
    from: string;
    to: string;
}

// Tour dates as the server stores them (see server processTourDatesData).
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Departure {
    id?: string;
    label: string;
    dateRange: DateRange;
    capacity?: number;
    selectedPricingOptions?: string[];
    pricingCategory?: string[];
    isRecurring?: boolean;
    recurrencePattern?: RecurrencePattern;
    recurrenceInterval?: number;
    recurrenceEndDate?: string;
}

export interface TourDates {
    scheduleType: 'flexible' | 'fixed' | 'multiple' | 'recurring';
    days?: number;
    nights?: number;
    /** The fixed date range (scheduleType 'fixed'). */
    defaultDateRange?: DateRange;
    departures?: Departure[];
    isRecurring?: boolean;
    recurrencePattern?: RecurrencePattern;
    recurrenceInterval?: number;
    recurrenceEndDate?: string;
    selectedPricingOptions?: string[];
    pricingCategory?: string[];
}

export interface PaxRange {
    minPax: number;
    maxPax: number;
}

export interface PricingOption {
    id?: string;
    /** Only on legacy rows; use `id`. */
    _id?: string;
    name: string;
    price: number;
    category: 'adult' | 'child' | 'senior' | 'student' | 'custom';
    customCategory?: string;
    description?: string;
    maxTravelers?: number;
    paxRange?: PaxRange;
    /** Legacy rows keep the flag here; current ones keep it in `discount.discountEnabled`. */
    discountEnabled?: boolean;
    discount?: Discount;
    isActive?: boolean;
}

export interface PricingGroup {
    label: string;
    options: PricingOption[];
}

// Location types
export interface Location {
    name?: string;
    map?: string;
    placeId?: string;
    position?: {
        lat: number;
        lng: number;
    };
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
    formatted_address?: string;
    lat?: number;
    lng?: number;
}

/** Rich text as the editor stores it (a JSON document), or older plain-text / HTML / list content. */
export type RichText = string | string[] | { type: string; content?: unknown[] };

/** A fact copied onto a tour. The editor stores `title`; older copies have `name`. */
export interface TourFact {
    id?: string;
    factId?: string;
    name?: string;
    title?: string;
    icon?: string;
    field_type?: 'Plain Text' | 'Single Select' | 'Multi Select';
    value?: string | string[] | Array<{ label?: string; value?: string }>;
}

export interface TourFaq {
    id?: string;
    faqId?: string;
    question: string;
    answer: string;
}

export interface TourGalleryImage {
    id?: string;
    image: string;
    caption?: string;
    sortOrder?: number;
    isFeatured?: boolean;
}

export interface TourAuthor {
    id: string;
    name: string;
    email?: string;
    roles?: string;
}

export interface TourPaymentOptions {
    fullPaymentEnabled: boolean;
    depositEnabled: boolean;
    depositPercentage: number;
    payOnArrivalEnabled: boolean;
}

/** A tour exactly as GET /tours/:id (and the tour lists) return it. The one Tour type in the app. */
export interface Tour {
    id: string;
    title: string;
    code: string;
    description?: string;
    excerpt?: string | null;
    tourStatus: 'Draft' | 'Published' | 'Archived';
    coverImage?: string | null;
    file?: string | null;
    outline?: string | null;
    destinationId?: string | null;
    /** Present when the request asked for related data. */
    destination?: string | Destination;
    author?: TourAuthor[];
    category?: Category[];

    itinerary?: Itinerary[];
    include?: RichText;
    exclude?: RichText;
    facts?: TourFact[];
    faqs?: TourFaq[];
    gallery?: TourGalleryImage[];
    location?: Location;
    map?: string;

    price: number;
    pricePerPerson?: boolean;
    minSize?: number;
    maxSize?: number;
    groupSize?: number | null;
    saleEnabled?: boolean;
    salePrice?: number;
    originalPrice?: number;
    priceLockDate?: string | null;
    discountEnabled?: boolean;
    discount?: Discount;
    pricingOptionsEnabled?: boolean;
    pricingOptions?: PricingOption[];
    pricingGroups?: PricingGroup[];
    paymentOptions?: TourPaymentOptions;

    tourDates?: TourDates;
    fixedDeparture?: boolean;
    multipleDates?: boolean;
    /** Days, where a list shows a duration. */
    duration?: number;

    reviews?: Review[];
    averageRating?: number;
    reviewCount?: number;
    approvedReviewCount?: number;
    views?: number;
    bookingCount?: number;
    isSpecialOffer?: boolean;
    enquiry?: boolean;

    createdAt: string;
    updatedAt: string;
}
// Tour API Response types
export interface TourResponse {
    // Format 1: items with cursor-based pagination
    items?: Tour[];
    nextCursor?: number;

    // Format 2: pagination object
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems?: number;
        totalTours?: number;
        itemsPerPage?: number;
        hasNextPage?: boolean;
        hasPrevPage?: boolean;
    };

    // Format 3: success with data array directly
    success?: boolean;
    data?: Tour[] | {
        tours: Tour[];
        pagination?: {
            currentPage: number;
            totalPages: number;
            totalTours: number;
            hasNextPage: boolean;
        };
    };

    // Format 4: direct tours array
    tours?: Tour[];

    // Common fields
    message?: string;
    error?: string;
}

// Tour pricing calculation result
export interface TourPricing {
    originalPrice: number;
    displayPrice: number;
    hasDiscount: boolean;
    discountPercentage: number;
}

// ADD these interfaces that exist in server but not frontend

export interface AddOn {
    _id?: string;
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    isDiscounted: boolean;
    isRequired: boolean;
    maxQuantity: number;
    category: 'transportation' | 'accommodation' | 'activity' | 'meal' | 'equipment' | 'insurance' | 'guide' | 'other';
    customCategory?: string;
    image?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PromoCode {
    _id?: string;
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxDiscountAmount?: number;
    minPurchaseAmount?: number;
    startDate: string;
    endDate: string;
    maxUses?: number;
    currentUses: number;
    isActive: boolean;
    applicableTours: string[] | 'all';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

/** Minimal tour for relatedData.similarTours. */
export interface SimilarTourRelated {
    id: string;
    title: string;
    slug?: string;
    coverImage?: string;
    price?: number;
    averageRating?: number;
    reviewCount?: number;
    tourStatus?: string;
}
