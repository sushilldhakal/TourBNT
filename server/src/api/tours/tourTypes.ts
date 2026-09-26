import { User } from "../user/userTypes";

// Define pricing option interface
export interface PricingOption {
  name: string;
  category: string; // "adult", "child", "senior", "student", "custom"
  customCategory?: string;
  price: number;
  discount: {
    discountEnabled: boolean;
    discountPrice?: number;
    discountDateRange?: {
      from: Date;
      to: Date;
    };
    percentageOrPrice?: boolean;
    discountPercentage?: number;
  };
  paxRange: {
    minPax: number;
    maxPax: number;
  };
}

// Define date range interface
export interface DateRange {
  label: string;
  startDate: Date;
  endDate: Date;
  selectedOptions: string[]; // Names of the pricing options that apply to this date range
}

// Define pricing group interface
export interface PricingGroup {
  label: string;
  options: PricingOption[];
  dateRanges: DateRange[];
}

// Define a notification for fixed departure tours
export interface FixedDepartureNotification {
  userId: string;
  notificationType: 'booking_confirmation' | 'cancellation' | 'reminder' | 'update';
  notifiedAt: Date;
  isRead: boolean;
}

// Define fixed departure interface
export interface FixedDeparture {
  _id?: string;
  tourId: string;
  startDate: Date;
  endDate: Date;
  pricingCategory: 'standard' | 'premium' | 'budget' | 'custom';
  customPricingCategory?: string;
  price: number;
  discountPrice?: number;
  isDiscounted: boolean;
  minPax: number;
  maxPax: number;
  currentPax: number;
  cutOffHoursBefore: number;
  isForceCanceled: boolean;
  forceCancelReason?: string;
  notifiedUsers: FixedDepartureNotification[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define AddOn interface
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
  createdAt: Date;
  updatedAt: Date;
}

// Define PromoCode interface
export interface PromoCode {
  _id?: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number;
  minPurchaseAmount?: number;
  startDate: Date;
  endDate: Date;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  applicableTours: string[] | 'all';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface paxRange {
  minSize: number;
  maxSize: number;
}

export interface Departure {
  id: string;
  label: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  selectedPricingOptions: Array<string | {
    id: string;
    name: string;
    category: string;
    price: number;
  }>;
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  recurrenceEndDate?: Date;
  capacity?: number;
  priceLockedUntil?: Date;
}

export interface UnifiedTourDates {
  days?: number;
  nights?: number;
  scheduleType: 'flexible' | 'fixed' | 'recurring';
  defaultDateRange?: {
    from: Date;
    to: Date;
  };
  departures: Departure[];
  priceLockedUntil?: Date;
}

export interface Tour {
  title: string;
  excerpt: string;
  description: string;
  author: string | User;
  code: string;
  // Old pricing (keeping for backward compatibility)
  price: number;
  originalPrice?: number;
  // New advanced pricing structure
  basePrice?: number;
  pricePerPerson?: boolean;
  groupSize?: number;
  saleEnabled?: boolean;
  salePrice?: number;
  // Price lock settings
  priceLockDate?: Date;
  // Discount specific fields
  discountEnabled?: boolean;
  discountPrice?: number;
  discountDateRange?: {
    from: Date;
    to: Date;
  };
  minSize: number;
  maxSize: number;
  pricingOptionsEnabled?: boolean;
  pricingGroups?: PricingGroup[];
  pricingOptions?: Array<{
    name: string;
    category: string;
    customCategory?: string;
    price: number;
    discountEnabled: boolean;
    discountPrice?: number;
    discountDateRange?: {
      from: Date;
      to: Date;
    };
    paxRange: {
      minPax: number;
      maxPax: number;
    };
  }>;
  authorName: User;
  coverImage: string;
  file: string;
  createdAt: Date;
  updatedAt: Date;
  tourStatus: string;
  outline: string;
  itinerary: {
    day?: string;
    title: string;
    description: string;
    date?: Date;
  }[];
  category: string[];
  dates: {
    id: string;
    tripDuration: string;
    startDate: Date;
    endDate: Date;
  },
  include: string[];
  exclude: string[];
  facts: {
    id: string;
    title?: string;
    field_type?: "Plain Text" | "Single Select" | "Multi Select";
    value?: string[] | { label: string; value: string; }[];
    icon?: string;
    factId?: string; // Reference to master fact _id for cascade updates
  }[],
  faqs: {
    id: string;
    question: string;
    answer: string;
  }[],
  reviews: Review[];
  gallery: {
    id: string;
    image: string;
  }[],
  map: string,
  location: {
    id: string;
    street: string;
    city: string;
    state: string;
    country: string;
    lat: number;
    lng: number;
  },
  enquiry: boolean;
  discount?: Discount;
  isSpecialOffer: boolean;
  destination?: string | null;
  views?: number;
  bookingCount?: number;
  averageRating?: number;
  reviewCount?: number;
  approvedReviewCount?: number;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  discountedPrice?: number;
  addOns?: AddOn[];
  promoCodes?: PromoCode[];
  fixedDepartures?: FixedDeparture[];
  // Legacy date fields (for backward compatibility)
  fixedDeparture?: boolean;
  multipleDates?: boolean;
  tourDates?: {
    days?: number;
    nights?: number;
    dateRange?: {
      from: Date;
      to: Date;
    };
    isRecurring?: boolean;
    recurrencePattern?: string;
    recurrenceEndDate?: Date;
  };
  fixedDate?: {
    dateRange?: {
      from: Date;
      to: Date;
    };
  };
  dateRanges?: Array<{
    id?: string;
    label: string;
    dateRange: {
      from: Date;
      to: Date;
    };
    selectedPricingOptions: Array<string | {
      id: string;
      name: string;
      category: string;
      price: number;
    }>;
    isRecurring: boolean;
    recurrencePattern?: string;
    recurrenceEndDate?: Date;
  }>;

  // New unified tour dates structure
  unifiedTourDates?: UnifiedTourDates;

  // Virtual Methods
  hasActiveDiscount?: () => boolean;
  getDiscountPercentage?: () => number;
  getDiscountAmount?: () => number;
  getDiscountedPrice?: () => number;
}

export interface ReviewReply {
  _id?: string;
  user: string;
  comment: string;
  createdAt: Date;
  likes: number;
  views: number;
}

export interface Review {
  _id?: string;
  user: string;
  tour: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  likes: number;
  views: number;
  replies: ReviewReply[];
  createdAt: Date;
}

export interface Discount {
  discountEnabled: boolean;
  discountPrice: number;
  discountDateRange: {
    from: Date;
    to: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FactValue {
  value?: string;
  label?: string;
  [key: string]: any; // Adjust this if you have specific keys or values
}

export interface Destination {
  name: string;
  description: string;
  coverImage: string;
  country: string;
  region?: string;
  city?: string;
  popularity: number;
  featuredTours?: string[];
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}