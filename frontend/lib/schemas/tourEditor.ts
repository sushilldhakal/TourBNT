import { z } from "zod";

/**
 * Tour Editor Form Schema
 * Comprehensive Zod validation schema for tour creation and editing
 * Migrated from Vite dashboard with Next.js adaptations
 */

// Helper schemas
const optionalString = z.string().optional();
const optionalDate = z.date().optional();
const optionalNumber = z.number().optional();

// ============================================================================
// ITINERARY SCHEMAS
// ============================================================================

export const itineraryItemSchema = z.object({
    day: optionalString,
    title: optionalString,
    description: optionalString,
    destination: optionalString,
    dateTime: optionalDate,
    accommodation: optionalString,
    meals: optionalString,
    activities: optionalString,
});

export const itinerarySchema = z.array(itineraryItemSchema);

// ============================================================================
// FACTS SCHEMA
// ============================================================================

export const factSchema = z.object({
    factId: optionalString, // Preserve for updates
    title: optionalString,
    field_type: z.enum(['Plain Text', 'Single Select', 'Multi Select']).optional(),
    value: z.union([
        z.array(z.string()),  // For Plain Text or Single Select
        z.array(z.object({
            label: z.string(),
            value: z.string(),
            disable: z.boolean().optional(),
        })),  // For Multi Select
    ]).optional(),
    icon: optionalString,
});

// ============================================================================
// FAQ SCHEMA
// ============================================================================

export const faqSchema = z.object({
    faqId: optionalString, // Preserve for updates
    question: optionalString,
    answer: optionalString,
});

// ============================================================================
// CATEGORY SCHEMA
// ============================================================================

export const categorySchema = z.object({
    label: z.string(),
    value: z.string(),
    disable: z.boolean().optional(),
});

// ============================================================================
// GALLERY SCHEMA
// ============================================================================

export const gallerySchema = z.object({
    _id: optionalString,
    image: optionalString,
    caption: optionalString,
    tempId: optionalString, // For client-side tracking
});

// ============================================================================
// LOCATION SCHEMA
// ============================================================================

export const locationSchema = z.object({
    map: optionalString,
    zip: optionalString,
    street: optionalString,
    city: optionalString,
    state: optionalString,
    country: optionalString,
    lat: z.union([z.string(), z.number()]).optional(),
    lng: z.union([z.string(), z.number()]).optional(),
});

// ============================================================================
// DATE RANGE SCHEMAS
// ============================================================================

export const dateRangeSchema = z.object({
    from: optionalDate,
    to: optionalDate,
});

export const dateRangeAltSchema = z.object({
    startDate: optionalDate,
    endDate: optionalDate,
});

export const flexibleDateRangeSchema = z.union([
    dateRangeSchema,
    dateRangeAltSchema
]);

// ============================================================================
// PAX RANGE SCHEMA
// ============================================================================

export const paxRangeSchema = z
    .tuple([
        z.number().min(1, "Minimum pax must be at least 1"),
        z.number().min(1, "Maximum pax must be at least 1")
    ])
    .refine((data) => data[0] <= data[1], {
        message: "Minimum pax must be less than or equal to maximum pax",
        path: ["paxRange"],
    });

export const paxSchema = z.object({
    minSize: z.number().min(1).default(1),
    maxSize: z.number().min(1).default(10),
});

// ============================================================================
// DISCOUNT SCHEMA
// ============================================================================

export const discountSchema = z.object({
    discountEnabled: z.boolean().default(false),
    isActive: z.boolean().optional(),
    percentageOrPrice: z.boolean().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    discountPrice: z.number().min(0).optional(),
    description: optionalString,
    discountCode: optionalString,
    maxDiscountAmount: z.number().min(0).optional(),
    dateRange: flexibleDateRangeSchema.optional(),
});

// ============================================================================
// PRICING OPTION SCHEMA
// ============================================================================

export const pricingOptionSchema = z.object({
    id: optionalString,
    name: z.string().min(1, "Name is required"),
    price: z.number().min(0, "Price must be a positive number"),
    category: z.enum(["adult", "child", "senior", "student", "custom"]),
    customCategory: optionalString,
    discount: discountSchema.optional(),
    paxRange: z.union([
        paxRangeSchema,
        z.object({
            minPax: z.number().min(1),
            maxPax: z.number().min(1),
        })
    ]).optional(),
    minPax: optionalNumber,
    maxPax: optionalNumber,
}).superRefine((data, ctx) => {
    if (data.discount?.discountEnabled) {
        if (!data.discount.percentageOrPrice && !data.discount.discountPrice) {
            ctx.addIssue({
                path: ["discount"],
                code: z.ZodIssueCode.custom,
                message: "Either percentage or discount price must be provided.",
            });
        }
    }
});

// ============================================================================
// PRICING SCHEMA
// ============================================================================

export const pricingSchema = z.object({
    price: z.number().min(0, 'Price must be at least 0').optional(),
    originalPrice: optionalNumber,
    basePrice: optionalNumber,
    pricePerPerson: z.boolean().default(true),
    paxRange: paxRangeSchema.optional(),
    minSize: z.number().min(1).default(1),
    maxSize: z.number().min(1).default(10),
    groupSize: z.number().min(1, "Group size must be at least 1").optional(),
    discount: discountSchema.optional(),
    priceLockedUntil: optionalDate,
    pricingOptionsEnabled: z.boolean().default(false),
    pricingOptions: z.array(pricingOptionSchema).optional(),
}).superRefine((data, ctx) => {
    if (data.pricingOptionsEnabled && (!data.pricingOptions || data.pricingOptions.length === 0)) {
        ctx.addIssue({
            path: ["pricingOptions"],
            code: z.ZodIssueCode.custom,
            message: "At least one pricing option is required when enabled.",
        });
    }

    if (data.pricingOptionsEnabled && Array.isArray(data.pricingOptions)) {
        data.pricingOptions.forEach((option, index) => {
            if (!option.name || option.name.trim() === "") {
                ctx.addIssue({
                    path: ["pricingOptions", index, "name"],
                    code: z.ZodIssueCode.custom,
                    message: "Name is required for all pricing options.",
                });
            }
            if (option.price === undefined || option.price < 0) {
                ctx.addIssue({
                    path: ["pricingOptions", index, "price"],
                    code: z.ZodIssueCode.custom,
                    message: "Valid price is required for all pricing options.",
                });
            }
        });
    }
});

// ============================================================================
// DEPARTURE SCHEMA
// ============================================================================

export const departureSchema = z.object({
    id: z.string(),
    label: z.string(),
    dateRange: flexibleDateRangeSchema,
    days: optionalNumber,
    nights: optionalNumber,
    isRecurring: z.boolean().default(false),
    recurrencePattern: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]).optional(),
    recurrenceInterval: optionalNumber,
    recurrenceEndDate: optionalDate,
    selectedPricingOptions: z.array(z.string()).optional(),
    pricingCategory: z.array(z.string()).optional(),
    priceLockedUntil: optionalDate,
    capacity: z.number().min(0, "Capacity must be a positive number").optional(),
});

// ============================================================================
// TOUR DATES SCHEMA
// ============================================================================

export const tourDatesSchema = z.object({
    days: z.number().min(0, "Days must be a positive number").optional(),
    nights: z.number().min(0, "Nights must be a positive number").optional(),
    fixedDeparture: z.boolean().default(false),
    multipleDates: z.boolean().default(false),
    singleDateRange: dateRangeSchema.optional(),
    dateRange: dateRangeSchema.optional(), // Alias for singleDateRange
    departures: z.array(departureSchema).optional(),
    scheduleType: z.enum(["flexible", "fixed", "multiple", "recurring"]).default("flexible"),
    pricingCategory: z.array(z.string()).optional(),
    isRecurring: z.boolean().default(false),
    recurrencePattern: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]).optional(),
    recurrenceInterval: optionalNumber,
    recurrenceEndDate: optionalDate,
}).refine(
    (data) => {
        if (data.scheduleType === "flexible") {
            return true; // Only days/nights needed
        }
        if (data.scheduleType === "fixed") {
            return !!data.dateRange || !!data.singleDateRange;
        }
        if (data.scheduleType === "multiple") {
            return !!data.departures && data.departures.length > 0;
        }
        return true;
    },
    {
        message: "Tour dates configuration is incomplete for the selected schedule type"
    }
);

// ============================================================================
// MAIN TOUR SCHEMA
// ============================================================================

export const baseTourSchema = z.object({
    // Basic Information
    title: z.string().min(2, 'Title must be at least 2 characters.'),
    code: z.string().min(6, 'Trip code must be at least 6 characters.'),
    category: z.array(categorySchema).optional(),
    excerpt: optionalString,
    tourStatus: z.enum(['Draft', 'Published', 'Archived']).default('Draft'),
    description: z.any(), // JSON content from editor
    coverImage: optionalString,
    file: z.any().optional(),
    enquiry: z.boolean().default(true),
    featured: z.boolean().default(false),

    // Tour Content
    itinerary: z.union([
        z.object({
            outline: optionalString,
            options: z.array(itinerarySchema).optional(),
        }),
        z.array(itineraryItemSchema), // Support direct array format
    ]).optional(),

    destination: optionalString,
    location: locationSchema.optional(),
    include: z.any().optional(), // JSON content from editor
    exclude: z.any().optional(), // JSON content from editor
    facts: z.array(factSchema).optional(),
    gallery: z.array(gallerySchema).optional(),
    faqs: z.array(faqSchema).optional(),

    // Pricing and Dates
    pricing: pricingSchema.optional(),
    dates: tourDatesSchema.optional(),

    // Legacy fields for backward compatibility
    price: optionalNumber,
    minSize: optionalNumber,
    maxSize: optionalNumber,
    discountEnabled: z.boolean().optional(),
    discountPrice: optionalNumber,
});

// ============================================================================
// FORM SCHEMAS
// ============================================================================

// Schema for creating new tours (with required fields)
export const tourFormSchema = baseTourSchema;

// Schema for editing tours (all fields optional)
export const tourEditSchema = z.object({
    title: optionalString,
    code: optionalString,
    description: z.any().optional(),
    excerpt: optionalString,
    tourStatus: z.enum(['Draft', 'Published', 'Archived']).optional(),
    coverImage: optionalString,
    file: z.any().optional(),
    category: z.any().optional(),
    outline: optionalString,
    itinerary: z.any().optional(),
    include: z.any().optional(),
    exclude: z.any().optional(),
    facts: z.array(factSchema).optional(),
    faqs: z.array(faqSchema).optional(),
    gallery: z.array(gallerySchema).optional(),
    location: z.any().optional(),
    enquiry: z.boolean().optional(),
    featured: z.boolean().optional(),
    destination: optionalString,
    pricing: z.any().optional(),
    dates: z.any().optional(),
    price: optionalNumber,
    minSize: optionalNumber,
    maxSize: optionalNumber,
    discountEnabled: z.boolean().optional(),
    discountPrice: optionalNumber,
}).passthrough(); // Allow any other fields

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Get the appropriate schema based on operation mode
 * @param isEditing - Whether the form is in edit mode
 * @returns The appropriate Zod schema
 */
export const getTourFormSchema = (isEditing: boolean) => {
    return isEditing ? tourEditSchema : tourFormSchema;
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TourFormData = z.infer<typeof tourFormSchema>;
export type TourEditData = z.infer<typeof tourEditSchema>;
export type ItineraryItem = z.infer<typeof itineraryItemSchema>;
export type Fact = z.infer<typeof factSchema>;
export type FAQ = z.infer<typeof faqSchema>;
export type Category = z.infer<typeof categorySchema>;
export type GalleryItem = z.infer<typeof gallerySchema>;
export type Location = z.infer<typeof locationSchema>;
export type PricingOption = z.infer<typeof pricingOptionSchema>;
export type Departure = z.infer<typeof departureSchema>;
export type TourDates = z.infer<typeof tourDatesSchema>;
export type Pricing = z.infer<typeof pricingSchema>;
export type Discount = z.infer<typeof discountSchema>;
