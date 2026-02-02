/**
 * Tour settings presets – pricing, pax, discount.
 */

import { useQuery } from '@tanstack/react-query';
import { getPricingPresets, getPaxPresets, getDiscountPresets } from '@/lib/api/tourSettingsApi';
import { queryKeys } from './queryKeys';

export function usePricingPresets(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.presets.pricing(userId),
        queryFn: () => getPricingPresets(userId!),
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
