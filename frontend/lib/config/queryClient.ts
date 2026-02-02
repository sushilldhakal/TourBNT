import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient config.
 * Single source of truth for default options.
 */

export const queryClientConfig = {
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1,
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
            structuralSharing: true,
            networkMode: 'online' as const,
        },
        mutations: {
            retry: 1,
            retryDelay: 1000,
            networkMode: 'online' as const,
        },
    },
};

export function createQueryClient() {
    return new QueryClient(queryClientConfig);
}
