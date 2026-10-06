import type { Request } from 'express';
import { PricingOption, DateRange } from '../tourTypes';

/**
 * Data Processing Utilities
 * Centralized functions for processing complex form data.
 *
 * Everything here reads request input (multipart form fields, JSON strings or objects), so values come in
 * as `unknown` and are narrowed field by field.
 */

/** A parsed JSON object from the request; its fields are still unchecked. */
type Raw = Record<string, unknown>;

/** The object behind `value`, or an empty one when it isn't a plain object. */
const asRecord = (value: unknown): Raw =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** `value` as a string array (non-strings are converted), or [] when it isn't an array. */
const asStringArray = (value: unknown): string[] => asArray(value).map((v) => String(v));

/** A Date for a value the form sent as a date string/number, or undefined when there is none. */
const toDate = (value: unknown): Date | undefined =>
  typeof value === 'string' || typeof value === 'number' || value instanceof Date ? new Date(value) : undefined;

/**
 * Parse JSON field safely
 */
export function parseJsonField(field: unknown): unknown;
export function parseJsonField<T>(field: unknown, defaultValue: T): unknown;
export function parseJsonField(field: unknown, defaultValue: unknown = undefined): unknown {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (error) {
      console.error('Error parsing JSON field:', error);
      return defaultValue;
    }
  }
  return field || defaultValue;
}

/**
 * Convert various boolean representations to actual boolean
 */
export const convertToBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') return value === 1;
  return Boolean(value);
};

/**
 * Safely convert to number with fallback
 */
export const safeToNumber = (value: unknown, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/** A category reference as the form sends it: an id string, or an object carrying the id. */
const categoryId = (cat: unknown): string => {
  if (typeof cat === 'string') return cat;
  const c = asRecord(cat);
  return String(c.categoryId || c.id || c.value);
};

/**
 * Process category data from form submission
 * Returns array of category ID strings for the category field
 */
export const processCategoryData = (category: unknown): Array<string> => {
  try {
    // Handle category data as JSON string
    if (typeof category === 'string') {
      try {
        const parsedCategories: unknown = JSON.parse(category);
        if (Array.isArray(parsedCategories)) {
          return parsedCategories.map(categoryId);
        }
      } catch (parseError) {
        console.error('Error parsing category JSON string:', parseError);
      }
    }

    // Handle special case with mixed object structure
    const asObject = asRecord(category);
    if (typeof asObject[''] === 'string') {
      return asArray(JSON.parse(asObject[''])).map(categoryId);
    }

    // Handle array of categories
    if (Array.isArray(category)) {
      return category.map(categoryId);
    }

    // Handle single category object
    if (category && typeof category === 'object') {
      return [categoryId(category)];
    }

    return [];
  } catch (error) {
    console.error("Error processing category:", error);
    return [];
  }
};

/**
 * Process pricing options data
 */
export const processPricingOptions = (pricingOptionsData: unknown): PricingOption[] => {
  try {
    const parsed = parseJsonField(pricingOptionsData, []);

    if (!Array.isArray(parsed)) {
      console.warn('Pricing options is not an array:', parsed);
      return [];
    }

    return parsed.map((raw: unknown, index: number) => {
      const option = asRecord(raw);
      // Handle both nested discount structure and flat structure for backward compatibility
      const discount = asRecord(option.discount);
      const discountEnabled = convertToBoolean(discount.discountEnabled || option.discountEnabled);
      const discountPrice = safeToNumber(discount.discountPrice || option.discountPrice);
      const discountDateRange = discount.discountDateRange || option.discountDateRange;
      const percentageOrPrice = convertToBoolean(discount.percentageOrPrice || option.percentageOrPrice);
      const discountPercentage = safeToNumber(discount.discountPercentage || option.discountPercentage);
      const range = asRecord(discountDateRange);
      const paxRange = asRecord(option.paxRange);

      // Generate stable ID if not provided, or preserve existing ID
      // Include index to ensure uniqueness even when processed at the same time
      const stableId = option.id ? String(option.id) : `pricing_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        id: stableId, // Add stable ID field
        name: String(option.name || option.optionName || ''),
        category: String(option.category || 'adult'),
        customCategory: option.customCategory === undefined ? undefined : String(option.customCategory),
        price: safeToNumber(option.price || option.optionPrice),
        // Create nested discount object to match schema
        discount: {
          discountEnabled,
          discountPrice,
          discountDateRange: discountDateRange ? {
            from: new Date(String(range.from || range.startDate)),
            to: new Date(String(range.to || range.endDate))
          } : undefined,
          percentageOrPrice,
          discountPercentage
        },
        paxRange: {
          minPax: safeToNumber(paxRange.minPax || paxRange.from || option.minPax, 1),
          maxPax: safeToNumber(paxRange.maxPax || paxRange.to || option.maxPax, 10)
        }
      };
    });
  } catch (error) {
    console.error("Error processing pricing options:", error);
    return [];
  }
};

/**
 * Process payment options data — which policies (full payment / deposit /
 * pay on arrival) a traveler can choose from when booking this tour.
 * Always normalizes to a complete, valid object: if nothing ends up enabled
 * (bad input, or the seller unchecked everything), falls back to
 * full-payment-only so a tour is never left unbookable.
 */
export const processPaymentOptions = (paymentOptions: unknown) => {
  try {
    const parsed = parseJsonField(paymentOptions);
    if (!parsed || typeof parsed !== 'object') {
      return { fullPaymentEnabled: true, depositEnabled: false, depositPercentage: 20, payOnArrivalEnabled: false };
    }
    const options = asRecord(parsed);

    const fullPaymentEnabled = convertToBoolean(options.fullPaymentEnabled);
    const depositEnabled = convertToBoolean(options.depositEnabled);
    const payOnArrivalEnabled = convertToBoolean(options.payOnArrivalEnabled);
    const depositPercentage = Math.min(99, Math.max(1, safeToNumber(options.depositPercentage, 20)));

    const anyEnabled = fullPaymentEnabled || depositEnabled || payOnArrivalEnabled;

    return {
      fullPaymentEnabled: anyEnabled ? fullPaymentEnabled : true,
      depositEnabled,
      depositPercentage,
      payOnArrivalEnabled,
    };
  } catch (error) {
    console.error("Error processing payment options:", error);
    return { fullPaymentEnabled: true, depositEnabled: false, depositPercentage: 20, payOnArrivalEnabled: false };
  }
};

/**
 * Process date ranges data
 */
export const processDateRanges = (dateRangesData: unknown): DateRange[] => {
  try {
    const parsed = parseJsonField(dateRangesData, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((raw: unknown) => {
      const range = asRecord(raw);
      const nested = asRecord(range.dateRange);
      return {
        label: String(range.label || 'Date Range'),
        startDate: new Date(String(range.startDate || nested.from)),
        endDate: new Date(String(range.endDate || nested.to)),
        selectedOptions: asStringArray(range.selectedOptions)
      };
    });
  } catch (error) {
    console.error("Error processing date ranges:", error);
    return [];
  }
};

const ITINERARY_PARTNER_ROLES = new Set(['transport', 'accommodation', 'guide', 'meals', 'other']);

export interface ItineraryPartnerInput {
  role: string;
  businessPartnerId?: string;
  name: string;
  notes?: string;
  time?: string;
  endTime?: string;
  unitsRequested?: number;
  unitType?: string;
  unitTypeId?: string;
  /** Seller left this role open so any free business of the matching type can apply. */
  openForAll?: boolean;
}

const OPEN_SLOT_NAME: Record<string, string> = {
  transport: 'Open for any transport provider',
  accommodation: 'Open for any hotel or guesthouse',
  guide: 'Open for any guide',
  meals: 'Open for any restaurant',
  other: 'Open for any partner',
};

/**
 * Process a single itinerary day's `partners[]` — each entry links a
 * transport/accommodation/guide/meals provider to the day, either as a
 * registered business (`businessPartnerId` set) or a plain free-typed name.
 */
const processItineraryPartners = (partners: unknown): ItineraryPartnerInput[] => {
  return asArray(partners)
    .map(asRecord)
    .filter((p) => typeof p.role === 'string' && ITINERARY_PARTNER_ROLES.has(p.role) && (p.name || p.openForAll === true || p.openForAll === 'true'))
    .map((p) => {
      // A named business wins: open-for-all is the path where nobody is assigned yet.
      const openForAll = (p.openForAll === true || p.openForAll === 'true') && !p.businessPartnerId;
      const role = String(p.role);
      return {
        role,
        ...(openForAll || !p.businessPartnerId ? {} : { businessPartnerId: String(p.businessPartnerId) }),
        name: openForAll ? (OPEN_SLOT_NAME[role] || 'Open for any partner') : String(p.name),
        ...(openForAll ? { openForAll: true } : {}),
        ...(p.notes ? { notes: String(p.notes) } : {}),
        // Keep the request details too — syncTourItineraryPartners reads these, and
        // stripping them here silently reset every room/seat count and time slot on save.
        ...(p.time ? { time: String(p.time) } : {}),
        ...(p.endTime ? { endTime: String(p.endTime) } : {}),
        ...(p.unitsRequested !== undefined && p.unitsRequested !== null && p.unitsRequested !== '' && !Number.isNaN(Number(p.unitsRequested)) ? { unitsRequested: Number(p.unitsRequested) } : {}),
        ...(p.unitType ? { unitType: String(p.unitType) } : {}),
        ...(openForAll || !p.unitTypeId ? {} : { unitTypeId: String(p.unitTypeId) }),
      };
    });
};

export interface ItineraryDayInput {
  destinationId?: string;
  id: string;
  day: string;
  title: string;
  description: string;
  destination: string;
  date?: Date;
  partners: ItineraryPartnerInput[];
}

/**
 * Process itinerary data. Preserves every field the tour-builder form
 * collects (previously this silently dropped `destination`/`accommodation`/
 * `meals`/`activities` down to just `{day,title,description,date}`) and
 * carries a stable per-day `id` so itinerary-partner links
 * (`tourItineraryPartners`) survive day drag-and-drop reordering.
 */
export const processItineraryData = (itinerary: unknown): ItineraryDayInput[] => {
  try {
    const parsed = parseJsonField(itinerary, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((raw: unknown) => {
      const item = asRecord(raw);
      let partners = processItineraryPartners(item.partners);

      // Back-compat: older payloads (or the picker falling back to plain
      // text) may still carry legacy `accommodation`/`meals`/`activities`
      // free-text strings instead of a `partners[]` array — fold them in as
      // unregistered (no businessPartnerId) entries rather than losing them.
      if (partners.length === 0) {
        const legacy: ItineraryPartnerInput[] = [];
        if (item.accommodation) legacy.push({ role: 'accommodation', name: String(item.accommodation) });
        if (item.meals) legacy.push({ role: 'meals', name: String(item.meals) });
        if (item.activities) legacy.push({ role: 'other', name: String(item.activities) });
        partners = legacy;
      }

      return {
        id: item.id ? String(item.id) : `day_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        day: String(item.day || ''),
        title: String(item.title || ''),
        description: String(item.description || ''),
        destination: String(item.destination || ''),
        // The global destination this day is in (drives which suppliers can be picked for it).
        ...(typeof item.destinationId === 'string' && item.destinationId ? { destinationId: item.destinationId } : {}),
        date: item.date ? toDate(item.date) : undefined,
        partners,
      };
    });
  } catch (error) {
    console.error("Error processing itinerary data:", error);
    return [];
  }
};

/**
 * Process facts data with special handling for different field types
 */
export const processFactsData = (facts: unknown) => {
  try {
    const parsed = parseJsonField(facts, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((raw: unknown) => {
      const fact = asRecord(raw);
      let factValue: unknown = fact.value;

      // Handle stringified arrays and objects
      if (typeof factValue === 'string' && (factValue.startsWith('[') || factValue.startsWith('{'))) {
        try {
          factValue = JSON.parse(factValue);
        } catch {
          console.warn('Could not parse fact value:', factValue);
        }
      }

      // Ensure proper structure based on field type
      if (fact.field_type === 'Multi Select' && !Array.isArray(factValue)) {
        factValue = factValue ? [factValue] : [];
      } else if (fact.field_type === 'Plain Text' && Array.isArray(factValue)) {
        factValue = factValue.length > 0 ? factValue[0] : '';
      }

      // Set defaults for empty values
      if (!factValue || (Array.isArray(factValue) && factValue.length === 0)) {
        factValue = fact.field_type === 'Plain Text' ? '' : [];
      }

      return {
        factId: fact.factId || fact._id,  // Preserve factId for cascade updates!
        title: String(fact.title || ''),
        field_type: String(fact.field_type || 'Plain Text'),
        value: factValue,
        icon: String(fact.icon || '')
      };
    });
  } catch (error) {
    console.error("Error processing facts data:", error);
    return [];
  }
};

/**
 * Process FAQs data
 */
export const processFaqsData = (faqs: unknown) => {
  try {
    const parsed = parseJsonField(faqs, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((raw: unknown) => {
      const faq = asRecord(raw);
      return {
        faqId: faq.faqId || faq._id,  // Preserve faqId for cascade updates!
        question: String(faq.question || ''),
        answer: String(faq.answer || '')
      };
    });
  } catch (error) {
    console.error("Error processing FAQs data:", error);
    return [];
  }
};

/**
 * Process gallery data. Keeps each image's caption (dropping it here used to wipe every caption on save).
 */
export const processGalleryData = (gallery: unknown) => {
  try {
    const parsed = parseJsonField(gallery, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((raw: unknown) => {
      const item = asRecord(raw);
      return {
        image: String(item.image || item.url || ''),
        ...(item.caption ? { caption: String(item.caption) } : {}),
      };
    });
  } catch (error) {
    console.error("Error processing gallery data:", error);
    return [];
  }
};

/**
 * Process location data
 */
export const processLocationData = (location: unknown) => {
  try {
    const parsed = parseJsonField(location);

    if (!parsed) return undefined;
    const fields = asRecord(parsed);

    // Validate required fields
    const requiredFields = ['street', 'city', 'state', 'country', 'lat', 'lng'];
    const missingFields = requiredFields.filter(field => !fields[field]);

    if (missingFields.length > 0) {
      console.warn(`Missing required location fields: ${missingFields.join(', ')}`);
    }

    return {
      street: String(fields.street || ''),
      city: String(fields.city || ''),
      state: String(fields.state || ''),
      country: String(fields.country || ''),
      lat: safeToNumber(fields.lat),
      lng: safeToNumber(fields.lng),
      map: String(fields.map || ''),
      zip: String(fields.zip || '')
    };
  } catch (error) {
    console.error("Error processing location data:", error);
    return undefined;
  }
};

/** A date range from the form, as Dates; undefined when the form sent none. */
const toDateRange = (value: unknown): { from: Date; to: Date } | undefined => {
  if (!value) return undefined;
  const range = asRecord(value);
  return { from: new Date(String(range.from)), to: new Date(String(range.to)) };
};

/**
 * Process tour dates data with comprehensive handling for all date types
 */
export const processTourDatesData = (tourDates: unknown) => {
  try {
    const parsed = parseJsonField(tourDates);

    if (!parsed) return undefined;
    const dates = asRecord(parsed);

    // Process departures array for multiple departure type
    const processedDepartures = asArray(dates.departures).map((raw: unknown) => {
      const departure = asRecord(raw);
      return {
        id: departure.id ? String(departure.id) : `departure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: String(departure.label || 'Departure'),
        dateRange: toDateRange(departure.dateRange),
        // How many travelers this departure can seat — read by
        // ItineraryRequestService to ask linked hotels/restaurants/guides/
        // transport for that much capacity on this departure's dates.
        // Left undefined (not defaulted to 0) when unset, so callers can
        // fall back to the tour's overall maxSize instead.
        capacity: departure.capacity !== undefined && departure.capacity !== null ? safeToNumber(departure.capacity) : undefined,
        isRecurring: convertToBoolean(departure.isRecurring),
        recurrencePattern: departure.recurrencePattern ? String(departure.recurrencePattern) : (departure.isRecurring ? 'weekly' : undefined),
        recurrenceInterval: safeToNumber(departure.recurrenceInterval, 1),
        recurrenceEndDate: departure.recurrenceEndDate ? toDate(departure.recurrenceEndDate) : undefined,
        selectedPricingOptions: Array.isArray(departure.selectedPricingOptions)
          ? asStringArray(departure.selectedPricingOptions)
          : asStringArray(departure.pricingCategory),
        pricingCategory: asStringArray(departure.pricingCategory)
      };
    });

    // Pricing category - for multiple departures, collect all selectedPricingOptions from all departures;
    // for flexible and fixed dates, use the main pricingCategory.
    const pricingCategory: string[] = dates.scheduleType === 'multiple' && processedDepartures.length > 0
      ? Array.from(new Set(processedDepartures.flatMap((departure) => departure.selectedPricingOptions)))
      : Array.isArray(dates.pricingCategory)
        ? asStringArray(dates.pricingCategory)
        : (dates.pricingCategory ? [String(dates.pricingCategory)] : []);

    return {
      scheduleType: String(dates.scheduleType || 'flexible'),
      days: safeToNumber(dates.days),
      nights: safeToNumber(dates.nights),

      // Fixed date fields - use defaultDateRange to match schema
      defaultDateRange: toDateRange(dates.dateRange),

      // Multiple departures fields
      departures: processedDepartures,

      // Recurring fields
      isRecurring: convertToBoolean(dates.isRecurring),
      recurrencePattern: String(dates.recurrencePattern || 'weekly'),
      recurrenceInterval: safeToNumber(dates.recurrenceInterval, 1),
      recurrenceEndDate: dates.recurrenceEndDate ? toDate(dates.recurrenceEndDate) : undefined,

      pricingCategory,
    };
  } catch (error) {
    console.error("Error processing tour dates data:", error);
    return undefined;
  }
};

/** Tour fields from a create/update request, ready for TourService (unknown extras pass through untouched). */
export type TourFieldInput = Record<string, unknown>;

/** The discount date range, as Dates, if the form sent a valid one. */
const toDiscountDateRange = (value: unknown): { from: Date; to: Date } | undefined => {
  if (!value) return undefined;
  try {
    // Handle both string and object formats
    const parsedRange = asRecord(typeof value === 'string' ? JSON.parse(value) : value);

    const fromDate = new Date(String(parsedRange.from));
    const toDateValue = new Date(String(parsedRange.to));

    // Ensure dates are valid and to >= from
    if (isNaN(fromDate.getTime()) || isNaN(toDateValue.getTime())) {
      console.error('Invalid dates in discount range');
      return undefined;
    }

    if (toDateValue < fromDate) {
      console.error('End date must be after start date');
      return undefined;
    }

    return { from: fromDate, to: toDateValue };
  } catch (error) {
    console.error('Error parsing discount date range:', error);
    return undefined;
  }
};

/**
 * Extract and process all tour fields from request body.
 *
 * `partial` (updates): only fields the request actually sent are returned, so an update that sends a few
 * fields leaves the rest of the tour alone. Without it (creates), missing fields get their defaults.
 */
export const extractTourFields = (req: Request, { partial = false }: { partial?: boolean } = {}): TourFieldInput => {
  const body = asRecord(req.body);
  /** Include a derived field: always on create, on update only when one of its inputs was sent. */
  const when = <T,>(sent: boolean, value: () => T): T | undefined => (!partial || sent ? value() : undefined);
  // Fields listed here but not used below (fixedDeparture, dateRanges, …) are legacy form fields:
  // naming them keeps them out of `rest`, so they are never written to the tour.
  const {
    title, code, excerpt, description, coverImage, file, tourStatus,
    price, originalPrice, basePrice, discountEnabled, discountDateRange, discountPrice,
    pricePerType, minSize, maxSize, pricingOptionsEnabled, pricingOptions,
    fixedDeparture, multipleDates, tourDates, fixedDate, dateRanges,
    category, outline, itinerary, include, exclude, facts, faqs,
    gallery, map, location, author, enquiry, isSpecialOffer,
    destination, groupSize, pricing, dates, priceLockDate, ...rest
  } = body;

  // Check if pricing is per person or per group
  // Parse pricing JSON string if it exists
  let pricingData: Raw = {};
  if (pricing) {
    try {
      pricingData = asRecord(typeof pricing === 'string' ? JSON.parse(pricing) : pricing);
    } catch (error) {
      console.error('Error parsing pricing JSON:', error);
      pricingData = asRecord(pricing);
    }
  }

  const isPerPerson = pricingData.pricePerPerson !== false; // Default to true if not specified

  // Extract nested pricing data if it exists
  const nestedPricing = pricingData;
  const nestedDiscount = asRecord(nestedPricing.discount);
  const finalPricingOptions = pricingOptions || nestedPricing.pricingOptions;

  // Prioritize nested pricing discount over top-level fields
  const finalDiscountEnabled = nestedDiscount.discountEnabled !== undefined ? nestedDiscount.discountEnabled : discountEnabled;
  const finalDiscountPrice = nestedDiscount.discountPrice !== undefined ? nestedDiscount.discountPrice : discountPrice;
  const finalDiscountPercentage = nestedDiscount.discountPercentage;
  const finalPercentageOrPrice = nestedDiscount.percentageOrPrice;

  // Extract priceLockDate from nested pricing object or top-level
  const finalPriceLockDate = nestedPricing.priceLockDate || priceLockDate;

  const finalDiscountDateRange = nestedDiscount.dateRange || discountDateRange;

  const finalPricingOptionsEnabled = pricingOptionsEnabled !== undefined ? pricingOptionsEnabled : nestedPricing.pricingOptionsEnabled;

  const finalPaymentOptions = body.paymentOptions !== undefined ? body.paymentOptions : nestedPricing.paymentOptions;

  return {
    // Basic fields
    title, code, excerpt, description, coverImage, file, tourStatus,

    // Pricing fields (flat structure to match database schema)
    price: when(price !== undefined, () => safeToNumber(price)),
    originalPrice: when(originalPrice !== undefined, () => safeToNumber(originalPrice)),
    basePrice: when(basePrice !== undefined, () => safeToNumber(basePrice)),
    pricePerPerson: when(pricing !== undefined, () => isPerPerson),
    minSize: when(minSize !== undefined, () => safeToNumber(minSize)),
    maxSize: when(maxSize !== undefined, () => safeToNumber(maxSize)),
    pricingOptionsEnabled: finalPricingOptionsEnabled,
    paymentOptions: when(finalPaymentOptions !== undefined, () => processPaymentOptions(finalPaymentOptions)),

    // Discount data (flat structure)
    discount: when(
      nestedPricing.discount !== undefined || discountEnabled !== undefined || discountPrice !== undefined || discountDateRange !== undefined,
      () => ({
        discountEnabled: convertToBoolean(finalDiscountEnabled),
        discountPrice: safeToNumber(finalDiscountPrice),
        discountPercentage: safeToNumber(finalDiscountPercentage),
        discountDateRange: toDiscountDateRange(finalDiscountDateRange),
        percentageOrPrice: convertToBoolean(finalPercentageOrPrice)
      }),
    ),

    // Tour dates data - map to correct field name for database schema
    tourDates: dates ? processTourDatesData(dates) : undefined,

    // Pricing options processing
    pricingOptions: finalPricingOptions ? processPricingOptions(finalPricingOptions) : undefined,

    // Structured data fields
    category: category ? processCategoryData(category) : undefined,
    outline,
    itinerary: itinerary ? processItineraryData(itinerary) : undefined,
    include: include ? include : undefined,
    exclude: exclude ? exclude : undefined,
    facts: facts ? processFactsData(facts) : undefined,
    faqs: faqs ? processFaqsData(faqs) : undefined,
    gallery: gallery ? processGalleryData(gallery) : undefined,
    location: location ? processLocationData(location) : undefined,

    // Other fields
    author,
    enquiry: when(enquiry !== undefined, () => convertToBoolean(enquiry)),
    isSpecialOffer: when(isSpecialOffer !== undefined, () => convertToBoolean(isSpecialOffer)),
    destination,
    // Price lock settings
    priceLockDate: finalPriceLockDate ? toDate(finalPriceLockDate) : undefined,
    // Only set groupSize when pricing is per group (pricePerPerson = false)
    ...(isPerPerson || (partial && pricing === undefined) ? {} : { groupSize: safeToNumber(groupSize, 1) }),

    // Any remaining fields
    ...rest
  };
};
