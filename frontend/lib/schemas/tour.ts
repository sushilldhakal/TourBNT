import { z } from 'zod';

/**
 * Tour Form Validation Schema
 * Zod schema for tour data validation
 */

export const tourSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
    code: z.string().min(1, 'Code is required').max(50, 'Code is too long'),
    excerpt: z.string().min(1, 'Excerpt is required').max(500, 'Excerpt is too long'),
    description: z.any().optional(),
    tourStatus: z.enum(['draft', 'published', 'archived']).default('draft'),
    coverImage: z.string().optional(),
    gallery: z.array(z.any()).optional(),
    category: z.array(z.any()).optional(),
    destination: z.any().optional(),

    pricing: z.object({
        price: z.number().min(0, 'Price must be positive'),
        pricePerPerson: z.boolean().default(true),
        minSize: z.number().min(1, 'Minimum size must be at least 1'),
        maxSize: z.number().min(1, 'Maximum size must be at least 1'),
        pricingOptionsEnabled: z.boolean().optional(),
        discount: z.object({
            discountEnabled: z.boolean().optional(),
            percentageOrPrice: z.boolean().optional(),
            discountPercentage: z.number().optional(),
            discountPrice: z.number().optional(),
            dateRange: z.any().optional(),
        }).optional(),
    }).optional(),

    pricingOptions: z.array(z.any()).optional(),

    dates: z.object({
        days: z.number().optional(),
        nights: z.number().optional(),
        scheduleType: z.enum(['flexible', 'fixed', 'multiple']).optional(),
        dateRange: z.any().optional(),
        departures: z.array(z.any()).optional(),
    }).optional(),

    itinerary: z.any().optional(),
    include: z.any().optional(),
    exclude: z.any().optional(),
    facts: z.array(z.any()).optional(),
    faqs: z.array(z.any()).optional(),
    map: z.string().optional(),
});

export type TourFormData = z.infer<typeof tourSchema>;
