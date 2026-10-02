import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { HomePageContent } from '@/components/home/HomePageContent';
import { queryKeys } from '@/lib/queries/queryKeys';
import type { HomeFeed } from '@/lib/api/home';
import { SERVER_BACKEND_URL } from '@/lib/config/backendUrl';

async function loadHomeFeed(): Promise<HomeFeed | null> {
    const base = SERVER_BACKEND_URL;
    try {
        const response = await fetch(`${base}/api/v1/home`, {
            next: { revalidate: 60 },
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return null;
        const json = await response.json();
        return (json?.data ?? null) as HomeFeed | null;
    } catch {
        return null;
    }
}

export default async function HomePage() {
    const queryClient = new QueryClient();
    const feed = await loadHomeFeed();
    if (feed) {
        queryClient.setQueryData(queryKeys.home.feed(), feed);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <HomePageContent />
        </HydrationBoundary>
    );
}
