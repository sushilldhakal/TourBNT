// src/hooks/useDestination.ts
import { useQuery } from '@tanstack/react-query';
import { getSellerDestinations, getUserDestinations, getPendingDestinations, searchDestinations } from '@/lib/api/destinationApi';
import { DestinationTypes } from '@/lib/types';

export const useDestination = () => {
  return useQuery<{
    success: boolean;
    data: DestinationTypes[];
    count: number;
  }>({
    queryKey: ['seller-destinations'],
    queryFn: getSellerDestinations,
    enabled: true, // Always enabled since authentication is handled by backend
  });
};

// New hook for user-specific destinations (includes user's personal isActive status)
export const useUserDestinations = () => {
  return useQuery<{
    success: boolean;
    data: DestinationTypes[];
    count: number;
  }>({
    queryKey: ['user-destinations'],
    queryFn: getUserDestinations,
    enabled: true, // Always enabled since authentication is handled by backend
  });
};

export const usePendingDestinations = () => {
  return useQuery<{
    success: boolean;
    data: DestinationTypes[];
    count: number;
  }>({
    queryKey: ['pending-destinations'],
    queryFn: getPendingDestinations,
    enabled: true, // Always enabled since authentication is handled by backend
  });
};

export const useSearchDestinations = (query: string, options?: { enabled?: boolean }) => {
  return useQuery<{
    success: boolean;
    data: DestinationTypes[];
    count: number;
  }>({
    queryKey: ['search-destinations', query],
    queryFn: () => searchDestinations({ query }),
    enabled: options?.enabled || false,
  });
};

export const useAllDestinations = () => {
  return useQuery<{
    success: boolean;
    data: DestinationTypes[];
    count: number;
  }>({
    queryKey: ['all-destinations'],
    queryFn: () => searchDestinations({}), // Empty search returns all destinations
    enabled: true,
  });
};
