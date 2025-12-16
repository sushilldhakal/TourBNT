// import { Request, Response, NextFunction } from 'express';
// import CreateHttpError from 'http-errors';
// import mongoose from 'mongoose';
// import tourModel from './tourModel';
// import { AuthRequest } from "../../middlewares/authenticate";
// import { Discount, PricingOption, DateRange, Tour, FactValue } from './tourTypes';
// import { paginate, PaginationParams } from '../../utils/pagination';

// // Helper functions for handling common data types
// const convertToBoolean = (value: unknown): boolean => {
//   if (typeof value === 'boolean') return value;
//   if (typeof value === 'string') return value.toLowerCase() === 'true';
//   return Boolean(value);
// };

// const parseJsonField = <T>(jsonString: string | any, defaultValue: T): T => {
//   if (!jsonString) return defaultValue;
//   if (typeof jsonString !== 'string') return jsonString;
  
//   try {
//     return JSON.parse(jsonString);
//   } catch (e) {
//     console.error("Error parsing JSON field:", e);
//     return defaultValue;
//   }
// };
// /**
//  * Ensures a consistent date range format for use in the controller
//  * Handles both internal format (from/to) and imported DateRange format (startDate/endDate)
//  * Returns an object with from and to properties as dates
//  */
// const ensureDateRange = (dateRange: any): { from: Date; to: Date } => {
//   if (!dateRange) return { from: new Date(), to: new Date() };
  
//   // Create default dates - current date for from, one month later for to
//   const defaultFrom = new Date();
//   const defaultTo = new Date();
//   defaultTo.setMonth(defaultTo.getMonth() + 1);
  
//   return {
//     // Handle both formats: from/to (internal) and startDate/endDate (from tourTypes.ts)
//     from: dateRange.from ? new Date(dateRange.from) : 
//           dateRange.startDate ? new Date(dateRange.startDate) : defaultFrom,
//     to: dateRange.to ? new Date(dateRange.to) : 
//         dateRange.endDate ? new Date(dateRange.endDate) : defaultTo
//   };
// };

// // Helper function to process category data
// const processCategoryData = (category: any): Array<any> => {
//   try {
    
//     // Check for the special case where we have a mixed object with numbered keys and an empty string key
//     if (category && typeof category === 'object' && !Array.isArray(category) && category[''] && typeof category[''] === 'string') {
//       try {
//         // Use the JSON string from the empty key
//         return JSON.parse(category['']).map((cat: any) => {
//           if (cat && cat.value) {
//             return {
//               value: cat.value,
//               label: cat.label,
//               categoryId: new mongoose.Types.ObjectId(cat.value),
//               categoryName: cat.label
//             };
//           }
//           return null;
//         }).filter(Boolean);
//       } catch (e) {
//         console.error('Error parsing category from empty key:', e);
//         // Continue with other methods if this fails
//       }
//     }
    
//     // Parse the category if it's a string
//     let categoryArray;
//     if (typeof category === 'string') {
//       try {
//         categoryArray = JSON.parse(category);
//       } catch (e) {
//         console.error('Error parsing category string:', e);
//         categoryArray = [];
//       }
//     } else if (Array.isArray(category)) {
//       categoryArray = category;
//     } else if (typeof category === 'object') {
//       // Try to extract values from object that might have numeric keys
//       categoryArray = Object.values(category)
//         .filter(item => item && typeof item === 'object' && 'value' in item && 'label' in item);
//     } else {
//       categoryArray = [];
//     }
    
//     // Handle the array of objects with label and value properties
//     const processedCategory = categoryArray.map((cat: any) => {
//       if (cat && cat.value) {
//         const catId = cat.value || cat.categoryId || '';
//         const catName = cat.label || cat.categoryName || 'Category';
        
//         return {
//           // Include both original value/label (required by schema validation)
//           value: catId,
//           label: catName,
//           // Also include categoryId/categoryName for internal use
//           categoryId: new mongoose.Types.ObjectId(catId),
//           categoryName: catName
//         };
//       }
      
//       // Fallback for invalid categories
//       const id = new mongoose.Types.ObjectId().toString();
//       return {
//         value: id,
//         label: 'Category',
//         categoryId: new mongoose.Types.ObjectId(id),
//         categoryName: 'Category'
//       };
//     });
    
//     return processedCategory;
//   } catch (error) {
//     console.error("Error processing category:", error);
//     return [];
//   }
// };

// // Helper function to process itinerary data
// const processItineraryData = (itinerary: any): Array<{
//     day: string;
//     title: string;
//     description: string;
//     dateTime: Date;
//   }> => {
//   try {
    
//     // Parse the itinerary if it's a string
//     let itineraryArray;
//     if (typeof itinerary === 'string') {
//       try {
//         itineraryArray = JSON.parse(itinerary);
//       } catch (e) {
//         console.error('Error parsing itinerary string:', e);
//         return [];
//       }
//     } else if (Array.isArray(itinerary)) {
//       itineraryArray = itinerary;
//     } else {
//       console.warn('Itinerary is not an array or string:', itinerary);
//       return [];
//     }
    
//     // Process itinerary data
//     return itineraryArray.map((item: any) => ({
//       ...item,
//       day: item.day || '1',
//       title: item.title || '',
//       description: item.description || '',
//       dateTime: item.dateTime ? new Date(item.dateTime) : new Date()
//     }));
//   } catch (error) {
//     console.error("Error processing itinerary:", error);
//     return [];
//   }
// };

// // Helper function to process pricing options
// const processPricingOptions = (pricingOptions: any): PricingOption[] => {
//   let parsedPricingOptions: PricingOption[] = [];
//   if (!pricingOptions) return parsedPricingOptions;
  
//   let pricingArray;
//   try {
//     // Parse if it's a string
//     pricingArray = typeof pricingOptions === 'string' ? JSON.parse(pricingOptions) : pricingOptions;
    
//     // Check if it's valid array data
//     if (!Array.isArray(pricingArray)) {
//       console.warn('PricingOptions is not an array:', pricingArray);
//       return parsedPricingOptions;
//     }
    
//     parsedPricingOptions = pricingArray.map((option: any) => {
//       // Process discount date range
//       let processedDiscountDateRange = { from: new Date(), to: new Date() };
//       try {
//         const rawDiscountDateRange = option.discountDateRange || { from: new Date(), to: new Date() };
//         processedDiscountDateRange = ensureDateRange(rawDiscountDateRange);
//       } catch (e) {
//         console.error('Error processing discount date range:', e);
//       }
      
//       // Create the pricing option with the correct structure
//       return {
//         name: option.name || '',
//         category: option.category || 'adult',
//         customCategory: option.customCategory || '',
//         price: Number(option.price) || 0,
//         discountEnabled: convertToBoolean(option.discountEnabled),
//         discountPrice: Number(option.discountPrice) || 0,
//         discountDateRange: processedDiscountDateRange,
//         paxRange: {
//           from: Number(option.paxRange?.from) || 1,
//           to: Number(option.paxRange?.to) || 10
//         }
//       };
//     });
    
//     return parsedPricingOptions;
//   } catch (error) {
//     console.error("Error processing pricing options:", error);
//     return [];
//   }
// };

// // Helper function for processing numeric fields with default values
// const processNumericField = (value: any, defaultValue: number = 0): number => {
//   if (value === undefined || value === null) return defaultValue;
  
//   // Handle arrays (e.g., price can be an array)
//   if (Array.isArray(value) && value.length > 0) {
//     return parseFloat(String(value[0])) || defaultValue;
//   }
  
//   return parseFloat(String(value)) || defaultValue;
// };

// // Helper function for processing integer fields with default values
// const processIntField = (value: any, defaultValue: number = 0): number => {
//   if (value === undefined || value === null) return defaultValue;
  
//   // Handle arrays
//   if (Array.isArray(value) && value.length > 0) {
//     return parseInt(String(value[0])) || defaultValue;
//   }
  
//   return parseInt(String(value)) || defaultValue;
// };

// // Using Discount interface imported from tourTypes.ts

// // Type for internal discount processing (matches the key fields from Discount in tourTypes.ts)
// type DiscountData = Pick<Discount, 'discountEnabled' | 'discountPrice' | 'discountDateRange'>;

// // Process discount data to create a structured discount object
// const processDiscountData = (discountEnabled: boolean | string | undefined, discountPrice: number | string | undefined, discountDateRange: any): DiscountData => {
//   // Convert discountEnabled to boolean and provide default values
//   const isDiscountEnabled = convertToBoolean(discountEnabled);
  
//   // Parse discountPrice as a number with a default value
//   const discountPriceValue = processNumericField(discountPrice, 0);
  
//   // Process date range with proper defaults
//   const from = new Date();
//   const to = new Date();
//   to.setMonth(to.getMonth() + 1); // Default to 1 month from now
  
//   // Parse the provided date range or use defaults
//   let parsedDiscountDateRange = { from, to };
//   if (discountDateRange) {
//     if (typeof discountDateRange === 'string') {
//       try {
//         const parsed = JSON.parse(discountDateRange);
//         if (parsed.from) parsedDiscountDateRange.from = new Date(parsed.from);
//         if (parsed.to) parsedDiscountDateRange.to = new Date(parsed.to);
//       } catch (e) {
//         console.error('Error parsing discount date range:', e);
//       }
//     } else if (typeof discountDateRange === 'object') {
//       if (discountDateRange.from) parsedDiscountDateRange.from = new Date(discountDateRange.from);
//       if (discountDateRange.to) parsedDiscountDateRange.to = new Date(discountDateRange.to);
//     }
//   }
  
//   // Create the complete discount object
//   return {
//     discountEnabled: isDiscountEnabled,
//     discountPrice: discountPriceValue,
//     discountDateRange: parsedDiscountDateRange,
//   };
// };

// // Process destination data to handle different formats (string ID or object with _id)
// const processDestinationData = (destination: any) => {
//   if (!destination) return undefined;
  
//   if (typeof destination === 'string' && destination.trim() !== '') {
//     return new mongoose.Types.ObjectId(destination);
//   } else if (typeof destination === 'object' && '_id' in destination) {
//     const destObj = destination as { _id: string };
//     return new mongoose.Types.ObjectId(destObj._id);
//   }
  
//   return undefined;
// };

// // Process location data to ensure it has all required fields with proper types
// const processLocationData = (location: any) => {
//   if (!location) return undefined;
  
//   try {
//     // Parse the location if it's a string
//     const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
    
//     // Validate that all required fields exist
//     const requiredFields = ['street', 'city', 'state', 'country', 'lat', 'lng'];
//     const missingFields = requiredFields.filter(field => !parsedLocation[field]);
    
//     if (missingFields.length > 0) {
//       console.warn(`Location is missing required fields: ${missingFields.join(', ')}`);
      
//       // Create a complete location object with defaults for missing fields
//       return {
//         id: parsedLocation.id ? parsedLocation.id : new mongoose.Types.ObjectId(),
//         street: parsedLocation.street || '',
//         city: parsedLocation.city || '',
//         state: parsedLocation.state || '',
//         country: parsedLocation.country || '',
//         lat: typeof parsedLocation.lat === 'number' ? parsedLocation.lat : 0,
//         lng: typeof parsedLocation.lng === 'number' ? parsedLocation.lng : 0,
//         map: parsedLocation.map || '',
//         zip: parsedLocation.zip || '',
//         // Add any existing fields that aren't in the required list
//         ...Object.fromEntries(
//           Object.entries(parsedLocation).filter(([key]) => 
//             !requiredFields.includes(key) && key !== 'map' && key !== 'zip' && key !== 'id'
//           )
//         )
//       };
//     } else {
//       // All required fields exist, but ensure they have the right types
//       return {
//         id: parsedLocation.id ? parsedLocation.id : new mongoose.Types.ObjectId(),
//         street: String(parsedLocation.street),
//         city: String(parsedLocation.city),
//         state: String(parsedLocation.state),
//         country: String(parsedLocation.country),
//         lat: Number(parsedLocation.lat),
//         lng: Number(parsedLocation.lng),
//         map: String(parsedLocation.map || ''),
//         zip: String(parsedLocation.zip || ''),
//         // Add any existing fields that aren't in the required list
//         ...Object.fromEntries(
//           Object.entries(parsedLocation).filter(([key]) => 
//             !requiredFields.includes(key) && key !== 'map' && key !== 'zip' && key !== 'id'
//           )
//         )
//       };
//     }
//   } catch (error) {
//     console.error("Error processing location data:", error);
//     return undefined;
//   }
// };

// // Process gallery data to handle different formats (array, string, or single item)
// const processGalleryData = (gallery: any) => {
//   if (!gallery) return undefined;
  
//   try {
//     // Handle gallery array or single item
//     return Array.isArray(gallery) ? gallery : 
//            (typeof gallery === 'string' ? JSON.parse(gallery) : [gallery]);
//   } catch (error) {
//     console.error("Error processing gallery data:", error);
//     return undefined;
//   }
// };

// // Process FAQs data to ensure it's in the correct format
// const processFaqsData = (faqs: any) => {
//   if (!faqs) return undefined;
  
//   try {
//     // FAQs are already in the correct array format
//     return Array.isArray(faqs) ? faqs : 
//            (typeof faqs === 'string' ? JSON.parse(faqs) : []);
//   } catch (error) {
//     console.error("Error processing faqs data:", error);
//     return undefined;
//   }
// };

// // Process facts data with special handling for different field types
// const processFactsData = (facts: any) => {
//   if (!facts) return undefined;
//   console.log("Processing facts data:", facts);
//   try {
//     // Parse facts if needed
//     let factsArray = Array.isArray(facts) ? facts : 
//                   (typeof facts === 'string' ? JSON.parse(facts) : []);
    
//     // Define fact interface to fix TypeScript errors
//     interface FactItem {
//       title: string;
//       field_type: string;
//       value: any; // can be array of strings or array of objects
//       icon: string;
//     }
    
//     // Process each fact to fix nested arrays and stringified objects
//     return factsArray.map((fact: FactItem) => {
//       // Extract value and normalize it
//       let factValue = fact.value;
      
//       // Fix double-nested arrays
//       if (Array.isArray(factValue) && factValue.length === 1 && Array.isArray(factValue[0])) {
//         factValue = factValue[0];
//       }
      
//       // Special handling for Multi Select with JSON string
//       if (fact.field_type === 'Multi Select') {
//         // For Multi Select fields, the value might be a JSON string itself
//         if (Array.isArray(factValue) && factValue.length === 1 && typeof factValue[0] === 'string' && factValue[0].startsWith('[')) {
//           try {
//             // Parse the JSON string to get actual objects
//             factValue = JSON.parse(factValue[0]);
//           } catch (e) {
//             console.error("Error parsing Multi Select JSON string:", e);
//             factValue = [];
//           }
//         } else if (typeof factValue === 'string' && factValue.startsWith('[')) {
//           try {
//             factValue = JSON.parse(factValue);
//           } catch (e) {
//             console.error("Error parsing direct JSON string:", e);
//             factValue = [];
//           }
//         }
        
//         // Ensure every item in Multi Select has label and value properties
//         if (Array.isArray(factValue)) {
//           factValue = factValue.map((item: any) => {
//             // If item is a string, convert to object with label and value
//             if (typeof item === 'string') {
//               return { label: item, value: item };
//             }
//             // If item is already an object but missing label or value
//             if (typeof item === 'object' && item !== null) {
//               return {
//                 label: item.label || item.name || item.text || item.value || String(item),
//                 value: item.value || item.id || item.key || item.label || String(item)
//               };
//             }
//             // Default fallback
//             return { label: String(item), value: String(item) };
//           });
//         } else {
//           // If not an array, convert to empty array
//           factValue = [];
//         }
//       }
      
//       // Default value handling
//       if (!factValue || (Array.isArray(factValue) && factValue.length === 0)) {
//         if (fact.field_type === 'Plain Text') {
//           factValue = [''];
//         } else if (fact.field_type === 'Single Select') {
//           factValue = [''];
//         } else if (fact.field_type === 'Multi Select') {
//           factValue = [];
//         }
//       }
      
//       return {
//         ...fact,
//         value: factValue
//       };
//     });
//   } catch (error) {
//     console.error("Error processing facts data:", error);
//     return undefined;
//   }
// };

// // Helper function to process tourDates - using compatible format with tourTypes.ts
// type TourDatesData = {
//   days: number;
//   nights: number;
//   dateRange: {
//     from: Date; // Internal from/to format used in the controller
//     to: Date;
//   };
//   isRecurring: boolean;
//   recurrencePattern?: string;
//   recurrenceEndDate?: Date;
// }

// const processTourDates = (tourDates: any): TourDatesData => {
//   if (!tourDates) {
//     return {
//       days: 0,
//       nights: 0,
//       dateRange: { from: new Date(), to: new Date() },
//       isRecurring: false
//     };
//   }
  
//   try {
//     // Parse the tourDates if it's a string
//     const parsedTourDates = typeof tourDates === 'string' ? JSON.parse(tourDates) : tourDates;
    
//     return {
//       days: processIntField(parsedTourDates.days, 0),
//       nights: processIntField(parsedTourDates.nights, 0),
//       dateRange: ensureDateRange(parsedTourDates.dateRange),
//       isRecurring: convertToBoolean(parsedTourDates.isRecurring),
//       recurrencePattern: parsedTourDates.recurrencePattern,
//       recurrenceEndDate: parsedTourDates.recurrenceEndDate ? new Date(parsedTourDates.recurrenceEndDate) : undefined
//     };
//   } catch (error) {
//     console.error('Error processing tour dates:', error);
//     return {
//       days: 0,
//       nights: 0,
//       dateRange: { from: new Date(), to: new Date() },
//       isRecurring: false
//     };
//   }
// };

// // Helper function to extract tour fields from request body
// interface TourRequestFields {
//   title?: string;
//   code?: string;
//   excerpt?: string;
//   description?: string;
//   coverImage?: string;
//   file?: string;
//   tourStatus?: string;
//   price?: string | number | string[];
//   originalPrice?: string | number;
//   basePrice?: string | number;
//   discountEnabled?: boolean | string;
//   discountDateRange?: any;
//   discountPrice?: string | number;
//   pricePerType?: string;
//   minSize?: string | number;
//   maxSize?: string | number;
//   pricingOptionsEnabled?: boolean | string;
//   pricingOptions?: any;
//   fixedDeparture?: boolean | string;
//   multipleDates?: boolean | string;
//   tourDates?: any;
//   fixedDate?: any;
//   dateRanges?: any;
//   category?: any;
//   outline?: string;
//   itinerary?: any;
//   include?: string | string[];
//   exclude?: string | string[];
//   facts?: any;
//   faqs?: any;
//   gallery?: any;
//   map?: string;
//   location?: any;
//   author?: any;
//   enquiry?: boolean | string;
//   isSpecialOffer?: boolean | string;
//   destination?: string;
//   groupSize?: string | number;
//   [key: string]: any; // Allow for additional fields
// }

// const extractTourFields = (req: Request): TourRequestFields => {
//   // Extract top level fields from request body
//   const {
//     title,
//     code,
//     excerpt,
//     description,
//     coverImage,
//     file,
//     tourStatus,
//     // Handle both top-level price and nested price
//     price,
//     originalPrice,
//     // Other fields
//     category,
//     outline,
//     itinerary,
//     include,
//     exclude,
//     facts,
//     faqs,
//     gallery,
//     map,
//     location,
//     author,
//     enquiry,
//     isSpecialOffer,
//     destination,
//     groupSize,
//     // Get nested objects directly
//     pricing,
//     dates,
//     ...rest // Capture any other fields that might be present
//   } = req.body;
  
  
//   // Extract values from nested pricing object if it exists
//   const basePrice = pricing?.price || price;
//   const pricePerType = pricing?.pricePerPerson ? 'person' : 'group';
//   const pricingOptionsEnabled = pricing?.pricingOptionsEnabled;
  
//   // Get minSize and maxSize directly from top-level or from pricing object
//   // Prioritize explicit minSize/maxSize fields over paxRange extraction
//   const minSize = rest.minSize !== undefined ? rest.minSize : 
//                  pricing?.minSize !== undefined ? pricing.minSize :
//                  pricing?.paxRange?.[0] || 1;
  
//   const maxSize = rest.maxSize !== undefined ? rest.maxSize : 
//                  pricing?.maxSize !== undefined ? pricing.maxSize :
//                  pricing?.paxRange?.[1] || 10;
  
//   // Extract discount info from nested pricing.discount if it exists
//   const discountEnabled = pricing?.discount?.discountEnabled || rest.discountEnabled;
//   const discountPrice = pricing?.discount?.discountPrice || rest.discountPrice;
//   const discountDateRange = pricing?.discount?.dateRange || rest.discountDateRange;
  
//   // Get pricing options
//   const pricingOptions = pricing?.pricingOptions || rest.pricingOptions;
  
//   // Extract values from nested dates object if it exists
//   const fixedDeparture = dates?.fixedDeparture || rest.fixedDeparture;
//   const multipleDates = dates?.multipleDates || rest.multipleDates;
//   const tourDates = {
//     days: dates?.days,
//     nights: dates?.nights,
//     dateRange: dates?.singleDateRange,
//     ...rest.tourDates
//   };
//   const dateRanges = dates?.departures || rest.dateRanges;

//   // Create fixedDate from dates object if available
//   const fixedDate = dates?.singleDateRange ? {
//     dateRange: dates.singleDateRange,
//     selectedPricingOption: null
//   } : null;

//   return {
//     title,
//     code,
//     excerpt,
//     description,
//     coverImage: coverImage || (req.file?.path || undefined),
//     file: file || (req.file?.path || undefined),
//     tourStatus,
//     price,
//     originalPrice,
//     basePrice,
//     discountEnabled,
//     discountDateRange,
//     discountPrice,
//     pricePerType,
//     minSize,
//     maxSize,
//     pricingOptionsEnabled,
//     pricingOptions,
//     fixedDeparture,
//     multipleDates,
//     tourDates,
//     fixedDate,
//     dateRanges,
//     category,
//     outline,
//     itinerary,
//     include,
//     exclude,
//     facts,
//     faqs,
//     gallery,
//     map,
//     location,
//     author,
//     enquiry,
//     isSpecialOffer,
//     destination,
//     groupSize,
//     ...rest
//   };
// };

// // Helper function to process date ranges
// interface ProcessedDateRange {
//   id: string;
//   label: string;
//   dateRange: { from: Date; to: Date };
//   capacity?: number;
//   selectedPricingOptions: any[];
//   isRecurring: boolean;
//   recurrencePattern?: string;
//   recurrenceEndDate?: Date;
//   priceLockedUntil?: Date;
// }

// const processDateRanges = (dateRanges: any): ProcessedDateRange[] => {
//   if (!dateRanges) return [];
  
//   try {
//     // Parse the dateRanges array if it's a string
//     const dateRangesArray = typeof dateRanges === 'string' ? JSON.parse(dateRanges) : dateRanges;
    
//     if (!Array.isArray(dateRangesArray)) {
//       console.warn('DateRanges is not an array:', dateRangesArray);
//       return [];
//     }
    
//     // Process each range
//     return dateRangesArray.map((range: any) => {
//       // Basic validation
//       if (!range || typeof range !== 'object') {
//         console.warn('Invalid date range:', range);
//         return null;
//       }
      
//       // Create a processed range object with required fields
//       const processedRange: ProcessedDateRange = {
//         id: range.id || String(Date.now()),
//         label: range.label || '',
//         dateRange: ensureDateRange(range.dateRange),
//         capacity: range.capacity ? Number(range.capacity) : undefined,
//         selectedPricingOptions: [],
//         isRecurring: convertToBoolean(range.isRecurring),
//       };
      
//       // Process selected pricing options
//       if (range.selectedPricingOptions) {
//         if (Array.isArray(range.selectedPricingOptions)) {
//           processedRange.selectedPricingOptions = range.selectedPricingOptions.map((option: any) => {
//             // If option is already an object with all required fields, use it as is
//             if (typeof option === 'object' && option.id && option.name) {
//               return {
//                 id: option.id,
//                 name: option.name,
//                 category: option.category || '',
//                 price: Number(option.price) || 0
//               };
//             }
//             // If option is just a string (legacy format), return it as is
//             return option;
//           });
//         }
//       }
      
//       // Only add recurrence fields if isRecurring is true or they exist
//       if (processedRange.isRecurring) {
//         processedRange.recurrencePattern = range.recurrencePattern || undefined;
//         processedRange.recurrenceEndDate = range.recurrenceEndDate ? new Date(range.recurrenceEndDate) : undefined;
//       }
      
//       // Add priceLockedUntil if provided
//       if (range.priceLockedUntil) {
//         processedRange.priceLockedUntil = new Date(range.priceLockedUntil);
//       }
      
//       return processedRange;
//     }).filter(Boolean) as ProcessedDateRange[];
//   } catch (error) {
//     console.error('Error processing date ranges:', error);
//     return [];
//   }
// };

// // Function to generate a unique tour code
// const generateUniqueCode = () => {
//   const prefix = "BNT-";
//   const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
//   const timestamp = Date.now().toString(36).substring(0, 4).toUpperCase();
//   return `${prefix}${randomPart}-${timestamp}`;
// };

// // Create a tour
// export const createTour = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {

//   console.log("req.body", req.body);
//   try {
//     // Cast req to AuthRequest to access user properties
//     const authReq = req as AuthRequest;
//     // Extract all tour fields using helper function
//     const {title,code,excerpt,description,tourStatus,basePrice,price,pricePerType,minSize,maxSize,groupSize,pricingOptionsEnabled,fixedDeparture,multipleDates,isSpecialOffer,outline,include,exclude,destination,map,coverImage,file,author,enquiry,category,itinerary,facts,faqs,gallery,location,originalPrice,discountEnabled,discountPrice,discountDateRange,pricingOptions,tourDates,fixedDate,dateRanges
//     } = extractTourFields(req);

//     // Validate required fields
//     if (!title) {
//       return next(
//         CreateHttpError(400, "Title is required")
//       );
//     }

//     // Process category and itinerary data using helper functions
//     const processedCategory = category ? processCategoryData(category) : [];
//     const processedItinerary = itinerary ? processItineraryData(itinerary) : [];

//     // Parse pricingOptions field - Using PricingOption type imported from tourTypes.ts

//     let parsedPricingOptions: PricingOption[] = [];
//     if (req.body.pricingOptions) {
//       try {
//         const pricingOptionsData = parseJsonField<Record<string, any>[]>(req.body.pricingOptions, []);
        
//         // Map between field names in frontend and backend
//         parsedPricingOptions = pricingOptionsData.map(option => ({
//           name: option.name || option.optionName || '',
//           category: option.category || 'adult',
//           customCategory: option.customCategory || '',
//           price: parseFloat(String(option.price || option.optionPrice || 0)),
//           discountEnabled: convertToBoolean(option.discountEnabled),
//           discountPrice: parseFloat(String(option.discountPrice || 0)),
//           discountDateRange: ensureDateRange(option.discountDateRange || {}),
//           // Handle explicit minPax and maxPax fields from form
//           minPax: option.minPax ? parseInt(String(option.minPax)) : undefined,
//           maxPax: option.maxPax ? parseInt(String(option.maxPax)) : undefined,
//           // Also handle paxRange for backward compatibility - must use from/to to match PricingOption interface
//           paxRange: Array.isArray(option.paxRange) ? {
//             from: parseInt(String(option.paxRange[0] || 1)),
//             to: parseInt(String(option.paxRange[1] || 22))
//           } : option.paxRange && typeof option.paxRange === 'object' ? {
//             from: parseInt(String(option.paxRange.from || 1)),
//             to: parseInt(String(option.paxRange.to || 22))
//           } : {
//             from: parseInt(String(option.minPax || 1)),
//             to: parseInt(String(option.maxPax || 22))
//           }
//         }));
//       } catch (error) {
//         console.error("Error processing pricingOptions:", error);
//         parsedPricingOptions = [];
//       }
//     }

//     // Process date ranges using helper function
//     const processedDateRanges = dateRanges ? processDateRanges(dateRanges) : [];

//     // Parse fixedDate field
//     let parsedFixedDate;
//     if (req.body.fixedDate) {
//       const fixedDateData = parseJsonField<Record<string, any>>(req.body.fixedDate, {
//         dateRange: { from: new Date(), to: new Date() },
//         selectedPricingOption: null
//       });
      
//       parsedFixedDate = {
//         dateRange: ensureDateRange(fixedDateData.dateRange || {}),
//         selectedPricingOption: fixedDateData.selectedPricingOption || null
//       };
//     } else {
//       // Default values for fixedDate
//       parsedFixedDate = {
//         dateRange: { from: new Date(), to: new Date() },
//         selectedPricingOption: null
//       };
//     }

//     // Parse tourDates field
//     let parsedTourDates;
//     if (req.body.tourDates) {
//       const tourDatesData = parseJsonField<Record<string, any>>(req.body.tourDates, {
//         days: 1,
//         nights: 0,
//         dateRange: { from: new Date(), to: new Date() },
//         isRecurring: false,
//         recurrencePattern: null,
//         recurrenceEndDate: null,
//         priceLockedUntil: null
//       });
      
//       parsedTourDates = {
//         days: parseInt(String(tourDatesData.days || 1)),
//         nights: parseInt(String(tourDatesData.nights || 0)),
//         dateRange: ensureDateRange(tourDatesData.dateRange || {}),
//         isRecurring: convertToBoolean(tourDatesData.isRecurring),
//         recurrencePattern: tourDatesData.recurrencePattern || null,
//         recurrenceEndDate: tourDatesData.recurrenceEndDate ? new Date(tourDatesData.recurrenceEndDate) : null,
//         priceLockedUntil: tourDatesData.priceLockedUntil ? new Date(tourDatesData.priceLockedUntil) : null
//       };
//     } else {
//       // Default values for tourDates
//       parsedTourDates = {
//         days: 1,
//         nights: 0,
//         dateRange: { from: new Date(), to: new Date() },
//         isRecurring: false,
//         recurrencePattern: null,
//         recurrenceEndDate: null,
//         priceLockedUntil: null
//       };
//     }

//     // Process discount information using helper function
//     const discountObject = processDiscountData(
//       convertToBoolean(discountEnabled),
//       discountPrice,
//       discountDateRange
//     );
    
//     // Process tour dates using helper function
//     const processedTourDates = processTourDates(tourDates);
    
//     // Handle tour code - ensure it's truly unique
//     let tourCode = code ? code.toUpperCase() : generateUniqueCode();
    
//     // Keep generating codes until we find a unique one
//     let attempts = 0;
//     const maxAttempts = 10;
    
//     while (attempts < maxAttempts) {
//       const existingTour = await tourModel.findOne({ code: tourCode });
//       if (!existingTour) {
//         // Found a unique code, break the loop
//         break;
//       }
      
//       // Code already exists, generate a new one
//       console.log(`Tour code ${tourCode} already exists (attempt ${attempts + 1}), generating a new one`);
//       tourCode = generateUniqueCode();
//       attempts++;
//     }
    
//     if (attempts >= maxAttempts) {
//       console.error(`Failed to generate unique tour code after ${maxAttempts} attempts`);
//       return next(CreateHttpError(500, "Failed to generate unique tour code"));
//     }
    
//     // Create a new tour
//     const newTour = new tourModel({
//       // Initialize reviews as an empty array to avoid MongoDB duplicate key errors
//       reviews: [],
//       title,
//       code: tourCode,
//       category: processedCategory,
//       excerpt: excerpt || title,
//       tourStatus: tourStatus || "Draft",
//       description,
//       coverImage,
//       file,
//       author: authReq.user?._id || authreq.user.id,
//       enquiry: convertToBoolean(enquiry),
//       outline,
//       include,
//       exclude,
//       itinerary: processedItinerary,
//       pricePerType: pricePerType || 'person',
//       minSize: processIntField(minSize, 1),
//       maxSize: processIntField(maxSize, 10),
//       groupSize: processIntField(groupSize, 1),
//       pricingOptionsEnabled: convertToBoolean(pricingOptionsEnabled),
//       pricingOptions: parsedPricingOptions,
//       // Tour dates fields
//       fixedDeparture: convertToBoolean(fixedDeparture),
//       multipleDates: convertToBoolean(multipleDates),
//       tourDates: processedTourDates,
//       // Add the structured discount object
//       discount: discountObject
//     });

//     // Process destination using helper function
//     const processedDestination = processDestinationData(destination);
//     if (processedDestination) {
//       newTour.destination = processedDestination;
//     }
    
//     // Process location using helper function if it exists
//     if (location) {
//       const processedLocation = processLocationData(location);
//       if (processedLocation) {
//         // Only assign if we have a valid location object
//         newTour.location = processedLocation as any; // Type assertion to fix compatibility issue
//       }
//     }
    
//     // Process gallery using helper function if it exists
//     if (gallery) {
//       newTour.gallery = processGalleryData(gallery);
//     }
    
//     // Process facts using helper function if they exist
//     if (facts) {
//       newTour.facts = processFactsData(facts);
//     }
    
//     // Process FAQs using helper function if they exist
//     if (faqs) {
//       newTour.faqs = processFaqsData(faqs);
//     }

//     // Save the tour
//     const savedTour = await newTour.save();
//     res.status(201).json({ tour: savedTour });
//   } catch (err: any) {
//     console.error("Failed to create tour:", err);
//     const errorMessage = err.message || 'Unknown error occurred';
//   res.status(500).json({ 
//     success: false, 
//     message: `Failed to create tour: ${errorMessage}`,
//     error: err.toString()
//   });
//   }
// };

// // Update a tour
// export const updateTour = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {

//   console.log("=== UPDATE TOUR CALLED ===");
//   console.log("Tour ID:", req.params.tourId);
//   console.log("req.body", req.body);
//   try {
//     // Cast req to AuthRequest to access user properties
//     const authReq = req as AuthRequest;
//     const userId = authReq.user?._id;
//     const tourId = req.params.tourId; // Changed from req.params.id to req.params.tourId
      
//     // Initialize empty updates object - we'll only add fields that are explicitly provided
//     const updates: any = {};
      
//     // Extract all tour fields using helper function
//     const {
//       title,
//       code,
//       excerpt,
//       description,
//       tourStatus,
//       basePrice,
//       price,
//       originalPrice,
//       // Pricing fields
//       pricePerType,
//       minSize,
//       maxSize,
//       groupSize,
//       // Boolean fields
//       discountEnabled,
//       discountDateRange,
//       discountPrice,
//       pricingOptionsEnabled,
//       // Tour dates fields
//       fixedDeparture,
//       multipleDates,
//       tourDates,
//       fixedDate,
//       dateRanges,
//       // Other fields
//       category,
//       outline,
//       itinerary,
//       include,
//       exclude,
//       facts,
//       faqs,
//       gallery,
//       map,
//       location,
//       author,
//       enquiry,
//       isSpecialOffer,
//       destination,
//       pricingOptions,
//       coverImage,
//       file,
//     } = extractTourFields(req);

//     // Only add fields to updates if they are explicitly provided in the request
      
//     // Handle basic string fields
//     if (title) updates.title = title;
    
//     // Handle code uniqueness for updates
//     if (code) {
//       const upperCaseCode = code.toUpperCase();
//       // Check if another tour already has this code (excluding the current tour)
//       const existingTour = await tourModel.findOne({ 
//         code: upperCaseCode,
//         _id: { $ne: tourId } // Exclude the current tour
//       });
      
//       if (existingTour) {
//         // Code already exists on another tour, generate a new one
//         console.log(`Tour code ${upperCaseCode} already exists, generating a new one`);
//         updates.code = generateUniqueCode();
//       } else {
//         // Code is unique, use it
//         updates.code = upperCaseCode;
//       }
//     }
    
//     if (excerpt) updates.excerpt = excerpt;
//     if (description) updates.description = description;
//     if (tourStatus) updates.tourStatus = tourStatus;
//     if (basePrice) updates.basePrice = parseFloat(String(basePrice));
//     if (include !== undefined) updates.include = include;
//     // Handle exclude which can be an array or string
//     if (exclude !== undefined) {
//       // If it's an array, join it with a separator or use the first item
//       if (Array.isArray(exclude)) {
//         updates.exclude = exclude.join('\n');
//       } else {
//         updates.exclude = exclude;
//       }
//     }
//     // Map is now part of location, not a separate field
      
//     // Handle numerical values - only if they exist in the request
//     // Process numeric fields using helper functions
//     if (price !== undefined) updates.price = processNumericField(price);
//     if (originalPrice !== undefined) updates.originalPrice = processNumericField(originalPrice);
//     if (basePrice !== undefined) updates.basePrice = processNumericField(basePrice);
    
//     // Special handling for minSize and maxSize to ensure validation rule (maxSize >= minSize) is satisfied
//     if (minSize !== undefined || maxSize !== undefined || (req.body.pricing && (req.body.pricing.minSize !== undefined || req.body.pricing.maxSize !== undefined))) {
//       // Get the current tour to access existing values if needed
//       const currentTour = await tourModel.findById(tourId);
//       if (!currentTour) {
//         return res.status(404).json({ success: false, message: 'Tour not found' });
//       }
      
//       console.log("currentTour", minSize, maxSize)
//       // Use current values as fallbacks
//       const currentMinSize = currentTour.minSize || 1;
//       const currentMaxSize = currentTour.maxSize || 10;
      
//       // Get values from both root level and nested pricing object
//       const rootMinSize = minSize !== undefined ? processIntField(minSize, 1) : undefined;
//       const rootMaxSize = maxSize !== undefined ? processIntField(maxSize, 10) : undefined;
      
//       const nestedMinSize = req.body.pricing?.minSize !== undefined ? 
//         processIntField(req.body.pricing.minSize, 1) : undefined;
//       const nestedMaxSize = req.body.pricing?.maxSize !== undefined ? 
//         processIntField(req.body.pricing.maxSize, 10) : undefined;
      
//       // Determine final values, prioritizing root level values
//       const newMinSize = rootMinSize !== undefined ? rootMinSize : 
//                          nestedMinSize !== undefined ? nestedMinSize : currentMinSize;
      
//       const newMaxSize = rootMaxSize !== undefined ? rootMaxSize : 
//                          nestedMaxSize !== undefined ? nestedMaxSize : currentMaxSize;
      
//       // Ensure maxSize is at least equal to minSize
//       const finalMaxSize = Math.max(newMaxSize, newMinSize);
      
//       // Update both root level and pricing object values to ensure consistency
//       updates.minSize = newMinSize;
//       updates.maxSize = finalMaxSize;
      
//       // If pricing object exists in updates, update its minSize/maxSize too
//       if (!updates.pricing) updates.pricing = {};
//       updates.pricing.minSize = newMinSize;
//       updates.pricing.maxSize = finalMaxSize;
      
//       console.log("Final tour size values:", { minSize: newMinSize, maxSize: finalMaxSize });
//     }
    
//     if (groupSize !== undefined) updates.groupSize = processIntField(groupSize, 1);

//     // Handle boolean values using convertToBoolean helper function
//     const booleanFields = {
//       pricingOptionsEnabled, fixedDeparture, multipleDates, enquiry, isSpecialOffer
//     };
    
//     // Process each boolean field that is defined in the request
//     Object.entries(booleanFields).forEach(([key, value]) => {
//       if (value !== undefined) {
//         updates[key as keyof typeof updates] = convertToBoolean(value);
//       }
//     });
      
//     // Handle string values - only if they exist in the request
//     if (pricePerType !== undefined) updates.pricePerType = pricePerType;
      
//     // Handle cover image - only if it exists in the request
//     if (coverImage) updates.coverImage = coverImage;
//     if (file) updates.file = file;
      
//     // Handle category and itinerary using extracted helper functions
//     if (category) {
//       updates.category = processCategoryData(category);
//     }
    
//     if (itinerary) {
//       updates.itinerary = processItineraryData(itinerary);
//     }
    
//     // Use the helper function to process pricing options
//     if (pricingOptions) {
//       updates.pricingOptions = processPricingOptions(pricingOptions);
//     }

//     // Handle dateRanges using the helper function
//     if (dateRanges) {
//       try {
//         updates.dateRanges = processDateRanges(dateRanges);
//       } catch (error) {
//         console.error("Error processing dateRanges:", error);
//         delete updates.dateRanges;
//       }
//     }

//     // Process tour dates using helper function
//     if (tourDates) {
//       try {
//         updates.tourDates = processTourDates(tourDates);
//       } catch (error) {
//         console.error("Error processing tourDates:", error);
//       }
//     }

//     // Handle fixedDate if it exists
//     if (fixedDate) {
//       try {
//         const parsedFixedDate = typeof fixedDate === 'string'
//           ? JSON.parse(fixedDate)
//           : fixedDate;
          
//         updates.fixedDate = {
//           dateRange: ensureDateRange(parsedFixedDate.dateRange || {})
//         };
//       } catch (error) {
//         console.error("Error processing fixedDate:", error);
//       }
//     }

//     // Handle other complex objects
//     if (outline) updates.outline = outline;
//     if (include) updates.include = include;
//     if (exclude) updates.exclude = exclude;
    
//     // Process facts using helper function if they exist
//     if (facts) {
//       const processedFacts = processFactsData(facts);
//       if (processedFacts) {
//         updates.facts = processedFacts;
//       }
//     }
    
//     // Process FAQs using helper function if they exist
//     if (faqs) {
//       const processedFaqs = processFaqsData(faqs);
//       if (processedFaqs) {
//         updates.faqs = processedFaqs;
//       }
//     }
    
//     // Process gallery using helper function if it exists
//     if (gallery) {
//       const processedGallery = processGalleryData(gallery);
//       if (processedGallery) {
//         updates.gallery = processedGallery;
//       }
//     }
    
//     // Process location using helper function if it exists
//     if (location) {
//       const processedLocation = processLocationData(location);
//       if (processedLocation) {
//         updates.location = processedLocation;
//       }
//     }

//     // Process discount information - only if any discount-related fields are provided
//     console.log('Discount fields received:', { discountEnabled, discountPrice, discountDateRange });
//     if (discountEnabled !== undefined || discountPrice !== undefined || discountDateRange !== undefined) {
//       const discount: {
//         discountEnabled: boolean;
//         discountPrice?: number;
//         discountDateRange?: {
//           from: Date;
//           to: Date;
//         };
//       } = {
//         discountEnabled: discountEnabled === 'true' || discountEnabled === true,
//       };
      
//       // Always add discount fields when provided, regardless of discountEnabled status
//       if (discountPrice !== undefined) {
//         discount.discountPrice = Number(discountPrice);
//       }

//       if (discountDateRange !== undefined) {
//         try {
//           const parsedRange =
//             typeof discountDateRange === 'string'
//               ? JSON.parse(discountDateRange)
//               : discountDateRange;

//           discount.discountDateRange = {
//             from: new Date(parsedRange.from),
//             to: new Date(parsedRange.to),
//           };
//         } catch (error) {
//           return res.status(400).json({ error: 'Invalid discountDateRange format' });
//         }
//       }
      
//       console.log('Processed discount object:', discount);
//       // Always save discount object to preserve all settings
//       updates.discount = discount;
//     }
    
//     // Process destination using helper function if it's provided
//     if (destination !== undefined) {
//       const processedDestination = processDestinationData(destination);
//       if (processedDestination) {
//         updates.destination = processedDestination;
//       }
//     }

//     // Check if updates is empty (no fields to update)
//     if (Object.keys(updates).length === 0) {
//       return res.status(400).json({ error: 'No valid fields to update' });
//     }

//     // Log the updates being applied
//     console.log("Applying updates:", Object.keys(updates));

//     // Find the tour
//     const tour = await tourModel.findById(tourId);
//     if (!tour) {
//       return next(CreateHttpError(404, "Tour not found"));
//     }

//     // Check if the user is authorized to update this tour
//     if (tour.author && Array.isArray(tour.author) && tour.author.length > 0) {
//       const authorIds = tour.author.map((id: mongoose.Types.ObjectId) => id.toString());
//       if (userId && !authorIds.includes(userId.toString())) {
//         return next(CreateHttpError(403, "Not authorized to update this tour"));
//       }
//     }

//     // Use findOne and save pattern instead of findByIdAndUpdate to ensure validation runs with full document context
//     const tourToUpdate = await tourModel.findById(tourId);
//     if (!tourToUpdate) {
//       return next(CreateHttpError(404, "Tour not found for update"));
//     }
    
//     // Ensure minSize/maxSize validation will pass
//     if (updates.minSize !== undefined && updates.maxSize !== undefined) {
//       // Both are being updated, make sure maxSize >= minSize
//       updates.maxSize = Math.max(updates.maxSize, updates.minSize);
//     } else if (updates.minSize !== undefined) {
//       // Only minSize is being updated, ensure it's <= existing maxSize
//       if (updates.minSize > tourToUpdate.maxSize) {
//         updates.maxSize = updates.minSize;
//       }
//     } else if (updates.maxSize !== undefined) {
//       // Only maxSize is being updated, ensure it's >= existing minSize
//       if (updates.maxSize < tourToUpdate.minSize) {
//         console.log("Warning: maxSize would be less than minSize, adjusting minSize");
//         updates.minSize = updates.maxSize;
//       }
//     }
    
//     // Apply all updates to the document
//     Object.keys(updates).forEach(key => {
//       // @ts-ignore - Dynamic property access
//       tourToUpdate[key] = updates[key];
//     });
    
//     // Save with validation
//     const updatedTour = await tourToUpdate.save();
    
//     console.log("Tour updated successfully using findOne/save pattern");

//     res.status(200).json({ 
//       tour: updatedTour,
//       message: "Tour updated successfully",
//       updatedFields: Object.keys(updates)
//     });
//   } catch (err: any) {
//     console.error("Failed to update tour:", err);
//     next(CreateHttpError(500, `Failed to update tour: ${err.message}`));
//   }
// };

// // Get all tours
// export const getAllTours = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     // Extract pagination parameters from query
//     const paginationParams: PaginationParams = {
//       page: req.query.page ? parseInt(req.query.page as string) : 1,
//       limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
//       sortBy: req.query.sortBy as string || 'updatedAt',
//       sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
//       search: req.query.search as string
//     };


//     // Build query to filter tours
//     const query: any = {};
    
//     // Filter by tour status if provided, otherwise default to 'published'
//     // Use case-insensitive regex to match status regardless of case
//     const tourStatus = req.query.tourStatus as string || 'Published';
//     if (tourStatus) {
//       query.tourStatus = { $regex: new RegExp(`^${tourStatus}$`, 'i') };
//     }
    
//     // Add any additional filters from query params
//     if (req.query.category) {
//       query['category.categoryId'] = req.query.category;
//     }
    

//     // Check what tour statuses exist in the database
//     const distinctStatuses = await tourModel.distinct('tourStatus');
    
//     // Count total tours with this status
//     const totalToursWithStatus = await tourModel.countDocuments(query);

//     // Use the paginate utility with the query to get filtered tours
//     const result = await paginate(tourModel, query, paginationParams);
//     // Populate author information for each tour
//     if (result.items.length > 0) {
//       await tourModel.populate(result.items, { path: 'author', select: 'name' });
//     }


//     // Return tours with pagination info
//     res.status(200).json({
//       tours: result.items,
//       pagination: {
//         currentPage: result.page,
//         totalPages: result.totalPages,
//         totalTours: result.totalItems,
//         hasNextPage: result.page < result.totalPages,
//         hasPrevPage: result.page > 1
//       }
//     });
//   } catch (err) {
//     console.error("Error in getAllTours:", err);
//     next(CreateHttpError(500, 'Failed to get tours'));
//   }
// };

// // Get user tours
// export const getUserTours = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     // Cast to AuthRequest to access user properties
//     const authReq = req as AuthRequest;
    
//     // Get pagination parameters from query
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const skip = (page - 1) * limit;

//     // Base query
//     let query = tourModel.find();

//     // Apply role-based filtering
//     if (authReq.roles !== 'admin') {
//       query = query.find({ author: authreq.user.id });
//     }

//     // Get total count for pagination
//     const totalTours = await tourModel.countDocuments(
//       authReq.roles === 'admin' ? {} : { author: authreq.user.id }
//     );

//     // Apply pagination and populate
//     const tours = await query
//       .populate("author", "name email roles")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     res.status(200).json({
//       success: true,
//       data: {
//         tours,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(totalTours / limit),
//           totalItems: totalTours,
//           itemsPerPage: limit
//         }
//       }
//     });
//   } catch (err) {
//     console.error('Error in getUserTours:', err);
//     next(CreateHttpError(500, 'Failed to get tours'));
//   }
// };


// export const getUserToursTitle = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const authReq = req as AuthRequest;
//     const userId = authreq.user.id;
//     const tours = await tourModel
//       .find({ author: userId })
//       .select('title')
//       .lean();
//     res.status(200).json({ success: true, data: tours });
//   } catch (err) {
//     console.error('Error in getUserToursTitle:', err);
//     next(CreateHttpError(500, 'Failed to get tours'));
//   }
// };
// export const getTour = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const tourId = req.params.tourId;
//   if (!mongoose.Types.ObjectId.isValid(tourId)) {
//     return res.status(400).json({ message: 'Invalid Tour ID' });
//   }

//   try {
//       const tour = await tourModel
//           .findOne({ _id: tourId })
//           // populate author field
//           .populate('author', 'name email roles')
//           .populate('reviews.user', 'name email roles');
          
//       if (!tour) {
//           return next(CreateHttpError(404, "tour not found."));
//       }

//       // Create a modified version of tour with fixed fact values for the response
//       const sanitizedTour = tour.toObject();
      
//       // Handle include/exclude conversion - converting between types in a sanitized object is safe
//       // We use type assertions to help TypeScript understand our intent
//       if (Array.isArray(sanitizedTour.include)) {
//         // @ts-ignore - This is a sanitized object, type conversion is intentional
//         sanitizedTour.include = sanitizedTour.include.join('\n');
//       }
      
//       if (Array.isArray(sanitizedTour.exclude)) {
//         // @ts-ignore - This is a sanitized object, type conversion is intentional
//         sanitizedTour.exclude = sanitizedTour.exclude.join('\n');
//       }
      
//       // Remove root-level map field which is now in location object
//       if ('map' in sanitizedTour) {
//         // Set to undefined instead of deleting - TypeScript safe and achieves the same result
//         (sanitizedTour as any).map = undefined;
//       }
      
//       // Fix the nested arrays and stringified objects in facts
//       if (sanitizedTour.facts && Array.isArray(sanitizedTour.facts)) {
//         sanitizedTour.facts = sanitizedTour.facts.map((fact: any) => {
//           // Fix double-nested arrays
//           let factValue = fact.value;
          
//           // If it's a double-nested array, flatten it
//           if (Array.isArray(factValue) && factValue.length === 1 && Array.isArray(factValue[0])) {
//             factValue = factValue[0];
//           }
          
//           // Handle Multi Select JSON strings
//           if (fact.field_type === 'Multi Select') {
//             // If the value is a string that looks like JSON, parse it
//             if (Array.isArray(factValue) && factValue.length === 1 && typeof factValue[0] === 'string' && factValue[0].startsWith('[')) {
//               try {
//                 factValue = JSON.parse(factValue[0]);
//               } catch (e) {
//                 console.error("Error parsing Multi Select JSON string in getTour:", e);
//                 factValue = [];
//               }
//             } else if (typeof factValue === 'string' && factValue.startsWith('[')) {
//               try {
//                 factValue = JSON.parse(factValue);
//               } catch (e) {
//                 console.error("Error parsing direct JSON string in getTour:", e);
//                 factValue = [];
//               }
//             }
//           }
          
//           return {
//             ...fact,
//             value: factValue
//           };
//         });
//       }
      
//       const breadcrumbs = [
//         {
//           label: sanitizedTour.title, // Use tour title for breadcrumb label
//           url: `/tours/${sanitizedTour._id}`, // URL to the tour
//         },
//       ];
      
//       res.status(200).json({ tour: sanitizedTour, breadcrumbs });
//   } catch (err) {
//       next(CreateHttpError(500, "Error while getting the tour."));
//   }
// };



// // Delete a tour
// export const deleteTour = async (req: Request, res: Response, next: NextFunction) => {
//   const tourId = req.params.tourId;

//   if (!mongoose.Types.ObjectId.isValid(tourId)) {
//     return res.status(400).json({ message: 'Invalid Tour ID' });
//   }

//   try {
//     const tour = await tourModel.findByIdAndDelete(tourId);

//     if (!tour) {
//       return next(CreateHttpError(404, "Tour not found."));
//     }

//     res.status(200).json({ message: "Tour deleted successfully" });
//   } catch (err: any) {
//     next(CreateHttpError(500, "Error while deleting the tour."));
//   }
// };

// // Get latest created tours
// export const getLatestTours = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const tours = await tourModel.find({ tourStatus: 'Published' })
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .populate("author", "name roles");
//     res.status(200).json({ tours });
//   } catch (err) {
//     next(CreateHttpError(500, 'Failed to get latest tours'));
//   }
// };



// // Get discounted tours
// export const getDiscountedTours = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const currentDate = new Date();
//     const { 
//       limit = 10, 
//       page = 1, 
//       minDiscount = 0, 
//       maxDiscount = 100,
//       sortBy = 'percentage', // percentage, price, date
//       sortOrder = 'desc' 
//     } = req.query;
    
//     // Convert query parameters to appropriate types
//     const limitNum = parseInt(limit as string);
//     const pageNum = parseInt(page as string);
//     const minDiscountNum = parseInt(minDiscount as string);
//     const maxDiscountNum = parseInt(maxDiscount as string);
//     const skip = (pageNum - 1) * limitNum;
    
//     // Build sort options
//     const sortOptions: any = {};
//     if (sortBy === 'percentage') {
//       sortOptions['discount.percentage'] = sortOrder === 'asc' ? 1 : -1;
//     } else if (sortBy === 'price') {
//       sortOptions['price'] = sortOrder === 'asc' ? 1 : -1;
//     } else if (sortBy === 'date') {
//       sortOptions['updatedAt'] = sortOrder === 'asc' ? 1 : -1;
//     }
    
//     // Build query
//     const query = {
//       tourStatus: 'Published',
//       'discount.isActive': true,
//       'discount.startDate': { $lte: currentDate },
//       'discount.endDate': { $gte: currentDate },
//       'discount.percentage': { 
//         $gte: minDiscountNum, 
//         $lte: maxDiscountNum 
//       }
//     };
    
//     // Get total count for pagination
//     const totalCount = await tourModel.countDocuments(query);
    
//     // Get tours with pagination
//     const tours = await tourModel.find(query)
//       .sort(sortOptions)
//       .skip(skip)
//       .limit(limitNum)
//       .populate("author", "name roles")
//       .populate("category.categoryId", "name");
    
//     // Calculate discounted prices for each tour
//     const toursWithDiscountInfo = tours.map(tour => {
//       const tourObject = tour.toJSON();
//       return tourObject;
//     });
    
//     res.status(200).json({ 
//       tours: toursWithDiscountInfo,
//       pagination: {
//         total: totalCount,
//         page: pageNum,
//         limit: limitNum,
//         pages: Math.ceil(totalCount / limitNum)
//       }
//     });
//   } catch (err: any) {
//     next(CreateHttpError(500, 'Failed to get discounted tours'));
//   }
// };

// // Get special offer tours
// export const getSpecialOfferTours = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const tours = await tourModel.find({
//       tourStatus: 'Published',
//       isSpecialOffer: true
//     })
//     .sort({ createdAt: -1 })
//     .limit(10)
//     .populate("author", "name roles");
    
//     res.status(200).json({ tours });
//   } catch (err) {
//     next(CreateHttpError(500, 'Failed to get special offer tours'));
//   }
// };

// // Search for tours
// export const searchTours = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     console.log('Search query parameters:', req.query);
//     const { keyword, name, destination, minPrice, maxPrice, rating, category } = req.query;
//     const searchText = keyword || name; // Use either keyword or name parameter for search
    
//     // Diagnostic: Check tour documents in the database to understand category structure
//     console.log('--------- TOUR DOCUMENT STRUCTURE DIAGNOSTICS ---------');
//     const sampleTour = await tourModel.findOne({ tourStatus: 'Published' });
//     if (sampleTour) {
//       console.log('Sample tour found:', sampleTour._id);
//       console.log('Category field type:', typeof sampleTour.category);
//       console.log('Is array:', Array.isArray(sampleTour.category));
//       console.log('Category content:', JSON.stringify(sampleTour.category, null, 2));
//     } else {
//       console.log('No published tours found for diagnostics');
//     }
//     console.log('-----------------------------------------------------');
    
//     // If a category filter is provided, also try to find a tour with that exact category
//     if (category) {
//       console.log(`Attempting to find tour with exact category value: ${category}`);
//       // Try different query approaches to see which matches
//       const tourWithExactCategory = await tourModel.findOne({
//         'category.value': category
//       });
      
//       console.log('Found tour with exact category match?', !!tourWithExactCategory);
//       if (tourWithExactCategory) {
//         console.log('Matching tour categories:', JSON.stringify(tourWithExactCategory.category, null, 2));
//       }
//     }
    
//     // Build query
//     const query: any = { tourStatus: 'Published' };
    
//     if (searchText) {
//       console.log(`Applying text search with term: ${searchText}`);
//       query.$or = [
//         { title: { $regex: searchText, $options: 'i' } },
//         { description: { $regex: searchText, $options: 'i' } },
//         { outline: { $regex: searchText, $options: 'i' } }
//       ];
//     }
    
//     if (destination) {
//       query.destination = destination;
//     }
    
//     if (minPrice) {
//       query.price = { $gte: parseFloat(minPrice as string) };
//     }
    
//     if (maxPrice) {
//       if (query.price) {
//         query.price.$lte = parseFloat(maxPrice as string);
//       } else {
//         query.price = { $lte: parseFloat(maxPrice as string) };
//       }
//     }
    
//     if (rating) {
//       query.averageRating = { $gte: parseFloat(rating as string) };
//     }
    
//     // Add category filtering if requested
//     if (category) {
//       const categoryValue = category as string;

//       // We'll try three different approaches to match categories
//       // This is a more flexible approach that should work regardless of exact schema structure
      
//       // Option 1: Using dot notation directly (more efficient MongoDB query)
//       query['category.value'] = categoryValue;
//       console.log('Added category filter using dot notation:', JSON.stringify({"category.value": categoryValue}));

//       // Log the complete query to make debugging easier
//       console.log('Final query:', JSON.stringify(query, null, 2));
//     }
    
//     console.log('Final query:', JSON.stringify(query, null, 2));
//     const tours = await tourModel.find(query)
//       .sort({ createdAt: -1 })
//       .populate("author", "name roles");
      
//     // Format the response to match the expected frontend structure
//     // Frontend expects: response.data.data.tours
//     res.status(200).json({
//       success: true,
//       data: {
//         tours
//       }
//     });
//   } catch (err) {
//     console.error('Search tours error:', err);
//     // Send more detailed error in development mode
//     const errorMessage = process.env.NODE_ENV === 'development' 
//       ? `Failed to search tours: ${err instanceof Error ? err.message : String(err)}` 
//       : 'Failed to search tours';
    
//     next(CreateHttpError(500, errorMessage));
//   }
// };


// // Get tours by rating
// export const getToursByRating = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const tours = await tourModel.find({ tourStatus: 'Published', reviewCount: { $gt: 0 } })
//       .sort({ averageRating: -1 })
//       .limit(10)
//       .populate("author", "name roles");
//     res.status(200).json({ tours });
//   } catch (err) {
//     next(CreateHttpError(500, 'Failed to get top-rated tours'));
//   }
// };

// // Increment tour view count
// export const incrementTourViews = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { tourId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(tourId)) {
//       return next(CreateHttpError(400, 'Invalid tour ID'));
//     }

//     // Increment the view counter
//     const result = await tourModel.findByIdAndUpdate(
//       tourId, 
//       { $inc: { views: 1 } },
//       { new: true }
//     );

//     if (!result) {
//       return next(CreateHttpError(404, 'Tour not found'));
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Tour view count incremented',
//       data: {
//         views: result.views
//       }
//     });
//   } catch (err: any) {
//     console.error('Error in incrementTourViews:', err);
//     next(CreateHttpError(500, 'Failed to increment view count'));
//   }
// };

// // Increment tour booking count
// export const incrementTourBookings = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { tourId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(tourId)) {
//       return next(CreateHttpError(400, 'Invalid tour ID'));
//     }

//     // Increment the booking counter
//     const result = await tourModel.findByIdAndUpdate(
//       tourId, 
//       { $inc: { bookingCount: 1 } },
//       { new: true }
//     );

//     if (!result) {
//       return next(CreateHttpError(404, 'Tour not found'));
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Tour booking count incremented',
//       data: {
//         bookingCount: result.bookingCount
//       }
//     });
//   } catch (err: any) {
//     console.error('Error in incrementTourBookings:', err);
//     next(CreateHttpError(500, 'Failed to increment booking count'));
//   }
// };
