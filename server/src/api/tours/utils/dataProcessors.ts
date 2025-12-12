import mongoose from 'mongoose';
import { PricingOption, DateRange, FactValue } from '../tourTypes';

/**
 * Data Processing Utilities
 * Centralized functions for processing complex form data
 */

/**
 * Parse JSON field safely
 */
export const parseJsonField = (field: any, defaultValue: any = undefined) => {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (error) {
      console.error('Error parsing JSON field:', error);
      return defaultValue;
    }
  }
  return field || defaultValue;
};

/**
 * Convert various boolean representations to actual boolean
 */
export const convertToBoolean = (value: any): boolean => {
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
export const safeToNumber = (value: any, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Process category data from form submission
 * Returns array of ObjectIds for the category field
 */
export const processCategoryData = (category: any): Array<mongoose.Types.ObjectId> => {
  try {

    // Handle category data as JSON string
    if (typeof category === 'string') {
      try {
        const parsedCategories = JSON.parse(category);
        if (Array.isArray(parsedCategories)) {
          return parsedCategories.map((cat: any) => {
            const catId = cat.categoryId || cat.id || cat.value;
            return new mongoose.Types.ObjectId(catId);
          });
        }
      } catch (parseError) {
        console.error('Error parsing category JSON string:', parseError);
      }
    }

    // Handle special case with mixed object structure
    if (category && typeof category === 'object' && !Array.isArray(category) && category[''] && typeof category[''] === 'string') {
      const parsedCategories = JSON.parse(category['']);
      return parsedCategories.map((cat: any) => {
        const catId = cat.id || cat.value || cat.categoryId;
        return new mongoose.Types.ObjectId(catId);
      });
    }

    // Handle array of categories
    if (Array.isArray(category)) {
      return category.map((cat: any) => {
        const catId = cat.id || cat.value || cat.categoryId;
        return new mongoose.Types.ObjectId(catId);
      });
    }

    // Handle single category object
    if (category && typeof category === 'object') {
      const catId = category.id || category.value || category.categoryId;

      return [new mongoose.Types.ObjectId(catId)];
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
export const processPricingOptions = (pricingOptionsData: any): PricingOption[] => {
  try {
    const parsed = parseJsonField(pricingOptionsData, []);

    if (!Array.isArray(parsed)) {
      console.warn('Pricing options is not an array:', parsed);
      return [];
    }

    return parsed.map((option: any, index: number) => {
      // Handle both nested discount structure and flat structure for backward compatibility
      const discount = option.discount || {};
      const discountEnabled = convertToBoolean(discount.discountEnabled || option.discountEnabled);
      const discountPrice = safeToNumber(discount.discountPrice || option.discountPrice);
      const discountDateRange = discount.discountDateRange || option.discountDateRange;
      const percentageOrPrice = convertToBoolean(discount.percentageOrPrice || option.percentageOrPrice);
      const discountPercentage = safeToNumber(discount.discountPercentage || option.discountPercentage);

      // Generate stable ID if not provided, or preserve existing ID
      // Include index to ensure uniqueness even when processed at the same time
      const stableId = option.id || `pricing_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        id: stableId, // Add stable ID field
        name: option.name || option.optionName || '',
        category: option.category || 'adult',
        customCategory: option.customCategory,
        price: safeToNumber(option.price || option.optionPrice),
        // Create nested discount object to match schema
        discount: {
          discountEnabled,
          discountPrice,
          discountDateRange: discountDateRange ? {
            from: new Date(discountDateRange.from || discountDateRange.startDate),
            to: new Date(discountDateRange.to || discountDateRange.endDate)
          } : undefined,
          percentageOrPrice,
          discountPercentage
        },
        paxRange: {
          minPax: safeToNumber(option.paxRange?.minPax || option.paxRange?.from || option.minPax, 1),
          maxPax: safeToNumber(option.paxRange?.maxPax || option.paxRange?.to || option.maxPax, 10)
        }
      };
    });
  } catch (error) {
    console.error("Error processing pricing options:", error);
    return [];
  }
};

/**
 * Process date ranges data
 */
export const processDateRanges = (dateRangesData: any): DateRange[] => {
  try {
    const parsed = parseJsonField(dateRangesData, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((range: any) => ({
      label: range.label || 'Date Range',
      startDate: new Date(range.startDate || range.dateRange?.from),
      endDate: new Date(range.endDate || range.dateRange?.to),
      selectedOptions: Array.isArray(range.selectedOptions) ? range.selectedOptions : []
    }));
  } catch (error) {
    console.error("Error processing date ranges:", error);
    return [];
  }
};

/**
 * Process itinerary data
 */
export const processItineraryData = (itinerary: any) => {
  try {
    const parsed = parseJsonField(itinerary, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item: any) => ({
      day: item.day || '',
      title: item.title || '',
      description: item.description || '',
      date: item.date ? new Date(item.date) : undefined
    }));
  } catch (error) {
    console.error("Error processing itinerary data:", error);
    return [];
  }
};

/**
 * Process facts data with special handling for different field types
 */
export const processFactsData = (facts: any) => {
  try {
    const parsed = parseJsonField(facts, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((fact: any) => {
      let factValue = fact.value;

      // Handle stringified arrays and objects
      if (typeof factValue === 'string' && (factValue.startsWith('[') || factValue.startsWith('{'))) {
        try {
          factValue = JSON.parse(factValue);
        } catch (e) {
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
        if (fact.field_type === 'Plain Text') {
          factValue = '';
        } else {
          factValue = [];
        }
      }

      return {
        factId: fact.factId || fact._id,  // Preserve factId for cascade updates!
        title: fact.title || '',
        field_type: fact.field_type || 'Plain Text',
        value: factValue,
        icon: fact.icon || ''
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
export const processFaqsData = (faqs: any) => {
  try {
    const parsed = parseJsonField(faqs, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((faq: any) => ({
      faqId: faq.faqId || faq._id,  // Preserve faqId for cascade updates!
      question: faq.question || '',
      answer: faq.answer || ''
    }));
  } catch (error) {
    console.error("Error processing FAQs data:", error);
    return [];
  }
};

/**
 * Process gallery data
 */
export const processGalleryData = (gallery: any) => {
  try {
    const parsed = parseJsonField(gallery, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item: any) => ({
      image: item.image || item.url || ''
    }));
  } catch (error) {
    console.error("Error processing gallery data:", error);
    return [];
  }
};

/**
 * Process location data
 */
export const processLocationData = (location: any) => {
  try {
    const parsed = parseJsonField(location);

    if (!parsed) return undefined;

    // Validate required fields
    const requiredFields = ['street', 'city', 'state', 'country', 'lat', 'lng'];
    const missingFields = requiredFields.filter(field => !parsed[field]);

    if (missingFields.length > 0) {
      console.warn(`Missing required location fields: ${missingFields.join(', ')}`);
    }

    return {
      street: String(parsed.street || ''),
      city: String(parsed.city || ''),
      state: String(parsed.state || ''),
      country: String(parsed.country || ''),
      lat: safeToNumber(parsed.lat),
      lng: safeToNumber(parsed.lng),
      map: String(parsed.map || ''),
      zip: String(parsed.zip || '')
    };
  } catch (error) {
    console.error("Error processing location data:", error);
    return undefined;
  }
};

/**
 * Process tour dates data with comprehensive handling for all date types
 */
export const processTourDatesData = (tourDates: any) => {
  try {
    const parsed = parseJsonField(tourDates);

    if (!parsed) return undefined;

    console.log('🔍 Processing tour dates data:', parsed);
    console.log('🔍 Raw dateRange field:', parsed.dateRange);
    console.log('🔍 dateRange type:', typeof parsed.dateRange);
    console.log('🔍 Full parsed object:', JSON.stringify(parsed, null, 2));

    // Process departures array for multiple departure type
    const processedDepartures = Array.isArray(parsed.departures)
      ? parsed.departures.map((departure: any) => {
        console.log('🔍 Processing individual departure:', departure);
        console.log('🔍 Departure recurrencePattern:', departure.recurrencePattern);
        console.log('🔍 Departure selectedPricingOptions:', departure.selectedPricingOptions);
        console.log('🔍 Departure pricingCategory:', departure.pricingCategory);

        return {
          id: departure.id || `departure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          label: departure.label || 'Departure',
          dateRange: departure.dateRange ? {
            from: new Date(departure.dateRange.from),
            to: new Date(departure.dateRange.to)
          } : undefined,
          isRecurring: convertToBoolean(departure.isRecurring),
          recurrencePattern: departure.recurrencePattern || (departure.isRecurring ? 'weekly' : undefined),
          recurrenceInterval: safeToNumber(departure.recurrenceInterval, 1),
          recurrenceEndDate: departure.recurrenceEndDate ? new Date(departure.recurrenceEndDate) : undefined,
          selectedPricingOptions: Array.isArray(departure.selectedPricingOptions)
            ? departure.selectedPricingOptions
            : (Array.isArray(departure.pricingCategory) ? departure.pricingCategory : []),
          pricingCategory: Array.isArray(departure.pricingCategory) ? departure.pricingCategory : []
        };
      })
      : [];

    // Process main date range for fixed dates - map to defaultDateRange for schema compatibility
    const processedDateRange = parsed.dateRange ? {
      from: new Date(parsed.dateRange.from),
      to: new Date(parsed.dateRange.to)
    } : undefined;

    const result = {
      scheduleType: parsed.scheduleType || 'flexible',
      days: safeToNumber(parsed.days),
      nights: safeToNumber(parsed.nights),

      // Fixed date fields - use defaultDateRange to match schema
      defaultDateRange: processedDateRange,

      // Multiple departures fields
      departures: processedDepartures,

      // Recurring fields
      isRecurring: convertToBoolean(parsed.isRecurring),
      recurrencePattern: parsed.recurrencePattern || 'weekly',
      recurrenceInterval: safeToNumber(parsed.recurrenceInterval, 1),
      recurrenceEndDate: parsed.recurrenceEndDate ? new Date(parsed.recurrenceEndDate) : undefined,

      // Pricing category - for multiple departures, collect all selectedPricingOptions from all departures
      pricingCategory: (() => {
        if (parsed.scheduleType === 'multiple' && processedDepartures.length > 0) {
          // Collect all unique pricing options from all departures
          const allPricingOptions = new Set();
          processedDepartures.forEach((departure: any) => {
            if (Array.isArray(departure.selectedPricingOptions)) {
              departure.selectedPricingOptions.forEach((option: string) => {
                allPricingOptions.add(option);
              });
            }
          });
          return Array.from(allPricingOptions);
        } else {
          // For flexible and fixed dates, use the main pricingCategory
          return Array.isArray(parsed.pricingCategory)
            ? parsed.pricingCategory
            : (parsed.pricingCategory ? [parsed.pricingCategory] : []);
        }
      })()
    };

    console.log('🎯 Processed dates result:', result);
    return result;
  } catch (error) {
    console.error("Error processing tour dates data:", error);
    return undefined;
  }
};

/**
 * Extract and process all tour fields from request body
 */
export const extractTourFields = (req: any) => {
  const {
    title, code, excerpt, description, coverImage, file, tourStatus,
    price, originalPrice, basePrice, discountEnabled, discountDateRange, discountPrice,
    pricePerType, minSize, maxSize, pricingOptionsEnabled, pricingOptions,
    fixedDeparture, multipleDates, tourDates, fixedDate, dateRanges,
    category, outline, itinerary, include, exclude, facts, faqs,
    gallery, map, location, author, enquiry, isSpecialOffer,
    destination, groupSize, pricing, dates, priceLockDate, ...rest
  } = req.body;

  // Check if pricing is per person or per group
  // Parse pricing JSON string if it exists
  let pricingData: any = {};
  if (pricing) {
    try {
      pricingData = typeof pricing === 'string' ? JSON.parse(pricing) : pricing;
    } catch (error) {
      console.error('Error parsing pricing JSON:', error);
      pricingData = pricing || {};
    }
  }

  const isPerPerson = pricingData.pricePerPerson !== false; // Default to true if not specified

  // Extract nested pricing data if it exists
  const nestedPricing: any = pricingData || {};
  const finalPricingOptions = pricingOptions || nestedPricing.pricingOptions;

  // Prioritize nested pricing discount over top-level fields
  const finalDiscountEnabled = nestedPricing.discount?.discountEnabled !== undefined ? nestedPricing.discount.discountEnabled : discountEnabled;
  const finalDiscountPrice = nestedPricing.discount?.discountPrice !== undefined ? nestedPricing.discount.discountPrice : discountPrice;

  // Extract priceLockDate from nested pricing object or top-level
  const finalPriceLockDate = nestedPricing.priceLockDate || priceLockDate;

  const finalDiscountDateRange = nestedPricing.discount?.dateRange || discountDateRange;

  const finalPricingOptionsEnabled = pricingOptionsEnabled !== undefined ? pricingOptionsEnabled : nestedPricing.pricingOptionsEnabled;

  const result = {
    // Basic fields
    title, code, excerpt, description, coverImage, file, tourStatus,

    // Pricing fields (flat structure to match database schema)
    price: safeToNumber(price),
    originalPrice: safeToNumber(originalPrice),
    basePrice: safeToNumber(basePrice),
    pricePerPerson: isPerPerson,
    minSize: safeToNumber(minSize),
    maxSize: safeToNumber(maxSize),
    pricingOptionsEnabled: finalPricingOptionsEnabled,

    // Discount data (flat structure)
    discount: {
      discountEnabled: convertToBoolean(finalDiscountEnabled),
      discountPrice: safeToNumber(finalDiscountPrice),
      discountDateRange: finalDiscountDateRange ? (() => {
        try {
          // Handle both string and object formats
          const parsedRange = typeof finalDiscountDateRange === 'string'
            ? JSON.parse(finalDiscountDateRange)
            : finalDiscountDateRange;

          const fromDate = new Date(parsedRange.from);
          const toDate = new Date(parsedRange.to);

          // Ensure dates are valid and to >= from
          if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            console.error('Invalid dates in discount range');
            return undefined;
          }

          if (toDate < fromDate) {
            console.error('End date must be after start date');
            return undefined;
          }

          return { from: fromDate, to: toDate };
        } catch (error) {
          console.error('Error parsing discount date range:', error);
          return undefined;
        }
      })() : undefined,
      percentageOrPrice: false
    },

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
    enquiry: convertToBoolean(enquiry),
    isSpecialOffer: convertToBoolean(isSpecialOffer),
    destination,
    // Price lock settings
    priceLockDate: finalPriceLockDate ? new Date(finalPriceLockDate) : undefined,
    // Only set groupSize when pricing is per group (pricePerPerson = false)
    ...(isPerPerson ? {} : { groupSize: safeToNumber(groupSize, 1) }),

    // Any remaining fields
    ...rest
  };

  return result;
};
