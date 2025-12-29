// User types
export interface User {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
    role?: string;
}

// Review types
export interface Reply {
    _id: string;
    comment: string;
    user: User;
    createdAt: string;
    likes: number;
    views: number;
    replies?: Reply[]; // Support nested replies
}

export interface Review {
    _id: string;
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
    tourId?: string;
    tourTitle?: string;
}

export interface Author {
    _id: string;
    name: string;
    email?: string;
    profilePicture?: string;
}

// Blog/Post types
export interface Post {
    _id: string;
    title: string;
    content: string;
    author: Author;
    tags: string[];
    image: string;
    status: 'draft' | 'published' | 'archived';
    likes: number;
    comments: string[];
    enableComments: boolean;
    views: number;
    createdAt: string;
    updatedAt: string;
    liked?: boolean;
    __v: number;
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
    _id: string;
    name: string;
    description?: string;
    image?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CategoryData {
    _id: string;
    id: string | null;
    name: string;
    description: string;
    imageUrl: string;
    isActive: boolean;
    userId: string;
    isApproved: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    usageCount?: number;
    reason?: string; // Add this field
}

// Destination types
export interface Destination {
    _id: string;
    name: string;
    description?: string;
    image?: string;
    country?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DestinationTypes {
    approvalStatus: string;
    approvalStatus: string;
    approvalStatus: string;
    approvalStatus: string;
    approvalStatus: any;
    _id: string;
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
}

// Discount types
export interface Discount {
    type: 'percentage' | 'fixed';
    value: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
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

// Fact types
export interface FactData {
    name?: string;
    title: string;
    id?: string;
    field_type: 'Plain Text' | 'Single Select' | 'Multi Select';
    label?: string;
    icon?: string;
    value: string | string[] | any;
}

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

// FAQ types
export interface FaqData {
    _id?: string;
    id?: string;
    question: string;
    answer: string;
    userId?: string;
}

// Tour Dates and Departure types
export interface TourDates {
    days?: number;
    nights?: number;
    scheduleType: 'flexible' | 'fixed' | 'multiple' | 'recurring';
    defaultDateRange?: {
        from: string;
        to: string;
    };
    departures?: Departure[];
    // For flexible or fixed with recurrence
    isRecurring?: boolean;
    recurrencePattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    recurrenceInterval?: number;
    recurrenceEndDate?: string;
    selectedPricingOptions?: string[];
    // For fixed
    singleDateRange?: {
        from: string;
        to: string;
    };
}

export interface Departure {
    id?: string;
    label: string;
    dateRange: {
        from: string;
        to: string;
    };
    selectedPricingOptions?: string[];
    isRecurring?: boolean;
    recurrencePattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    recurrenceEndDate?: string;
    capacity?: number;
}

// Pricing Option types
export interface PricingOption {
    _id?: string;
    id?: string;
    name: string;
    price: number;
    category: 'adult' | 'child' | 'senior' | 'student' | 'custom';
    customCategory?: string;
    minPax: number;
    maxPax: number;
    discountEnabled?: boolean;
    discount?: {
        percentageOrPrice: boolean;
        discountPercentage?: number;
        discountPrice?: number;
        discountDateRange?: {
            from: string;
            to: string;
        };
    };
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

// Tour types
export interface Tour {
    _id: string;
    title: string;
    code: string;
    description?: string;
    excerpt?: string;
    price: number;
    originalPrice?: number;
    coverImage: string;
    images?: string[];
    category?: string | Category[];
    destination?: string | Destination;
    discount?: Discount;
    duration?: string;
    createdAt: string;
    updatedAt: string;
    tourStatus: string;

    // Location
    location?: string | Location;

    // Pricing
    saleEnabled?: boolean;
    salePrice?: number;
    pricePerPerson?: boolean;
    groupSize?: number;
    minSize: number;
    maxSize: number;
    priceLockDate?: string;
    pricingOptionsEnabled?: boolean;
    pricingGroups?: PricingGroup[];
    pricingOptions?: PricingOption[];

    // Content
    include?: string; // Rich text
    exclude?: string; // Rich text
    outline?: string;

    // Gallery
    gallery?: GalleryItem[];

    // Facts
    facts?: FactData[];

    // Itinerary
    itinerary?: Itinerary[];

    // FAQs
    faqs?: FaqData[];

    // Tour dates
    tourDates?: TourDates;
    dates?: {
        startDate: string;
        endDate: string;
        tripDuration?: string;
    };

    // Reviews
    reviews?: Review[];
    averageRating?: number;
    reviewCount?: number;

    // Other
    maxGroupSize?: number;
    minAge?: number;
    highlights?: string[];
    included?: string[];
    excluded?: string[];
    seller?: string | User;
    featured?: boolean;
    enquiry?: boolean;
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
