import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTourById, getLatestTours } from '@/lib/api/tourApi';
import { Tour } from '@/lib/types';
import TourBanner from '@/components/tours/TourBanner';
import { TourHeader } from '@/components/tours/TourHeader';
import { TourFacts } from '@/components/tours/TourFacts';
import { TourDetailClient, BookingWidgetClient } from '@/components/tours/TourDetailClient';
import TourCard from '@/components/tours/TourCard';
import { TourPageLayout } from '@/components/tours/TourPageLayout';

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
        const response = await getTourById(id);
        const tour: Tour = response?.data?.tour || response?.data || response;

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

        // Create description from tour data
        const description = tour.description
            ? tour.description.replace(/<[^>]*>/g, '').substring(0, 160)
            : `Explore ${tour.title}${locationString ? ` in ${locationString}` : ''}. Book your adventure today!`;

        return {
            title: `${tour.title} | Tour Details`,
            description,
            openGraph: {
                title: tour.title,
                description,
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
            getTourById(id),
            getLatestTours(),
        ]);

        // Handle tour data
        if (tourResponse.status === 'fulfilled') {
            tour = tourResponse.value?.data?.tour || tourResponse.value?.data || tourResponse.value;

            if (!tour || !tour._id) {
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
                relatedTours = relatedResponse.value?.data?.tours || relatedResponse.value?.data || relatedResponse.value?.tours || [];

                // Filter out current tour and limit to 3
                if (Array.isArray(relatedTours)) {
                    relatedTours = relatedTours
                        .filter((t: Tour) => t._id !== tour?._id)
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
    } catch (error: any) {
        console.error('Critical error in tour page:', error);

        // If it's a notFound error, let it propagate
        if (error?.message?.includes('NEXT_NOT_FOUND')) {
            throw error;
        }

        // Otherwise, throw to error boundary
        throw new Error(
            error?.message ||
            'An unexpected error occurred while loading the tour. Please try again.'
        );
    }

    return (
        <div className="min-h-screen">
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
                    <div className="lg:col-span-1 order-first lg:order-last">
                        <BookingWidgetClient tour={tour} />
                    </div>
                </div>

                {/* Related Tours Section */}
                {relatedTours.length > 0 && (
                    <div className="mt-8 sm:mt-12 lg:mt-16">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">You May Also Like</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {relatedTours.map((relatedTour) => (
                                <TourCard
                                    key={relatedTour._id}
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
