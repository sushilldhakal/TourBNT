/**
 * Default Tour Values Helper
 * Provides default values and helper functions for tour form initialization
 * Migrated from Vite dashboard with Next.js adaptations
 */

import type {
    TourFormData,
    ItineraryItem,
    Fact,
    FAQ,
    GalleryItem,
    Location,
    PricingOption,
    Departure,
    TourDates,
    Pricing,
    Discount,
} from '@/lib/schemas/tourEditor';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for dynamic form fields
 * @returns A unique string identifier
 */
export const generateUniqueId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a random tour code
 * @param length - Length of the code (default: 6)
 * @returns A random alphanumeric code
 */
export const generateTourCode = (length: number = 6): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default discount configuration
 */
export const getDefaultDiscount = (discount?: Partial<Discount>): Discount => ({
    discountEnabled: discount?.discountEnabled ?? false,
    isActive: discount?.isActive ?? false,
    percentageOrPrice: discount?.percentageOrPrice ?? false,
    discountPercentage: discount?.discountPercentage ?? 0,
    discountPrice: discount?.discountPrice ?? 0,
    description: discount?.description ?? '',
    discountCode: discount?.discountCode ?? '',
    maxDiscountAmount: discount?.maxDiscountAmount ?? 0,
    dateRange: discount?.dateRange ?? {
        from: new Date(),
        to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
});

/**
 * Default pricing option configuration
 */
export const getDefaultPricingOption = (option?: Partial<PricingOption>): PricingOption => ({
    id: option?.id ?? generateUniqueId(),
    name: option?.name ?? '',
    category: option?.category ?? 'adult',
    customCategory: option?.customCategory ?? '',
    price: option?.price ?? 0,
    discount: option?.discount ?? getDefaultDiscount(),
    paxRange: option?.paxRange ?? [1, 10],
    minPax: option?.minPax ?? 1,
    maxPax: option?.maxPax ?? 10,
});

/**
 * Default pricing configuration
 */
export const getDefaultPricing = (pricing?: Partial<Pricing>): Pricing => ({
    price: pricing?.price ?? 0,
    originalPrice: pricing?.originalPrice ?? 0,
    basePrice: pricing?.basePrice ?? 0,
    pricePerPerson: pricing?.pricePerPerson ?? true,
    paxRange: pricing?.paxRange ?? [1, 10],
    minSize: pricing?.minSize ?? 1,
    maxSize: pricing?.maxSize ?? 10,
    groupSize: pricing?.groupSize ?? 1,
    discount: pricing?.discount ?? getDefaultDiscount(),
    priceLockedUntil: pricing?.priceLockedUntil,
    pricingOptionsEnabled: pricing?.pricingOptionsEnabled ?? false,
    pricingOptions: Array.isArray(pricing?.pricingOptions)
        ? pricing.pricingOptions.map(opt => getDefaultPricingOption(opt))
        : [],
});

/**
 * Default departure configuration
 */
export const getDefaultDeparture = (departure?: Partial<Departure>): Departure => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + 7); // 7 days from now

    return {
        id: departure?.id ?? generateUniqueId(),
        label: departure?.label ?? 'New Departure',
        dateRange: departure?.dateRange ?? {
            from: now,
            to: futureDate,
        },
        days: departure?.days ?? 0,
        nights: departure?.nights ?? 0,
        isRecurring: departure?.isRecurring ?? false,
        recurrencePattern: departure?.recurrencePattern,
        recurrenceInterval: departure?.recurrenceInterval,
        recurrenceEndDate: departure?.recurrenceEndDate,
        selectedPricingOptions: departure?.selectedPricingOptions ?? [],
        pricingCategory: departure?.pricingCategory ?? [],
        priceLockedUntil: departure?.priceLockedUntil,
        capacity: departure?.capacity,
    };
};

/**
 * Default tour dates configuration
 */
export const getDefaultTourDates = (dates?: Partial<TourDates>): TourDates => ({
    days: dates?.days ?? 0,
    nights: dates?.nights ?? 0,
    fixedDeparture: dates?.fixedDeparture ?? false,
    multipleDates: dates?.multipleDates ?? false,
    singleDateRange: dates?.singleDateRange,
    dateRange: dates?.dateRange,
    departures: Array.isArray(dates?.departures)
        ? dates.departures.map(dep => getDefaultDeparture(dep))
        : [],
    scheduleType: dates?.scheduleType ?? 'flexible',
    pricingCategory: dates?.pricingCategory ?? [],
    isRecurring: dates?.isRecurring ?? false,
    recurrencePattern: dates?.recurrencePattern,
    recurrenceInterval: dates?.recurrenceInterval,
    recurrenceEndDate: dates?.recurrenceEndDate,
});

/**
 * Default itinerary item configuration
 */
export const getDefaultItineraryItem = (item?: Partial<ItineraryItem>): ItineraryItem => ({
    day: item?.day ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    destination: item?.destination ?? '',
    dateTime: item?.dateTime ?? new Date(),
    accommodation: item?.accommodation ?? '',
    meals: item?.meals ?? '',
    activities: item?.activities ?? '',
});

/**
 * Default fact configuration
 */
export const getDefaultFact = (fact?: Partial<Fact>): Fact => ({
    factId: fact?.factId,
    title: fact?.title ?? '',
    field_type: fact?.field_type ?? 'Plain Text',
    value: fact?.value ?? [],
    icon: fact?.icon ?? 'info',
});

/**
 * Default FAQ configuration
 */
export const getDefaultFAQ = (faq?: Partial<FAQ>): FAQ => ({
    faqId: faq?.faqId,
    question: faq?.question ?? '',
    answer: faq?.answer ?? '',
});

/**
 * Default gallery item configuration
 */
export const getDefaultGalleryItem = (item?: Partial<GalleryItem>): GalleryItem => ({
    _id: item?._id,
    image: item?.image ?? '',
    caption: item?.caption ?? '',
    tempId: item?.tempId ?? generateUniqueId(),
});

/**
 * Default location configuration
 */
export const getDefaultLocation = (location?: Partial<Location>): Location => ({
    map: location?.map ?? '',
    zip: location?.zip ?? '',
    street: location?.street ?? '',
    city: location?.city ?? '',
    state: location?.state ?? '',
    country: location?.country ?? '',
    lat: location?.lat ?? 0,
    lng: location?.lng ?? 0,
});

/**
 * Default tour values for form initialization
 */
export const defaultTourValues: Partial<TourFormData> = {
    title: '',
    code: '',
    excerpt: '',
    description: null,
    tourStatus: 'Draft',
    coverImage: '',
    file: undefined,
    category: [],
    destination: '',
    enquiry: true,
    featured: false,
    include: null,
    exclude: null,
    itinerary: {
        outline: '',
        options: [],
    },
    facts: [],
    faqs: [],
    gallery: [],
    location: getDefaultLocation(),
    pricing: getDefaultPricing(),
    dates: getDefaultTourDates(),
    // Legacy fields
    price: 0,
    minSize: 1,
    maxSize: 10,
    discountEnabled: false,
    discountPrice: 0,
};

// ============================================================================
// MAIN HELPER FUNCTION
// ============================================================================

/**
 * Get tour values with proper defaults
 * Merges provided values with defaults, ensuring all required fields are present
 * 
 * @param values - Partial tour data to merge with defaults
 * @returns Complete tour data with all defaults applied
 */
export const getTourWithDefaults = (values: Partial<TourFormData> = {}): TourFormData => {
    // Deep merge the values with defaults
    const result: TourFormData = {
        ...defaultTourValues,
        ...values,

        // Deep merge location
        location: values.location
            ? getDefaultLocation(values.location)
            : getDefaultLocation(),

        // Deep merge pricing
        pricing: values.pricing
            ? getDefaultPricing(values.pricing)
            : getDefaultPricing(),

        // Deep merge dates
        dates: values.dates
            ? getDefaultTourDates(values.dates)
            : getDefaultTourDates(),

        // Process itinerary
        itinerary: values.itinerary
            ? (Array.isArray(values.itinerary)
                ? values.itinerary.map(item => getDefaultItineraryItem(item))
                : {
                    outline: values.itinerary.outline ?? '',
                    options: Array.isArray(values.itinerary.options)
                        ? values.itinerary.options.map(opt =>
                            Array.isArray(opt) ? opt.map(item => getDefaultItineraryItem(item)) : []
                        )
                        : [],
                })
            : { outline: '', options: [] },

        // Process facts
        facts: Array.isArray(values.facts)
            ? values.facts.map(fact => getDefaultFact(fact))
            : [],

        // Process FAQs
        faqs: Array.isArray(values.faqs)
            ? values.faqs.map(faq => getDefaultFAQ(faq))
            : [],

        // Process gallery
        gallery: Array.isArray(values.gallery)
            ? values.gallery.map(item => getDefaultGalleryItem(item))
            : [],

        // Ensure required fields have values
        title: values.title ?? '',
        code: values.code ?? '',
        tourStatus: values.tourStatus ?? 'Draft',
    } as TourFormData;

    return result;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate days and nights from a date range
 * @param from - Start date
 * @param to - End date
 * @returns Object with days and nights
 */
export const calculateDaysNights = (from: Date, to: Date): { days: number; nights: number } => {
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const nights = Math.max(0, days - 1);

    return { days, nights };
};

/**
 * Check if a tour has unsaved changes
 * @param original - Original tour data
 * @param current - Current form data
 * @returns True if there are unsaved changes
 */
export const hasUnsavedChanges = (
    original: Partial<TourFormData>,
    current: Partial<TourFormData>
): boolean => {
    return JSON.stringify(original) !== JSON.stringify(current);
};

/**
 * Validate tour code format
 * @param code - Tour code to validate
 * @returns True if valid
 */
export const isValidTourCode = (code: string): boolean => {
    return /^[A-Z0-9]{6,}$/.test(code);
};

/**
 * Format price for display
 * @param price - Price value
 * @param currency - Currency code (default: USD)
 * @returns Formatted price string
 */
export const formatPrice = (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(price);
};
