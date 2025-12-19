// src/hooks/useDestination.ts
import { useQuery } from '@tanstack/react-query';
import { getSellerDestinations, getUserDestinations, getPendingDestinations, searchDestinations } from '@/lib/api/destinations';
import { DestinationTypes } from '@/lib/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/utils/roles';

// Hook for admin users - shows all destinations
export const useDestination = () => {
  return useQuery<DestinationTypes[]>({
    queryKey: ['seller-destinations'],
    queryFn: async () => {
      const response = await getSellerDestinations();
      
      // Handle direct array response
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle wrapped response format
      if (response?.success && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    },
    enabled: true,
  });
};

// Hook for regular users - shows user-specific destinations
export const useUserDestinations = () => {
  return useQuery<DestinationTypes[]>({
    queryKey: ['user-destinations'],
    queryFn: async () => {
      const response = await getUserDestinations();
      
      // Handle direct array response
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle wrapped response format
      if (response?.success && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    },
    enabled: true,
  });
};

export const usePendingDestinations = () => {
  return useQuery<DestinationTypes[]>({
    queryKey: ['pending-destinations'],
    queryFn: async () => {
      const response = await getPendingDestinations();
      
      // Handle direct array response
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle wrapped response format
      if (response?.success && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    },
    enabled: true,
  });
};

// Combined hook that automatically chooses the right data source based on user role
export const useDestinationsRoleBased = () => {
  const { user } = useAuth();
  const isAdminUser = isAdmin(user.roles);

  // Use admin destinations for admin users, user-specific destinations for others
  const adminDestinations = useDestination();
  const userDestinations = useUserDestinations();

  return isAdminUser ? adminDestinations : userDestinations;
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
