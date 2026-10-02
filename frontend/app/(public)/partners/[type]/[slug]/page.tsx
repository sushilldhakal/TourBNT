import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { getBusinessPartnerBySlug, getToursFeaturingBusinessPartner } from '@/lib/api/businessPartners';
import { BusinessPartnerProfileClient } from './BusinessPartnerProfileClient';

// Serve cached HTML and refresh it in the background at most once a minute (ISR).
export const revalidate = 60;
// No pages are built ahead of time; each one is rendered on its first visit and then cached.
export async function generateStaticParams() {
    return [];
}

// Prefetch the business and its tours on the server so the profile renders with the HTML.
// Keys/args must match BusinessPartnerProfileClient's queries.
export default async function BusinessPartnerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const queryClient = new QueryClient();
    try {
        const business = await queryClient.fetchQuery({
            queryKey: ['business-partner', slug],
            queryFn: () => getBusinessPartnerBySlug(slug),
        });
        if (business?.id) {
            await queryClient.prefetchQuery({
                queryKey: ['business-partner-tours', business.id],
                queryFn: () => getToursFeaturingBusinessPartner(business.id),
            });
        }
    } catch {
        // Not found / API error: the client component shows its not-found state.
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <BusinessPartnerProfileClient />
        </HydrationBoundary>
    );
}
