/**
 * The tour editor's form values (TourProvider's react-hook-form state).
 *
 * This is the shape the editor tabs read and write, which is not the API's shape: the API keeps pricing in
 * flat columns, dates as `tourDates`, the itinerary as a flat list, and discounts as percentageOrPrice /
 * discountPercentage / discountPrice. TourProvider converts in both directions — `tourToEditorValues` when a
 * tour loads and `onSubmit` when it saves — and nothing else should.
 */
import type { JSONContent } from 'novel';
import type { RecurrencePattern } from './types';

/** Rich text as the novel editor produces it. */
export type RichTextDoc = JSONContent;

export interface EditorDateRange {
    from: Date;
    to: Date;
}

export type ItineraryPartnerRole = 'transport' | 'accommodation' | 'guide' | 'meals' | 'other';

export interface EditorItineraryPartner {
    role: ItineraryPartnerRole;
    businessPartnerId?: string;
    name: string;
    notes?: string;
    /** "HH:mm": a sitting for meals, or the start of a guide's engagement window. */
    time?: string;
    /** "HH:mm": the end of a guide's engagement window. */
    endTime?: string;
    /** Rooms / seats / covers asked for (distinct from traveller headcount). */
    unitsRequested?: number;
    /** Free-text unit, e.g. "Deluxe room". */
    unitType?: string;
    /** One of the partner's configured unit types, when picked from its list. */
    unitTypeId?: string;
    /** No business is assigned. Any free approved business of this role can apply, and the seller picks one. */
    openForAll?: boolean;
}

export interface EditorItineraryDay {
    /** Stable per-day id (partner links hang off it); absent on days added in this session. */
    id?: string;
    day: string;
    title: string;
    description: string;
    destination?: string;
    date?: Date | string;
    dateTime?: Date;
    partners?: EditorItineraryPartner[];
}

export interface EditorItinerary {
    /** options[0] holds the days (the editor once supported alternative itineraries). */
    options: EditorItineraryDay[][];
}

/** A category in the editor's multi-select ({ label, value }), keeping id/name for saving. */
export interface EditorCategory {
    label: string;
    value: string;
    disable?: boolean;
    id?: string;
    name?: string;
    isActive?: boolean;
}

export type FactFieldType = 'Plain Text' | 'Single Select' | 'Multi Select';
export type FactValue = string | string[] | Array<{ label?: string; value?: string; disable?: boolean }>;

export interface EditorFact {
    /** The seller's master fact this copy came from. */
    factId?: string;
    /** Display name (the master fact's name). */
    name?: string;
    title?: string;
    icon?: string;
    field_type: FactFieldType;
    value: FactValue;
}

export interface EditorFaq {
    faqId?: string;
    question: string;
    answer: string;
}

export interface EditorGalleryItem {
    /** Client-only key for items added in this session; stripped on save. */
    tempId?: string;
    _id?: string;
    image: string;
    caption?: string;
}

/** A discount as the editor edits it: a type and one value. */
export interface EditorDiscount {
    discountEnabled: boolean;
    type: 'percentage' | 'price';
    /** Percent when type is 'percentage', an amount when 'price'. */
    value: number;
    dateRange?: EditorDateRange;
    discountCode?: string;
    description?: string;
}

export type PricingCategory = 'adult' | 'child' | 'senior' | 'student' | 'custom';

export interface EditorPricingOption {
    id: string;
    name: string;
    category: PricingCategory;
    customCategory?: string;
    price: number;
    isActive?: boolean;
    paxRange: { min: number; max: number };
    discount?: EditorDiscount;
}

export interface EditorPaymentOptions {
    fullPaymentEnabled: boolean;
    depositEnabled: boolean;
    depositPercentage: number;
    payOnArrivalEnabled: boolean;
}

export interface EditorPricing {
    price: number;
    originalPrice?: number;
    basePrice?: number;
    pricePerPerson: boolean;
    minSize: number;
    maxSize: number;
    groupSize?: number;
    pricingOptionsEnabled: boolean;
    pricingOptions: EditorPricingOption[];
    discount: EditorDiscount;
    /** Prices stop changing after this date. */
    priceLockDate?: Date;
    paymentOptions: EditorPaymentOptions;
}

export type ScheduleType = 'flexible' | 'fixed' | 'multiple';

export interface EditorDeparture {
    id: string;
    label: string;
    dateRange?: EditorDateRange;
    days?: number;
    nights?: number;
    isRecurring: boolean;
    recurrencePattern?: RecurrencePattern;
    recurrenceInterval?: number;
    recurrenceEndDate?: Date;
    /** Pricing option ids that apply to this departure. */
    pricingCategory: string[];
    capacity?: number;
}

export interface EditorDates {
    scheduleType: ScheduleType;
    days: number;
    nights: number;
    /** The fixed date range (scheduleType 'fixed'), or the bookable window (flexible). */
    dateRange?: EditorDateRange;
    isRecurring: boolean;
    recurrencePattern?: RecurrencePattern;
    recurrenceInterval?: number;
    recurrenceEndDate?: Date;
    pricingCategory: string[];
    departures: EditorDeparture[];
    capacity?: number;
}

export interface EditorLocation {
    map?: string;
    zip?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
}

export interface TourEditorValues {
    title: string;
    code: string;
    excerpt: string;
    tourStatus: 'Draft' | 'Published' | 'Archived';
    description?: RichTextDoc | string;
    coverImage: string;
    /** A brochure / PDF URL. */
    file?: string;
    /** The itinerary overview shown above the days (stored on the tour as `outline`). */
    outline?: RichTextDoc | string;
    enquiry: boolean;
    destination?: string;
    location?: EditorLocation;
    map?: string;
    include?: RichTextDoc | string;
    exclude?: RichTextDoc | string;

    category: EditorCategory[];
    gallery: EditorGalleryItem[];
    facts: EditorFact[];
    faqs: EditorFaq[];
    itinerary: EditorItinerary;
    pricing: EditorPricing;
    dates: EditorDates;

    // Presets applied in the pricing tab (kept so the selects show them).
    paxPresetId?: string;
    discountPresetId?: string;
    pricingPresetIds?: string[];
}
