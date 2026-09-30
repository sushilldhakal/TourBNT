/**
 * Business partner queries – own listings, capacity, and itinerary requests.
 * Mutations (update capacity, set override, respond to a request) are done
 * inline with useMutation in the dashboard components, matching the rest
 * of this codebase's convention (see ProfilePage/TourCategory).
 */

import { useQuery } from '@tanstack/react-query';
import {
    getMyBusinessPartners,
    getMyCapacity,
    getCapacityOverrides,
    getMyItineraryRequests,
    type ItineraryRequestStatus,
} from '@/lib/api/businessPartners';
import { getUnitTypes, getUnitTypeInventory } from '@/lib/api/unitTypes';
import { getAvailabilityBlocks } from '@/lib/api/availability';
import { queryKeys } from './queryKeys';

export function useMyBusinessPartners(enabled = true) {
    return useQuery({
        queryKey: queryKeys.businessPartners.mine(),
        queryFn: getMyBusinessPartners,
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}

export function useMyCapacity(businessPartnerId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.businessPartners.capacity(businessPartnerId ?? ''),
        queryFn: () => getMyCapacity(businessPartnerId!),
        enabled: enabled && !!businessPartnerId,
        staleTime: 60 * 1000,
    });
}

export function useCapacityOverrides(businessPartnerId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.businessPartners.capacityOverrides(businessPartnerId ?? ''),
        queryFn: () => getCapacityOverrides(businessPartnerId!),
        enabled: enabled && !!businessPartnerId,
        staleTime: 60 * 1000,
    });
}

export function useMyItineraryRequests(businessPartnerId: string | undefined, status?: ItineraryRequestStatus, enabled = true) {
    return useQuery({
        queryKey: queryKeys.businessPartners.requests(businessPartnerId ?? '', status),
        queryFn: () => getMyItineraryRequests(businessPartnerId!, { status }),
        enabled: enabled && !!businessPartnerId,
        staleTime: 30 * 1000,
    });
}

export function useUnitTypes(businessPartnerId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.businessPartners.unitTypes(businessPartnerId ?? ''),
        queryFn: () => getUnitTypes(businessPartnerId!),
        enabled: enabled && !!businessPartnerId,
        staleTime: 60 * 1000,
    });
}

export function useUnitTypeInventory(businessPartnerId: string | undefined, unitTypeId: string | undefined, from: string, to: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.businessPartners.unitTypeInventory(businessPartnerId ?? '', unitTypeId ?? '', from, to),
        queryFn: () => getUnitTypeInventory(businessPartnerId!, unitTypeId!, from, to),
        enabled: enabled && !!businessPartnerId && !!unitTypeId,
        staleTime: 30 * 1000,
    });
}

export function useAvailabilityBlocks(businessPartnerId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.businessPartners.availabilityBlocks(businessPartnerId ?? ''),
        queryFn: () => getAvailabilityBlocks(businessPartnerId!),
        enabled: enabled && !!businessPartnerId,
        staleTime: 60 * 1000,
    });
}
