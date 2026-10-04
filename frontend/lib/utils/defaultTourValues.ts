import type { EditorDeparture, EditorItineraryDay, EditorPricingOption } from '@/types/tourEditor';

/**
 * A new itinerary day for the tour editor.
 */
export const getDefaultItineraryItem = (item?: Partial<EditorItineraryDay>): EditorItineraryDay => ({
    // Stable id so itinerary-partner links (transport/accommodation/guide/meals)
    // survive drag-and-drop reordering of days.
    id: item?.id ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `day_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
    day: item?.day ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    destination: item?.destination ?? '',
    dateTime: item?.dateTime ?? new Date(),
    partners: item?.partners ?? [],
});

const newId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

/**
 * A new pricing option (tier) for the tour editor.
 */
export const getDefaultPricingOption = (option?: Partial<EditorPricingOption>): EditorPricingOption => ({
    id: option?.id ?? newId(),
    name: option?.name ?? '',
    category: option?.category ?? 'adult',
    customCategory: option?.customCategory ?? '',
    price: option?.price ?? 0,
    discount: option?.discount ?? { discountEnabled: false, type: 'percentage', value: 0 },
    paxRange: option?.paxRange ?? { min: 1, max: 10 },
});

/**
 * A new departure for the tour editor: a week from today.
 */
export const getDefaultDeparture = (departure?: Partial<EditorDeparture>): EditorDeparture => {
    const now = new Date();
    const inAWeek = new Date(now);
    inAWeek.setDate(now.getDate() + 7);
    return {
        id: departure?.id ?? newId(),
        label: departure?.label ?? 'New Departure',
        dateRange: departure?.dateRange ?? { from: now, to: inAWeek },
        days: departure?.days ?? 0,
        nights: departure?.nights ?? 0,
        isRecurring: departure?.isRecurring ?? false,
        recurrencePattern: departure?.recurrencePattern,
        recurrenceInterval: departure?.recurrenceInterval,
        recurrenceEndDate: departure?.recurrenceEndDate,
        pricingCategory: departure?.pricingCategory ?? [],
        capacity: departure?.capacity,
    };
};

/**
 * Days and nights spanned by a date range (a 3-day trip has 2 nights).
 */
export const calculateDaysNights = (from: Date, to: Date): { days: number; nights: number } => {
    const days = Math.ceil(Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    return { days, nights: Math.max(0, days - 1) };
};
