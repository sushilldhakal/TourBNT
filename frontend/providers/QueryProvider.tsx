'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

/**
 * Enhanced Query Provider
 * Supports both public and dashboard functionality
 * Includes error handling and dev tools
 */

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Optimized caching strategy for performance
                        staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
                        gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache
                        refetchOnWindowFocus: false, // Prevent unnecessary refetches
                        refetchOnMount: false, // Use cached data on mount
                        refetchOnReconnect: false, // Don't refetch on reconnect
                        retry: 1, // Only retry once on failure
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                        // Enable structural sharing to prevent unnecessary re-renders
                        structuralSharing: true,
                        // Network mode - online only (don't use cache when offline)
                        networkMode: 'online',
                    },
                    mutations: {
                        retry: 1,
                        retryDelay: 1000,
                        // Network mode - online only
                        networkMode: 'online',
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </QueryClientProvider>
    );
}
