import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { HomePageContent } from '@/components/home/HomePageContent';
import { queryKeys } from '@/lib/queries/queryKeys';
import type { HomeFeed } from '@/lib/api/home';
import { SERVER_BACKEND_URL } from '@/lib/config/backendUrl';
import { jsonLdString, organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { mockCompanyInfo as company } from '@/lib/api/companyApi';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: { absolute: 'TourBNT | Book tours and treks in Nepal and beyond' },
    description: 'Compare and book guided tours, treks, safaris and cultural trips from trusted local operators. Real itineraries, clear prices, verified traveller reviews.',
    alternates: { canonical: '/' },
};

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
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: jsonLdString([
                        organizationJsonLd({ name: company.companyName, description: company.description, email: company.contactEmail }),
                        websiteJsonLd(company.companyName),
                    ]),
                }}
            />
            <HomePageContent />
        </HydrationBoundary>
    );
}
