import { Departure, PricingOption, TourDates } from './types';

/**
 * Format price with currency symbol
 * @param price - The price to format
 * @param currency - Currency symbol (default: '$')
 * @returns Formatted price string (e.g., "$1,234.56")
 */
export function formatPrice(price: number, currency: string = '$'): string {
    if (typeof price !== 'number' || isNaN(price)) {
        return `${currency}0.00`;
    }

    return `${currency}${price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 * @param day - The day number
 * @returns Ordinal suffix ('st', 'nd', 'rd', or 'th')
 */
function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/**
 * Format date with ordinal suffixes
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "18th Aug 2025")
 */
export function formatDate(date: string | Date): string {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
        return '';
    }

    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const year = dateObj.getFullYear();

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
}

/**
 * Format time in 12-hour format with AM/PM
 * @param time - Time string (e.g., "14:30", "2:30 PM", or ISO date string)
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTime(time: string | Date): string {
    if (!time) return '';

    let dateObj: Date;

    // Handle different time formats
    if (typeof time === 'string') {
        // Check if it's a simple time format like "14:30"
        if (/^\d{1,2}:\d{2}$/.test(time)) {
            const [hours, minutes] = time.split(':').map(Number);
            dateObj = new Date();
            dateObj.setHours(hours, minutes, 0, 0);
        } else {
            // Try parsing as ISO date string
            dateObj = new Date(time);
        }
    } else {
        dateObj = time;
    }

    if (isNaN(dateObj.getTime())) {
        return '';
    }

    return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Detect if a URL points to a video file
 * @param url - The URL to check
 * @returns True if the URL is a video file
 */
export function isVideo(url: string): boolean {
    if (!url) return false;

    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    const lowerUrl = url.toLowerCase();

    // Check file extension
    const hasVideoExtension = videoExtensions.some(ext => lowerUrl.includes(ext));

    // Check for common video hosting patterns
    const isVideoHost = lowerUrl.includes('video') ||
        lowerUrl.includes('youtube') ||
        lowerUrl.includes('vimeo') ||
        lowerUrl.includes('cloudinary') && lowerUrl.includes('video');

    return hasVideoExtension || isVideoHost;
}

/**
 * Render fact value based on field type
 * @param fact - The fact data object
 * @returns Formatted fact value string
 */
export function renderFactValue(fact: {
    value: string | string[] | any;
    field_type: 'Plain Text' | 'Single Select' | 'Multi Select';
}): string {
    if (!fact || fact.value === null || fact.value === undefined) {
        return '';
    }

    switch (fact.field_type) {
        case 'Plain Text':
        case 'Single Select':
            return String(fact.value);

        case 'Multi Select':
            if (Array.isArray(fact.value)) {
                return fact.value.join(', ');
            }
            return String(fact.value);

        default:
            return String(fact.value);
    }
}

/**
 * Get icon name mapping for facts
 * This is a helper function that returns the normalized icon name
 * The actual icon rendering is done in the TourFacts component
 * @param iconName - The icon name from the fact data
 * @returns Normalized icon name
 */
export function getFactIconName(iconName?: string): string {
    if (!iconName) return 'info';

    // Normalize icon name (lowercase, remove spaces and special characters)
    return iconName.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Calculate departure price with discounts
 * @param departure - The departure object
 * @param basePrice - Base tour price
 * @param salePrice - Sale price (if sale is enabled)
 * @param saleEnabled - Whether sale pricing is active
 * @param pricingOptions - Available pricing options (can be flat array or from groups)
 * @param pricingGroups - Pricing groups (alternative structure)
 * @returns Calculated price object with original and display prices
 */
export function calculateDeparturePrice(
    departure: Departure,
    basePrice: number,
    salePrice?: number,
    saleEnabled?: boolean,
    pricingOptions?: PricingOption[],
    pricingGroups?: { label: string; options: PricingOption[] }[]
): {
    originalPrice: number;
    displayPrice: number;
    hasDiscount: boolean;
    discountPercentage: number;
} {
    let originalPrice = basePrice;
    let displayPrice = saleEnabled && salePrice ? salePrice : basePrice;

    // Check if departure has specific pricing options
    if (departure.selectedPricingOptions && departure.selectedPricingOptions.length > 0) {
        let selectedOption: PricingOption | undefined;

        // First, try to find in flat pricingOptions array
        if (pricingOptions && pricingOptions.length > 0) {
            selectedOption = pricingOptions.find(
                option => departure.selectedPricingOptions?.includes(option.id || option._id || '')
            );
        }

        // If not found and pricingGroups exist, search in groups
        if (!selectedOption && pricingGroups && pricingGroups.length > 0) {
            for (const group of pricingGroups) {
                if (group.options && group.options.length > 0) {
                    selectedOption = group.options.find(
                        option => departure.selectedPricingOptions?.includes(option.id || option._id || '')
                    );
                    if (selectedOption) break;
                }
            }
        }

        if (selectedOption) {
            originalPrice = selectedOption.price;
            displayPrice = selectedOption.price;

            // Apply pricing option discount if enabled and within date range
            if (selectedOption.discountEnabled && selectedOption.discount) {
                const now = new Date();
                const discountStart = selectedOption.discount.discountDateRange?.from
                    ? new Date(selectedOption.discount.discountDateRange.from)
                    : null;
                const discountEnd = selectedOption.discount.discountDateRange?.to
                    ? new Date(selectedOption.discount.discountDateRange.to)
                    : null;

                const isWithinDateRange = (!discountStart || now >= discountStart) &&
                    (!discountEnd || now <= discountEnd);

                if (isWithinDateRange) {
                    if (selectedOption.discount.percentageOrPrice) {
                        // Percentage discount
                        const discountAmount = (originalPrice * (selectedOption.discount.discountPercentage || 0)) / 100;
                        displayPrice = originalPrice - discountAmount;
                    } else {
                        // Fixed price discount - discountPrice IS the final price
                        displayPrice = selectedOption.discount.discountPrice || originalPrice;
                    }
                }
            }
        }
    }

    const hasDiscount = displayPrice < originalPrice;
    const discountPercentage = hasDiscount
        ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
        : 0;

    return {
        originalPrice,
        displayPrice,
        hasDiscount,
        discountPercentage,
    };
}

/**
 * Generate departure instances for recurring patterns
 * @param tourDates - Tour dates configuration
 * @returns Array of generated departure instances
 */
export function generateDepartureInstances(tourDates: TourDates): Departure[] {
    if (!tourDates) return [];

    const instances: Departure[] = [];

    // Handle multiple departures
    if (tourDates.scheduleType === 'multiple' && tourDates.departures) {
        tourDates.departures.forEach(departure => {
            if (departure.isRecurring && departure.recurrencePattern && departure.recurrenceEndDate) {
                // Generate recurring instances for this departure
                const recurringInstances = generateRecurringInstances(
                    departure,
                    tourDates.days || 1
                );
                instances.push(...recurringInstances);
            } else {
                // Add single departure
                instances.push(departure);
            }
        });
    }

    // Handle fixed schedule with recurrence
    else if (tourDates.scheduleType === 'fixed' && tourDates.isRecurring) {
        const baseDate = tourDates.singleDateRange || tourDates.defaultDateRange;
        if (baseDate && tourDates.recurrencePattern && tourDates.recurrenceEndDate) {
            const baseDeparture: Departure = {
                label: 'Fixed Schedule',
                dateRange: baseDate,
                isRecurring: true,
                recurrencePattern: tourDates.recurrencePattern,
                recurrenceEndDate: tourDates.recurrenceEndDate,
                selectedPricingOptions: tourDates.selectedPricingOptions,
            };

            const recurringInstances = generateRecurringInstances(
                baseDeparture,
                tourDates.days || 1
            );
            instances.push(...recurringInstances);
        }
    }

    // Handle flexible or fixed without recurrence
    else if (tourDates.scheduleType === 'flexible' || tourDates.scheduleType === 'fixed') {
        const dateRange = tourDates.singleDateRange || tourDates.defaultDateRange;
        if (dateRange) {
            instances.push({
                label: tourDates.scheduleType === 'flexible' ? 'Flexible Schedule' : 'Fixed Schedule',
                dateRange,
                selectedPricingOptions: tourDates.selectedPricingOptions,
            });
        }
    }

    return instances;
}

/**
 * Generate recurring departure instances based on pattern
 * @param departure - Base departure with recurrence settings
 * @param durationDays - Tour duration in days
 * @returns Array of generated departure instances
 */
function generateRecurringInstances(
    departure: Departure,
    durationDays: number
): Departure[] {
    const instances: Departure[] = [];
    const startDate = new Date(departure.dateRange.from);
    const endDate = new Date(departure.recurrenceEndDate || departure.dateRange.to);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return [departure];
    }

    let currentDate = new Date(startDate);
    let instanceCount = 0;
    const maxInstances = 100; // Safety limit

    while (currentDate <= endDate && instanceCount < maxInstances) {
        const instanceEndDate = new Date(currentDate);
        instanceEndDate.setDate(instanceEndDate.getDate() + durationDays - 1);

        instances.push({
            ...departure,
            dateRange: {
                from: currentDate.toISOString(),
                to: instanceEndDate.toISOString(),
            },
            isRecurring: false, // Mark as instance, not recurring
        });

        // Calculate next occurrence based on pattern
        switch (departure.recurrencePattern) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'biweekly':
                currentDate.setDate(currentDate.getDate() + 14);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'quarterly':
                currentDate.setMonth(currentDate.getMonth() + 3);
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            default:
                // Unknown pattern, break to avoid infinite loop
                return instances;
        }

        instanceCount++;
    }

    return instances;
}
