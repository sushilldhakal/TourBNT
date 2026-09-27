/**
 * Clean Tour Data Utility
 * Single approach: transform form data to match scripts/tour-payload.example.json and backend API.
 */

import type { TourFormData, TourDates, Category } from '@/lib/schemas/tourEditor';

/** Form values include nested pricing/dates from TourPricingDates component */
type FormValuesWithNested = TourFormData & {
    pricing?: Record<string, unknown>;
    dates?: Record<string, unknown>;
};

/**
 * Flatten nested pricing and dates to top-level (payload shape from tour-payload.example.json).
 */
export function prepareTourDataForAPI(formData: FormValuesWithNested): TourFormData {
    const { pricing, dates, ...rest } = formData;
    const flat: TourFormData = { ...rest } as TourFormData;

    // Flatten pricing to top level (nested wins over flat)
    if (pricing && typeof pricing === 'object') {
        flat.price = (pricing.price !== undefined && pricing.price !== null) ? (pricing.price as number) : (flat.price ?? 0);
        flat.pricePerPerson = pricing.pricePerPerson !== undefined ? Boolean(pricing.pricePerPerson) : (flat.pricePerPerson ?? true);
        flat.minSize = (pricing.minSize !== undefined && pricing.minSize !== null) ? (pricing.minSize as number) : (flat.minSize ?? 1);
        flat.maxSize = (pricing.maxSize !== undefined && pricing.maxSize !== null) ? (pricing.maxSize as number) : (flat.maxSize ?? 10);
        flat.pricingOptionsEnabled = pricing.pricingOptionsEnabled !== undefined ? Boolean(pricing.pricingOptionsEnabled) : (flat.pricingOptionsEnabled ?? false);
        flat.pricingOptions = Array.isArray(pricing.pricingOptions) ? (pricing.pricingOptions as TourFormData['pricingOptions']) : (flat.pricingOptions ?? []);
        flat.priceLockDate = (pricing.priceLockDate as string | undefined) ?? flat.priceLockDate;
        if (pricing.paxPresetId !== undefined) (flat as Record<string, unknown>).paxPresetId = pricing.paxPresetId as string;
        if (pricing.discountPresetId !== undefined) (flat as Record<string, unknown>).discountPresetId = pricing.discountPresetId as string;
        if (pricing.pricingPresetIds !== undefined && Array.isArray(pricing.pricingPresetIds)) (flat as Record<string, unknown>).pricingPresetIds = pricing.pricingPresetIds as string[];
        const discount = pricing.discount as Record<string, unknown> | undefined;
        if (discount && typeof discount === 'object') {
            flat.discountEnabled = discount.discountEnabled !== undefined ? Boolean(discount.discountEnabled) : (flat.discountEnabled ?? false);
            flat.discount = discount as TourFormData['discount'];
        }
    }

    // Flatten dates -> tourDates (nested wins over flat)
    if (dates && typeof dates === 'object') {
        const rec = dates.recurrenceEndDate != null || dates.recurrencePattern != null
            ? {
                enabled: Boolean(dates.isRecurring),
                pattern: ((dates.recurrencePattern ?? 'daily') as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'),
                endDate: (dates.recurrenceEndDate as string | undefined) ?? undefined,
            }
            : undefined;
        flat.tourDates = {
            type: (dates.scheduleType ?? flat.tourDates?.type ?? 'flexible') as TourDates['type'],
            scheduleType: (dates.scheduleType ?? (flat.tourDates as Record<string, unknown>)?.scheduleType) as string | undefined,
            days: (dates.days ?? flat.tourDates?.days) as number | undefined,
            nights: (dates.nights ?? flat.tourDates?.nights) as number | undefined,
            dateRange: (dates.dateRange ?? flat.tourDates?.dateRange) as TourDates['dateRange'],
            defaultDateRange: (dates.dateRange ?? (flat.tourDates as Record<string, unknown>)?.defaultDateRange ?? flat.tourDates?.dateRange) as TourDates['dateRange'],
            departures: (dates.departures ?? flat.tourDates?.departures ?? []) as TourDates['departures'],
            selectedPricingOptions: (dates.pricingCategory ?? flat.tourDates?.selectedPricingOptions ?? []) as TourDates['selectedPricingOptions'],
            recurrence: rec ?? (flat.tourDates?.recurrence as TourDates['recurrence']),
        } as TourDates;
    }

    return flat;
}

/**
 * Format already-flat tour data for API: author (array), category (ID strings). Destination from TourBasicInfo.
 * Use after prepareTourDataForAPI. Payload shape matches tour-payload.example.json.
 */
export function applySubmissionFormatting(data: Record<string, unknown>): Record<string, unknown> {
    const result = { ...data };

    if (data.author !== undefined) {
        if (Array.isArray(data.author)) {
            result.author = data.author.filter(Boolean);
        } else if (typeof data.author === 'string' && data.author.trim()) {
            result.author = [data.author];
        }
    }

    if (data.destination && typeof data.destination === 'string' && data.destination.trim() !== '') {
        result.destination = data.destination;
    }

    // Payload format: category as array of ID strings (matches tour-payload.example.json)
    if (data.category && Array.isArray(data.category)) {
        result.category = data.category
            .map((cat: unknown) => (typeof cat === 'string' ? cat : (cat as { value?: string })?.value ?? ''))
            .filter(Boolean) as string[];
    }

    return result;
}

/**
 * Validate cleaned data before submission
 * Returns array of validation errors
 */
export function validateCleanedTourData(data: Record<string, unknown>): string[] {
    const errors: string[] = [];

    // Check required fields
    if (!data.title || (typeof data.title === 'string' && data.title.trim() === '')) {
        errors.push('Title is required');
    }

    if (!data.code || (typeof data.code === 'string' && data.code.trim() === '')) {
        errors.push('Tour code is required');
    }

    // Check author is array
    if (data.author && !Array.isArray(data.author)) {
        errors.push('Author must be an array of strings');
    }

    // Check category format (payload: array of ID strings)
    if (data.category) {
        if (!Array.isArray(data.category)) {
            errors.push('Category must be an array');
        } else {
            const invalid = data.category.filter((cat: unknown) => typeof cat !== 'string' || !cat);
            if (invalid.length > 0) {
                errors.push('Category must be an array of non-empty strings (category IDs)');
            }
        }
    }

    // Check tourDates for flexible type
    if (data.tourDates && typeof data.tourDates === 'object') {
        const tourDates = data.tourDates as Record<string, unknown>;
        if (tourDates.type === 'flexible') {
            if (typeof tourDates.days !== 'number' && typeof tourDates.nights !== 'number') {
                errors.push('Tour dates must have days or nights for flexible schedule');
            }
        }
    }

    // Check pricePerPerson is boolean
    if (data.pricePerPerson !== undefined && typeof data.pricePerPerson !== 'boolean') {
        errors.push('pricePerPerson must be a boolean');
    }

    return errors;
}
