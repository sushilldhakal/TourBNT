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
export interface Discount {
    type: 'percentage' | 'price';
    value: number;
    dateRange?: DateRange;
    discountEnabled?: boolean;
    discountDateRange?: { from: string; to: string };
    percentageOrPrice?: boolean;
    discountPercentage?: number;
    discountPrice?: number;
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
export interface Itinerary {
    day?: string;
    title: string;
    description: string;
    dateTime?: Date;
    date?: string | Date;
    time?: string;
    destination?: string;
    outline?: string;
}

// FAQ types – canonical in faq.ts
export type { FaqData } from './faq';

// Date Range types
export interface DateRange {
    from: string;
    to: string;
}

// Tour Dates and Departure types
// FINAL, CLEAN TourDates structure - lock this
// Tour dates as the server stores them (see server processTourDatesData).
import type { TourDates, Departure, Itinerary as TourItineraryDay } from '@/lib/types';
export type { TourDates, Departure };

export interface RecurrenceConfig {
    enabled: boolean;
    pattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    endDate?: string; // Date string
}


// Pax Range types
export interface PaxRange {
    min: number;
    max: number;
}

// Pricing Option types
export interface PricingOption {
    _id?: string;
    id?: string;
    name: string;
    price: number;
    category: 'adult' | 'child' | 'senior' | 'student' | 'custom';
    customCategory?: string;
    description?: string; // Booking/summary display
    maxTravelers?: number; // Booking flow
    // Required when pricing options are enabled - prevents half-configured options
    paxRange: PaxRange;
    discountEnabled?: boolean;
    isActive: boolean;
    discount?: Discount;
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

// Tour types
export interface Tour {
    id: string;
    title: string;
    code: string;
    description: string; // MAKE REQUIRED (remove ?)
    excerpt?: string;
    duration?: number; // Days (booking/summary display)
    
    // Author - ADD THIS
    author: string | User | string[];
    
    coverImage?: string; // MAKE OPTIONAL (server has it optional)
    
    // File - ADD THIS
    file?: string; // PDF or other files
    
    images?: string[]; // This can stay for compatibility
    
    createdAt: string;
    updatedAt: string;
    tourStatus: 'Draft' | 'Published' | 'Archived'; // ADD 'Draft' and 'Archived'

    // Category & Destination - CHANGE TO ARRAYS
    category: string[] | Category[]; // CHANGE from single to array
    destination?: string | Destination; // Keep as single (server has it as single optional)

    // Location - matches, but add missing fields
    location?: {
        id?: string;
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        lat?: number;
        lng?: number;
    };
    map?: string; // ADD THIS separate field

    // Pricing - ADD missing fields
    price: number;
    originalPrice?: number; // ADD THIS for "was $X, now $Y"
    
    pricePerPerson?: boolean; // MAKE OPTIONAL (server has it optional)
    groupSize?: number; // ADD THIS
    
    // Rename paxRange to minSize/maxSize
    minSize: number; // ADD THIS (replaces paxRange.min)
    maxSize: number; // ADD THIS (replaces paxRange.max)
    // REMOVE paxRange?: PaxRange;

    pricingOptionsEnabled?: boolean;
    pricingOptions?: PricingOption[];
    saleEnabled?: boolean;
    salePrice?: number;

    discountEnabled?: boolean; // MAKE OPTIONAL (add ?)
    discount?: Discount;

    priceLockDate?: string;

    // Content - UPDATE types
    include?: string[]; // CHANGE from string to string[]
    exclude?: string[]; // CHANGE from string to string[]
    outline?: string;

    // Gallery - UPDATE structure
    gallery?: Array<{
        id?: string;
        image: string;
        sortOrder?: number;
        isFeatured?: boolean;
    }>; // Simplified from GalleryItem

    // Facts - UPDATE structure
    facts?: Array<{
        id?: string;
        factId?: string; // ADD THIS
        title?: string;
        field_type?: "Plain Text" | "Single Select" | "Multi Select";
        value?: string[] | Array<{ label: string; value: string; }>;
        icon?: string;
    }>;

    // Itinerary - UPDATE structure
    itinerary?: TourItineraryDay[];

    // FAQs - UPDATE structure
    faqs?: Array<{
        id?: string;
        faqId?: string; // ADD THIS
        question: string;
        answer: string;
    }>;

    // Tour dates
    tourDates?: TourDates;

    // Reviews - UPDATE
    reviews?: Review[];
    averageRating?: number;
    reviewCount?: number;
    approvedReviewCount?: number; // ADD THIS

    // Other fields - ADD THESE
    views?: number;
    bookingCount?: number;
    isSpecialOffer?: boolean;
    enquiry?: boolean;
    
    // REMOVE these if not in server
    // maxGroupSize?: number; - use maxSize instead
    // minAge?: number; - not in server types
    // highlights?: string[]; - not in server types
    // included?: string[]; - use include instead
    // excluded?: string[]; - use exclude instead
    // seller?: string | User; - use author instead
    // featured?: boolean; - not in server types
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
