/*
 * Single source of truth for all application types.
 * Organized by domain with clear hierarchies and relationships.
 * 
 * Conventions:
 * - Base types first, derived types after
 * - API response types suffixed with 'Response'
 * - Form data types suffixed with 'FormData' or 'Input'
 * - Props types suffixed with 'Props'
 * - Enums for fixed sets of values
 * - Use Pick/Omit/Partial for type transformations
 * 
 * @module types
 */

// ============================================================================
// UTILITY TYPES (Foundation)
// ============================================================================

/** Standard timestamp fields added by database */
export interface Timestamps {
    createdAt: string;
    updatedAt: string;
  }
  
  /** MongoDB document base fields */
  export interface MongoDocument {
    _id: string;
    createdAt: string;
    updatedAt: string;
  }
  
  /** Standard API response wrapper */
  export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
  }
  
  /** Paginated API response */
  export interface PaginatedResponse<T = unknown> {
    success: boolean;
    items: T[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };
    message?: string;
  }
  
  /** Cursor-based pagination response */
  export interface CursorPaginatedResponse<T = unknown> {
    items: T[];
    nextCursor?: number | null;
    totalCount?: number;
  }
  
  /** Date range for filters and bookings */
  export interface DateRange {
    from: string;
    to: string;
  }
  
  /** Geographic coordinates */
  export interface Coordinates {
    latitude: number;
    longitude: number;
    lat?: number; // Alias
    lng?: number; // Alias
  }
  
  /** File upload progress tracking */
  export interface FileUploadProgress {
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
  }
  
  // ============================================================================
  // ENUMS (Fixed Value Sets)
  // ============================================================================
  
  /** User roles in the system */
  export enum UserRole {
    ADMIN = 'admin',
    SELLER = 'seller',
    ADVERTISER = 'advertiser',
    GUIDE = 'guide',
    VENUE = 'venue',
    USER = 'user',
    SUBSCRIBER = 'subscriber',
  }
  
  /** Tour status lifecycle */
  export enum TourStatus {
    DRAFT = 'Draft',
    PUBLISHED = 'Published',
    ARCHIVED = 'Archived',
  }
  
  /** Post/content status */
  export enum ContentStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
  }
  
  /** Approval status for user-submitted content */
  export enum ApprovalStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
  }
  
  /** Review/comment moderation status */
  export enum ModerationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
  }
  
  /** Booking status */
  export enum BookingStatus {
    UPCOMING = 'upcoming',
    PAST = 'past',
    CANCELLED = 'cancelled',
  }
  
  /** Media/resource types */
  export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
    PDF = 'pdf',
  }
  
  /** Media resource types */
  export enum ResourceType {
    IMAGE = 'image',
    VIDEO = 'video',
    RAW = 'raw',
  }
  
  /** Pricing category types */
  export enum PricingCategory {
    ADULT = 'adult',
    CHILD = 'child',
    SENIOR = 'senior',
    STUDENT = 'student',
    CUSTOM = 'custom',
  }
  
  /** Discount types */
  export enum DiscountType {
    PERCENTAGE = 'percentage',
    PRICE = 'price',
    FIXED = 'fixed',
  }
  
  /** Tour date types */
  export enum TourDateType {
    FLEXIBLE = 'flexible',
    FIXED = 'fixed',
    MULTIPLE = 'multiple',
  }
  
  /** Recurrence patterns */
  export enum RecurrencePattern {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    BIWEEKLY = 'biweekly',
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    YEARLY = 'yearly',
  }
  
  /** Fact field types */
  export enum FactFieldType {
    PLAIN_TEXT = 'Plain Text',
    SINGLE_SELECT = 'Single Select',
    MULTI_SELECT = 'Multi Select',
  }
  
  /** Add-on categories */
  export enum AddOnCategory {
    TRANSPORTATION = 'transportation',
    ACCOMMODATION = 'accommodation',
    ACTIVITY = 'activity',
    MEAL = 'meal',
    EQUIPMENT = 'equipment',
    INSURANCE = 'insurance',
    GUIDE = 'guide',
    OTHER = 'other',
  }
  
  // ============================================================================
  // USER & AUTHENTICATION
  // ============================================================================
  
  /** Core user entity - single source of truth */
  export interface User extends MongoDocument {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    profilePicture?: string; // Alias for avatar
    roles: UserRole[] | string[]; // Backend returns array, frontend may use string
    verified?: boolean;
    isSeller?: boolean;
    sellerStatus?: ApprovalStatus;
    sellerInfo?: Record<string, unknown>;
    
    // Banking details (for sellers)
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branchCode?: string;
  }
  
  /** User for display in lists (lightweight) */
  export interface UserListItem {
    id: string;
    _id?: string;
    name: string;
    email: string;
    phone?: string;
    roles: string;
    avatar?: string;
    createdAt?: string;
    created_at?: string;
  }
  
  /** User creation input (registration) */
  export interface UserCreateInput {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }
  
  /** User update input */
  export interface UserUpdateInput {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branchCode?: string;
  }
  
  /** Login credentials */
  export interface LoginCredentials {
    email: string;
    password: string;
    keepMeSignedIn?: boolean;
  }
  
  /** Password change input */
  export interface PasswordChangeInput {
    currentPassword: string;
    newPassword: string;
    confirmPassword?: string; // For form validation
  }
  
  /** Author reference in posts */
  export interface Author {
    _id: string;
    name: string;
    email?: string;
    profilePicture?: string;
    avatar?: string;
  }
  
  // ============================================================================
  // CATEGORIES & DESTINATIONS
  // ============================================================================
  
  /** Global category (managed by admin) */
  export interface GlobalCategory extends MongoDocument {
    name: string;
    description: string;
    imageUrl?: string;
    slug: string;
    
    // Approval workflow
    isApproved: boolean;
    approvalStatus: ApprovalStatus;
    createdBy: string;
    approvedBy?: string;
    rejectedBy?: string;
    rejectionReason?: string;
    reason?: string; // Submission reason
    approvedAt?: string;
    rejectedAt?: string;
    submittedAt: string;
    
    // Statistics
    popularity: number;
    usageCount: number;
    sellerCount: number;
    
    // Metadata
    metadata?: {
      keywords?: string[];
      parentCategory?: string;
      subcategories?: string[];
    };
  }
  
  /** User's relationship with a category */
  export interface UserCategory extends MongoDocument {
    user: string;
    category: GlobalCategory | string; // Populated or reference
    
    // User-specific settings
    isActive: boolean;
    isFavorite: boolean;
    customName?: string;
    sortOrder: number;
    addedAt: string;
    lastUsed?: string;
  }
  
  /** Category for public display */
  export interface Category {
    _id: string;
    id?: string;
    name: string;
    description?: string;
    image?: string;
    imageUrl?: string;
    status?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }
  
  /** Category creation input */
  export interface CategoryCreateInput {
    name: string;
    description: string;
    imageUrl?: string;
    parentCategory?: string;
    reason?: string;
  }
  
  /** Category update input */
  export interface CategoryUpdateInput {
    name?: string;
    description?: string;
    imageUrl?: string;
    metadata?: Record<string, unknown>;
  }
  
  /** Global destination (managed by admin) */
  export interface GlobalDestination extends MongoDocument {
    name: string;
    description: string;
    coverImage?: string;
    country: string;
    region?: string;
    city?: string;
    coordinates?: Coordinates;
    
    // Approval workflow
    isApproved: boolean;
    approvalStatus: ApprovalStatus;
    createdBy: string;
    approvedBy?: string;
    rejectedBy?: string;
    rejectionReason?: string;
    approvedAt?: string;
    rejectedAt?: string;
    submittedAt: string;
    
    // Statistics
    popularity: number;
    usageCount: number;
    sellerCount: number;
    
    // Metadata
    metadata?: {
      timezone?: string;
      currency?: string;
      language?: string[];
      climate?: string;
      bestTimeToVisit?: string[];
      attractions?: string[];
    };
  }
  
  /** User's relationship with a destination */
  export interface UserDestination extends MongoDocument {
    user: string;
    destination: GlobalDestination | string; // Populated or reference
    
    // User-specific settings
    isActive: boolean;
    isFavorite: boolean;
    customName?: string;
    sortOrder: number;
    addedAt: string;
    lastUsed?: string;
  }
  
  /** Destination for public display */
  export interface Destination {
    id: string;
    _id?: string;
    name: string;
    description: string;
    coverImage: string;
    country: string;
    region?: string;
    city?: string;
    status: string;
    isActive?: boolean;
    approvalStatus?: ApprovalStatus;
    featuredTours?: Tour[] | string[];
    popularity?: number;
    usageCount?: number;
    createdAt: string;
    updatedAt?: string;
    userId?: string;
    reason?: string;
    submittedAt?: string;
    createdBy?: string | { name?: string };
    rejectionReason?: string;
    rejectedAt?: string;
    rejectedBy?: string;
  }
  
  /** Destination creation input */
  export interface DestinationCreateInput {
    name: string;
    description: string;
    country: string;
    region?: string;
    city?: string;
    coverImage?: string;
    coordinates?: Coordinates;
    metadata?: Record<string, unknown>;
  }
  
  /** Destination update input */
  export interface DestinationUpdateInput {
    name?: string;
    description?: string;
    country?: string;
    region?: string;
    city?: string;
    coverImage?: string;
    coordinates?: Coordinates;
    metadata?: Record<string, unknown>;
  }
  
  // ============================================================================
  // MEDIA & GALLERY
  // ============================================================================
  
  /** Media item stored in R2 */
  export interface MediaItem {
    id: string;
    publicId: string;
    url: string;
    secureUrl: string;
    mediaType: MediaType;
    format: string;
    width?: number;
    height?: number;
    bytes: number;
    createdAt: string;
    resourceType: ResourceType;
    thumbnailUrl?: string;
    originalFilename?: string;
    title?: string;
    description?: string;
    tags?: string[];
  }
  
  /** Gallery item for tours */
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
  
  /** Tour gallery carousel item */
  export interface TourGalleryItem {
    image: string;
    alt: string;
    type: 'image' | 'video';
  }
  
  /** Media upload response */
  export interface MediaUploadResponse {
    success: boolean;
    urls: string[];
    resources: MediaItem[];
    message?: string;
  }
  
  /** Media query response */
  export interface MediaQueryResponse {
    success: boolean;
    data: MediaItem[];
    message: string;
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
    totalImages: number;
    totalVideos: number;
    totalPDFs: number;
    resources?: MediaItem[];
    nextCursor?: number | null;
    totalCount?: number;
  }
  
  /** Media deletion input */
  export interface MediaDeleteInput {
    userId?: string;
    mediaIds: string | string[];
    mediaType: string;
  }
  
  /** Media update input */
  export interface MediaUpdateInput {
    userId?: string;
    imageId: string;
    mediaType: string;
    title?: string;
    description?: string;
    tags?: string[];
  }
  
  // ============================================================================
  // PRICING & DISCOUNTS
  // ============================================================================
  
  /** Pax (passenger) range */
  export interface PaxRange {
    min: number;
    max: number;
  }
  
  /** Discount configuration */
  export interface Discount {
    type: DiscountType;
    value: number;
    dateRange?: DateRange;
    discountEnabled?: boolean;
    discountDateRange?: DateRange;
    percentageOrPrice?: boolean;
    discountPercentage?: number;
    discountPrice?: number;
  }
  
  /** Pricing option for tours */
  export interface PricingOption {
    _id?: string;
    id?: string;
    name: string;
    price: number;
    category: PricingCategory;
    customCategory?: string;
    description?: string;
    maxTravelers?: number;
    paxRange: PaxRange;
    discountEnabled?: boolean;
    isActive: boolean;
    discount?: Discount;
  }
  
  /** Tour pricing calculation result */
  export interface TourPricing {
    originalPrice: number;
    displayPrice: number;
    hasDiscount: boolean;
    discountPercentage: number;
  }
  
  /** Add-on for tours */
  export interface AddOn extends MongoDocument {
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    isDiscounted: boolean;
    isRequired: boolean;
    maxQuantity: number;
    category: AddOnCategory;
    customCategory?: string;
    image?: string;
    isActive: boolean;
  }
  
  /** Promo code */
  export interface PromoCode extends MongoDocument {
    code: string;
    description: string;
    discountType: DiscountType;
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
  }
  
  // ============================================================================
  // TOUR DATES & DEPARTURES
  // ============================================================================
  
  /** Recurrence configuration for tour dates */
  export interface RecurrenceConfig {
    enabled: boolean;
    pattern?: RecurrencePattern;
    endDate?: string;
  }
  
  /** Single departure for multiple-date tours */
  export interface Departure {
    id: string;
    label: string;
    dateRange: DateRange;
    selectedPricingOptions?: string[];
    recurrence?: RecurrenceConfig;
    capacity?: number;
  }
  
  /** Tour dates configuration */
  export interface TourDates {
    type: TourDateType;
    
    // For flexible tours
    days?: number;
    nights?: number;
    
    // For fixed tours
    dateRange?: DateRange;
    capacity?: number;
    
    // For multiple-date tours
    departures?: Departure[];
    
    // Recurrence settings
    recurrence?: RecurrenceConfig;
    
    selectedPricingOptions?: string[];
  }
  
  // ============================================================================
  // LOCATION
  // ============================================================================
  
  /** Location information for tours */
  export interface Location {
    id?: string;
    name?: string;
    map?: string;
    placeId?: string;
    position?: Coordinates;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
    formatted_address?: string;
    lat?: number;
    lng?: number;
  }
  
  // ============================================================================
  // FACTS & FAQS
  // ============================================================================
  
  /** Tour fact */
  export interface FactData {
    _id?: string;
    factId?: string;
    id?: string;
    name: string;
    label?: string;
    field_type: FactFieldType;
    icon?: string;
    value: string | string[] | Array<{ label: string; value: string; disable?: boolean }>;
    userId?: string;
  }
  
  /** FAQ item */
  export interface FaqData {
    _id?: string;
    id?: string;
    faqId?: string;
    question: string;
    answer: string;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
  }
  
  // ============================================================================
  // ITINERARY
  // ============================================================================
  
  /** Tour itinerary day */
  export interface Itinerary {
    _id?: string;
    day?: string;
    title: string;
    description: string;
    dateTime?: Date | string;
    date?: string | Date;
    time?: string;
    destination?: string;
    outline?: string;
  }
  
  // ============================================================================
  // REVIEWS & COMMENTS
  // ============================================================================
  
  /** Reply to a review or comment */
  export interface Reply {
    _id: string;
    comment: string;
    user: User;
    createdAt: string;
    likes: number;
    views: number;
    replies?: Reply[]; // Nested replies
  }
  
  /** Tour review */
  export interface Review {
    _id: string;
    rating: number;
    title: string;
    comment: string;
    user?: User;
    name?: string; // For non-authenticated users
    status: ModerationStatus;
    createdAt: string;
    likes: number;
    views: number;
    replies?: Reply[];
    tour: string;
    tourId?: string;
    tourTitle?: string;
  }
  
  /** Post comment */
  export interface PostComment {
    id?: string;
    _id?: string;
    post: string;
    user: {
      id?: string;
      _id?: string;
      name: string;
      email: string;
      avatar?: string;
    } | null;
    text: string;
    approve: boolean;
    likes?: number;
    views?: number;
    timestamp?: string;
    replies?: PostComment[];
    createdAt: string;
    isLiked?: boolean;
    depth?: number;
    canReply?: boolean;
  }
  
  /** Generic comment (legacy) */
  export interface Comment {
    id: string;
    _id: string;
    user: User;
    text: string;
    post: Post;
    createdAt: string;
    created_at: string;
    status: ModerationStatus;
    approve: boolean;
  }
  
  // ============================================================================
  // POSTS & BLOG
  // ============================================================================
  
  /** Blog post author (lightweight) */
  export interface PostListAuthor {
    name?: string;
    email?: string;
    roles?: string[];
  }
  
  /** Blog post list item (for tables/grids) */
  export interface PostListItem {
    id: string;
    title: string;
    image?: string;
    author?: PostListAuthor | PostListAuthor[];
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    views?: number;
    commentsCount?: number;
  }
  
  /** Full blog post */
  export interface Post {
    _id: string;
    title: string;
    content: string;
    author: Author;
    tags: string[];
    image: string;
    status: ContentStatus;
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
  
  /** Post creation/update input */
  export interface PostFormData {
    title: string;
    content: string;
    status: 'Draft' | 'Published' | 'Archived';
    image?: string;
    tags?: string[];
    enableComments?: boolean;
  }
  
  /** Posts list response */
  export interface PostsListResponse {
    items: PostListItem[];
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
    message?: string;
  }
  
  /** Post API response (legacy) */
  export interface PostResponse {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    posts: Post[];
  }
  
  // ============================================================================
  // TOURS
  // ============================================================================
  
  /** Complete tour entity */
  export interface Tour extends MongoDocument {
    id?: string; // Alias for _id
    title: string;
    code: string;
    description: string;
    excerpt?: string;
    duration?: number; // Days
    
    // Author/Owner
    author: string | User | string[];
    
    // Media
    coverImage?: string;
    file?: string; // PDF or other files
    images?: string[];
    gallery?: GalleryItem[];
    
    // Status
    tourStatus: TourStatus;
    
    // Classification
    category: string[] | Category[];
    destination?: string | Destination;
    
    // Location
    location?: {
      id?: string;
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      lat?: number;
      lng?: number;
    };
    map?: string;
    
    // Pricing
    price: number;
    originalPrice?: number;
    pricePerPerson?: boolean;
    groupSize?: number;
    minSize: number;
    maxSize: number;
    pricingOptionsEnabled?: boolean;
    pricingOptions?: PricingOption[];
    saleEnabled?: boolean;
    salePrice?: number;
    discountEnabled?: boolean;
    discount?: Discount;
    priceLockDate?: string;
    
    // Content
    include?: string[];
    exclude?: string[];
    outline?: string;
    
    // Tour details
    facts?: Array<{
      id?: string;
      factId?: string;
      title?: string;
      field_type?: FactFieldType;
      value?: string[] | Array<{ label: string; value: string }>;
      icon?: string;
    }>;
    
    itinerary?: Array<{
      _id?: string;
      day?: string;
      title: string;
      description: string;
      dateTime?: string;
      date?: string;
      destination?: string;
    }>;
    
    faqs?: Array<{
      id?: string;
      faqId?: string;
      question: string;
      answer: string;
    }>;
    
    // Dates
    tourDates?: TourDates;
    
    // Reviews
    reviews?: Review[];
    averageRating?: number;
    reviewCount?: number;
    approvedReviewCount?: number;
    
    // Stats
    views?: number;
    bookingCount?: number;
    isSpecialOffer?: boolean;
    enquiry?: boolean;
  }
  
  /** Tour list response (multiple formats) */
  export interface TourResponse {
    // Format 1: Cursor-based
    items?: Tour[];
    nextCursor?: number;
    
    // Format 2: Page-based
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems?: number;
      totalTours?: number;
      itemsPerPage?: number;
      hasNextPage?: boolean;
      hasPrevPage?: boolean;
    };
    
    // Format 3: Wrapped data
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
    
    // Format 4: Direct array
    tours?: Tour[];
    
    // Common fields
    message?: string;
    error?: string;
  }

  /** Category as { label, value } (lean, matches API and form) */
  export interface CategoryLabelValue {
    label: string;
    value: string;
    disable?: boolean;
  }

  /** Lean tour from single-tour API: author/destination IDs, category as [{ label, value }] */
  export interface TourLean extends Omit<Tour, 'author' | 'destination' | 'category'> {
    author: string[];
    destination?: string;
    category?: CategoryLabelValue[];
  }

  /** One author in relatedData.authors */
  export interface AuthorRelated {
    id: string;
    name?: string;
    email?: string;
    roles?: string[];
    avatar?: string;
    phone?: string;
  }

  /** Destination in relatedData.destination */
  export interface DestinationRelated {
    id: string;
    name: string;
    slug?: string;
    country?: string;
    region?: string;
    description?: string;
    thumbnail?: string;
    coordinates?: { lat?: number; lng?: number };
  }

  /** One category in relatedData.categories */
  export interface CategoryRelated {
    id: string;
    label: string;
    value: string;
    slug?: string;
    description?: string;
  }

  /** Minimal tour for relatedData.similarTours */
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

  /** Optional relatedData sections from GET /tours/:id?include=... */
  export interface RelatedData {
    authors?: AuthorRelated[];
    destination?: DestinationRelated;
    categories?: CategoryRelated[];
    similarTours?: SimilarTourRelated[];
    pricingInsights?: Record<string, unknown>;
    availability?: Record<string, unknown>;
  }

  export interface BreadcrumbItem {
    label: string;
    url: string;
  }

  export interface SingleTourMeta {
    requestId?: string;
    timestamp?: string;
    version?: string;
    cached?: boolean;
  }

  /** Single-tour API response data (GET /tours/:id) */
  export interface SingleTourData {
    tour: TourLean;
    relatedData?: RelatedData;
    breadcrumbs?: BreadcrumbItem[];
    meta?: SingleTourMeta;
  }

  /** Full API envelope for single tour */
  export interface SingleTourApiResponse {
    success: boolean;
    message?: string;
    data: SingleTourData;
  }
  
  // ============================================================================
  // BOOKINGS
  // ============================================================================
  
  /** Traveler information */
  export interface TravelerInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    passportNumber?: string;
  }
  
  /** Booking form data */
  export interface BookingFormData {
    fullName: string;
    email: string;
    phone: string;
    departureDate: string;
    adults: number;
    children: number;
    specialRequests: string;
  }
  
  /** Enquiry form data */
  export interface EnquiryFormData {
    fullName: string;
    email: string;
    message: string;
  }
  
  /** User's booking (dashboard view) */
  export interface MyBooking {
    id: string;
    referenceNumber: string;
    tour: {
      id: string;
      title: string;
      coverImage: string;
      destination: string;
    };
    date: Date;
    status: BookingStatus;
    travelers: number;
    totalPrice: number;
    createdAt: Date;
  }
  
  // ============================================================================
  // DASHBOARD & UI COMPONENTS
  // ============================================================================
  
  /** Navigation item */
  export interface NavigationItem {
    href?: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: NavigationItem[];
    adminOnly?: boolean;
  }
  
  /** Flat navigation item (no nesting) */
  export interface FlatNavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    groupLabel?: string;
  }
  
  /** Action item for dropdowns/menus */
  export interface ActionItem {
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    variant?: 'default' | 'destructive';
    href?: string;
  }
  
  /** Tour tab for editor */
  export interface TourTab {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
  }
  
  // ============================================================================
  // FORM DATA TYPES
  // ============================================================================
  
  /** Profile update form */
  export interface ProfileFormData {
    name: string;
    email: string;
    phone?: string;
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branchCode?: string;
  }
  
  /** User edit form (admin) */
  export interface UserFormData extends ProfileFormData {
    password?: string;
    roles?: string;
  }
  
  /** Category form */
  export interface CategoryFormData {
    name: string;
    imageUrl: string;
    description: string;
    reason: string;
  }
  
  /** Destination form */
  export interface DestinationFormData {
    name: string;
    coverImage: string;
    description: string;
    reason: string;
    isActive: boolean;
    country: string;
    region: string;
    city: string;
    popularity: number;
    featuredTours: string[];
  }
  
  /** Fact form */
  export interface FactFormData {
    name: string;
    field_type: string;
    value: string[];
    icon: string;
    userId: string | null;
  }
  
  // ============================================================================
  // PAGE PROPS (Next.js)
  // ============================================================================
  
  /** Tour detail page props */
  export interface TourDetailPageProps {
    params: Promise<{
      id: string;
    }>;
  }
  
  /** Booking confirmation page props */
  export interface BookingConfirmationPageProps {
    params: {
      id: string;
    };
  }
  
  // ============================================================================
  // COMPANY & FOOTER
  // ============================================================================
  
  /** Company information for footer */
  export interface CompanyInfo {
    companyName: string;
    description: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    resources: {
      title: string;
      link: string;
    }[];
    quickLinks: {
      title: string;
      link: string;
    }[];
    socialMedia: {
      platform: string;
      link: string;
      icon: string;
    }[];
  }
  
  // ============================================================================
  // PERMISSIONS
  // ============================================================================
  
  export type Permission = string;
  
  export interface RolePermissionMap {
    [role: string]: readonly string[];
  }
  
  // ============================================================================
  // TYPE GUARDS (Runtime type checking)
  // ============================================================================
  
  /** Check if value is a User object */
  export function isUser(value: unknown): value is User {
    return (
      typeof value === 'object' &&
      value !== null &&
      '_id' in value &&
      'email' in value &&
      'name' in value
    );
  }
  
  /** Check if value is a Tour object */
  export function isTour(value: unknown): value is Tour {
    return (
      typeof value === 'object' &&
      value !== null &&
      '_id' in value &&
      'title' in value &&
      'code' in value
    );
  }
  
  /** Check if value is a Category reference (string) or object */
  export function isCategoryPopulated(
    category: string | Category | string[] | Category[]
  ): category is Category {
    return typeof category === 'object' && !Array.isArray(category) && 'name' in category;
  }
  
  /** Check if destination is populated */
  export function isDestinationPopulated(
    destination: string | Destination | undefined
  ): destination is Destination {
    return typeof destination === 'object' && destination !== null && 'name' in destination;
  }
  
  // ============================================================================
  // UTILITY TYPE TRANSFORMATIONS
  // ============================================================================
  
  /** Extract creation input from entity type (omit system fields) */
  export type CreateInput<T> = Omit<T, '_id' | 'createdAt' | 'updatedAt'>;
  
  /** Extract update input from entity type (all fields optional except id) */
  export type UpdateInput<T> = Partial<Omit<T, '_id' | 'createdAt' | 'updatedAt'>>;
  
  /** Make specific fields required */
  export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
  
  /** Make specific fields optional */
  export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  
  // ============================================================================
  // RE-EXPORTS (For backward compatibility)
  // ============================================================================
  
  // Gallery types (keep existing exports)
  export type MediaTab = 'images' | 'videos' | 'pdfs';
  export type GalleryMode = 'standalone' | 'picker';
  export type ViewMode = 'grid' | 'list';
  
  // Legacy aliases
  export type { Category as CategoryData };
  export type { Destination as DestinationTypes };
  export type { UserListItem as DashboardUser };