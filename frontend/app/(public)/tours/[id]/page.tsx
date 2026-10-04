import { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getTourById, getLatestTours } from '@/lib/api/tours';
import type { Tour } from '@/types/types';
import TourBanner from '@/components/tours/TourBanner';
import { TourHeader } from '@/components/tours/TourHeader';
import { TourFacts } from '@/components/tours/TourFacts';
import { TourDetailClient, BookingWidgetClient } from '@/components/tours/TourDetailClient';
import TourCard from '@/components/tours/TourCard';
import { TourPageLayout } from '@/components/tours/TourPageLayout';
import { RelevantAdSlot } from '@/components/ads/RelevantAdSlot';
import { richToPlainText, jsonLdString, tourJsonLd, breadcrumbJsonLd } from '@/lib/seo';

// generateMetadata and the page both need the tour: cache() makes that one API call per
// request instead of two (the detail endpoint also counts a view, which was counted twice).
const getTourOnce = cache((id: string) => getTourById(id));

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

/**
 * Generate metadata for SEO
 * Requirements: 8.6
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        const { id } = await params;
        const response = await getTourOnce(id);
        const tour: Tour = response?.tour;

        if (!tour) {
            return {
                title: 'Tour Not Found',
                description: 'The requested tour could not be found.',
            };
        }

        // Extract location string for description
        let locationString = '';
        if (tour.location) {
            if (typeof tour.location === 'string') {
                locationString = tour.location;
            } else {
                const parts: string[] = [];
                if (tour.location.city) parts.push(tour.location.city);
                if (tour.location.country) parts.push(tour.location.country);
                locationString = parts.join(', ');
            }
        }

        // The description is stored as editor JSON, so build a plain-text summary: the seller's excerpt first,
        // then the start of the description. (Stripping HTML tags used to leave raw JSON in link previews.)
        const description =
            richToPlainText((tour as { excerpt?: string }).excerpt, 160) ||
            richToPlainText(tour.description, 160) ||
            `Explore ${tour.title}${locationString ? ` in ${locationString}` : ''}. Book your adventure today!`;

        return {
            title: `${tour.title} | TourBNT`,
            description,
            alternates: { canonical: `/tours/${tour.id}` },
            openGraph: {
                title: tour.title,
                description,
                url: `/tours/${tour.id}`,
                images: tour.coverImage ? [tour.coverImage] : [],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: tour.title,
                description,
                images: tour.coverImage ? [tour.coverImage] : [],
            },
        };
    } catch (error) {
        return {
            title: 'Tour Details',
            description: 'View tour details and book your next adventure.',
        };
    }
}

/**
 * Single Tour Detail Page - Server Component
 * 
 * Requirements: 1.1, 1.4, 8.1, 8.2, 8.3, 8.5, 8.6, 9.1, 10.5, 10.6
 * 
 * Features:
 * - Server-side data fetching for initial tour data
 * - SEO-optimized with metadata generation
 * - Two-column layout (2/3 content, 1/3 booking widget)
 * - Responsive single-column layout on mobile
 * - Comprehensive tour information display
 * - Related tours section
 * - Error handling with user-friendly messages
 * - Loading states with skeleton placeholders
 * - Performance optimizations with parallel data fetching
 */
export default async function SingleTourPage({ params }: PageProps) {
    let tour: Tour | null = null;
    let relatedTours: Tour[] = [];

    try {
        // Await params in Next.js 15
        const { id } = await params;

        // Validate tour ID parameter
        if (!id || typeof id !== 'string') {
            console.error('Invalid tour ID parameter:', id);
            notFound();
        }

        // Parallel data fetching for better performance
        const [tourResponse, relatedResponse] = await Promise.allSettled([
            getTourOnce(id),
            getLatestTours(),
        ]);

        // Handle tour data
        if (tourResponse.status === 'fulfilled') {
            tour = tourResponse.value?.tour;

            if (!tour || !tour.id) {
                console.error('Tour not found or invalid response:', id);
                notFound();
            }
        } else {
            console.error('Error fetching tour data:', tourResponse.reason);

            // Handle specific error cases
            if (tourResponse.reason?.response?.status === 404 || tourResponse.reason?.status === 404) {
                notFound();
            }

            // For other errors, throw to be caught by error boundary
            throw new Error(
                tourResponse.reason?.message ||
                'Failed to load tour details. Please try again later.'
            );
        }

        // Handle related tours (non-critical, continue on failure)
        if (relatedResponse.status === 'fulfilled') {
            try {
                // /tours/latest answers with the list itself or wrapped in { data } / { tours }.
                const latest = relatedResponse.value as Tour[] | { data?: Tour[] | { tours?: Tour[] }; tours?: Tour[] } | undefined;
                const wrapped = Array.isArray(latest) ? undefined : latest;
                relatedTours = Array.isArray(latest)
                    ? latest
                    : (Array.isArray(wrapped?.data) ? wrapped.data : wrapped?.data?.tours) || wrapped?.tours || [];

                // Filter out current tour and limit to 3
                if (Array.isArray(relatedTours)) {
                    relatedTours = relatedTours
                        .filter((t: Tour) => t.id !== tour?.id)
                        .slice(0, 3);
                } else {
                    relatedTours = [];
                }
            } catch (error) {
                console.error('Error processing related tours:', error);
                relatedTours = [];
            }
        } else {
            console.error('Error fetching related tours:', relatedResponse.reason);
            // Continue without related tours - this is not critical
            relatedTours = [];
        }
    } catch (error) {
        console.error('Critical error in tour page:', error);

        // If it's a notFound error, let it propagate
        if (error instanceof Error && error.message.includes('NEXT_NOT_FOUND')) {
            throw error;
        }

        // Otherwise, throw to error boundary
        throw new Error(
            (error instanceof Error && error.message) ||
            'An unexpected error occurred while loading the tour. Please try again.'
        );
    }

    return (
        <div className="min-h-screen">
            {/* Structured data: price and rating can show directly in search results. */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: jsonLdString([
                        tourJsonLd(tour as Parameters<typeof tourJsonLd>[0]),
                        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Tours', path: '/tours' }, { name: tour.title, path: `/tours/${tour.id}` }]),
                    ]),
                }}
            />
            {/* Full-width banner */}
            <TourBanner tour={tour} />

            {/* Main content container with layout toggle */}
            <TourPageLayout>
                {/* Two-column layout: 2/3 for content, 1/3 for booking */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    {/* Main Content Column (2/3 width on desktop) */}
                    <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                        {/* Tour Header with title, code, and categories */}
                        <TourHeader
                            title={tour.title}
                            code={tour.code}
                            categories={tour.category}
                        />

                        {/* Tour Facts */}
                        {tour.facts && tour.facts.length > 0 && (
                            <TourFacts facts={tour.facts} />
                        )}

                        {/* Tour Detail Client Components (dynamically loaded) */}
                        <TourDetailClient tour={tour} />
                    </div>

                    {/* Sidebar Column (1/3 width on desktop) - appears below content on mobile */}
                    <div className="lg:col-span-1 order-first lg:order-last space-y-6">
                        <BookingWidgetClient tour={tour} />
                        {/* The server works out every place this tour touches (main destination,
                            itinerary stops, linked businesses' towns) and its tour types. */}
                        <RelevantAdSlot placementSlot="tour_sidebar" tourId={tour.id} limit={3} />
                    </div>
                </div>

                {/* Related Tours Section */}
                {relatedTours.length > 0 && (
                    <div className="mt-8 sm:mt-12 lg:mt-16">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">You May Also Like</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {relatedTours.map((relatedTour) => (
                                <TourCard
                                    key={relatedTour.id}
                                    tour={relatedTour}
                                    viewMode="grid"
                                />
                            ))}
                        </div>
                    </div>
                )}
            </TourPageLayout>
        </div>
    );
}
