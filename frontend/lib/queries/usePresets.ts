/**
 * Tour settings presets – pricing, date, pax, discount, content, itinerary, tour template.
 */

import { useQuery } from '@tanstack/react-query';
import {
    getPricingPresets,
    getDatePresets,
    getPaxPresets,
    getDiscountPresets,
    getContentPresets,
    getItineraryPresets,
    getTourTemplatePresets,
} from '@/lib/api/tourSettingsApi';
import { queryKeys } from './queryKeys';

export function usePricingPresets(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.presets.pricing(userId),
        queryFn: () => getPricingPresets(userId!),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useDatePresets(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.presets.date(userId),
        queryFn: () => getDatePresets(userId!),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function usePaxPresets(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.presets.pax(userId),
        queryFn: () => getPaxPresets(userId!),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useDiscountPresets(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.presets.discount(userId),
        queryFn: () => getDiscountPresets(userId!),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useContentPresets(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.presets.content(userId),
        queryFn: () => getContentPresets(userId!),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useItineraryPresets(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.presets.itinerary(userId),
        queryFn: () => getItineraryPresets(userId!),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useTourTemplatePresets(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.presets.tourTemplate(userId),
        queryFn: () => getTourTemplatePresets(userId!),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}
