import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import {
    toursInfiniteOptions,
    approvedCategoriesOptions,
    approvedDestinationsOptions,
} from '@/lib/queries/publicQueryOptions';
import { ToursClient } from './ToursClient';

// Serve cached HTML and refresh it in the background at most once a minute (ISR).
export const revalidate = 60;

// First page of tours plus the filter lists are fetched on the server (in parallel) and handed
// to the client cache, so the grid renders with the HTML. Filters and infinite scroll stay
// client-side, using the same query definitions.
export default async function ToursPage() {
    const queryClient = new QueryClient();
    await Promise.allSettled([
        queryClient.prefetchInfiniteQuery(toursInfiniteOptions(12)),
        queryClient.prefetchQuery(approvedCategoriesOptions()),
        queryClient.prefetchQuery(approvedDestinationsOptions()),
    ]);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ToursClient />
        </HydrationBoundary>
    );
}
