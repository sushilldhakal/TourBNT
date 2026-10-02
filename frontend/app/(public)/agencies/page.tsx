import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { getAgencies } from '@/lib/api/tours';
import { AgenciesClient } from './AgenciesClient';

// Serve cached HTML and refresh it in the background at most once a minute (ISR).
export const revalidate = 60;

// First page is fetched on the server and handed to the client cache, so the list renders
// with the HTML; search and paging stay client-side. Key/args must match AgenciesClient's query.
export default async function AgenciesPage() {
    const queryClient = new QueryClient();
    await queryClient.prefetchQuery({
        queryKey: ['agencies', { q: '', page: 1 }],
        queryFn: () => getAgencies({ search: undefined, page: 1, limit: 24 }),
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <AgenciesClient />
        </HydrationBoundary>
    );
}
