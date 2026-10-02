import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { searchBusinessPartners, BusinessPartnerType } from '@/lib/api/businessPartners';
import { PartnerDirectoryClient } from './PartnerDirectoryClient';

// Serve cached HTML and refresh it in the background at most once a minute (ISR).
export const revalidate = 60;
// No pages are built ahead of time; each one is rendered on its first visit and then cached.
export async function generateStaticParams() {
    return [];
}

// Prefetch the unfiltered directory on the server so it renders with the HTML; the search box
// stays client-side. Key/args must match PartnerDirectoryClient's query.
export default async function PartnerDirectoryPage({ params }: { params: Promise<{ type: string }> }) {
    const { type } = await params;
    const queryClient = new QueryClient();
    await queryClient.prefetchQuery({
        queryKey: ['partners-directory', type, ''],
        queryFn: () => searchBusinessPartners({ type: type as BusinessPartnerType, q: undefined, limit: 24 }),
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <PartnerDirectoryClient />
        </HydrationBoundary>
    );
}
