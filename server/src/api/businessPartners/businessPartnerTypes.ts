export type BusinessPartnerType = 'guide' | 'hotel' | 'guesthouse' | 'restaurant' | 'transport' | 'advertiser';

export interface BusinessAddress {
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** Type-specific extras stored in `businessPartners.details` JSONB. */
export interface BusinessPartnerDetails {
  [key: string]: unknown;
  // guide
  certifications?: string[];
  languages?: string[];
  // hotel / guesthouse
  roomCount?: number;
  amenities?: string[];
  // transport
  vehicleTypes?: string[];
  capacity?: number;
  // restaurant
  cuisine?: string[];
}

/** Maps an itinerary partner-link role to the business partner type(s) that satisfy it. */
export const ITINERARY_ROLE_TO_PARTNER_TYPES: Record<string, BusinessPartnerType[]> = {
  transport: ['transport'],
  accommodation: ['hotel', 'guesthouse'],
  guide: ['guide'],
  meals: ['restaurant'],
  other: ['guide', 'hotel', 'guesthouse', 'restaurant', 'transport', 'advertiser'],
};
