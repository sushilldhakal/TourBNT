import { useQuery } from "@tanstack/react-query";
import { getAllDestinations, getSellerDestinations } from "@/lib/api/destinations";
import { useAuth } from "@/lib/hooks/useAuth";
import { DestinationTypes } from "@/lib/types";

/**
 * Shared hook for fetching destination data based on user role
 * This hook automatically selects the correct data source (admin vs seller)
 */
export const useDestinationData = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';

    // Helper function to normalize API response
    const normalizeDestinationResponse = (response: unknown): DestinationTypes[] => {
        if (Array.isArray(response)) {
            return response;
        }
        if (response && typeof response === 'object' && 'data' in response) {
            const data = (response as { data: unknown }).data;
            if (Array.isArray(data)) {
                return data;
            }
        }
        return [];
    };

    // Fetch destinations based on user role
    const { 
        data: globalDestinations, 
        isLoading: globalLoading, 
        isError: globalError 
    } = useQuery<DestinationTypes[]>({
        queryKey: ['destinations'],
        queryFn: async () => {
            const response = await getAllDestinations();
            return normalizeDestinationResponse(response);
        },
        enabled: isAdmin,
    });

    const { 
        data: sellerDestinations, 
        isLoading: sellerLoading, 
        isError: sellerError 
    } = useQuery<DestinationTypes[]>({
        queryKey: ['seller-destinations'],
        queryFn: async () => {
            const response = await getSellerDestinations();
            return normalizeDestinationResponse(response);
        },
        enabled: !isAdmin,
    });

    // Choose the appropriate data source
    const destinationsData = isAdmin ? globalDestinations : sellerDestinations;
    const isLoading = isAdmin ? globalLoading : sellerLoading;
    const isError = isAdmin ? globalError : sellerError;

    return {
        destinationsData,
        isAdmin,
        isLoading,
        isError,
    };
};

/**
 * Hook to get a single destination by ID
 */
export const useDestinationById = (destinationId: string) => {
    const { destinationsData, isLoading, isError } = useDestinationData();
    const destination = destinationsData?.find((dest: DestinationTypes) => dest._id === destinationId);
    
    return {
        destination,
        isLoading,
        isError,
    };
};

