'use client';

import { useTourQuery, useLatestTours } from '@/lib/queries';
import { Tour } from '@/types/types';
import type { SimilarTourRelated } from '@/types/types';
import TourBanner from '@/components/tours/TourBanner';
import { TourHeader } from '@/components/tours/TourHeader';
import { TourFacts } from '@/components/tours/TourFacts';
import { TourDetailClient, BookingWidgetClient } from '@/components/tours/TourDetailClient';
import TourCard from '@/components/tours/TourCard';
import { TourPageLayout } from '@/components/tours/TourPageLayout';
import { TourDetailSkeleton } from '@/components/tours/TourDetailSkeleton';
import { TourNotFound } from '@/components/tours/TourNotFound';

const PUBLIC_TOUR_INCLUDE = ['author', 'destination', 'destinations', 'categories', 'similarTours', 'pricingInsights', 'availability'] as const;

interface SingleTourPageClientProps {
    tourId: string;
}

export function SingleTourPageClient({ tourId }: SingleTourPageClientProps) {
    const {
        data: tourPayload,
        isLoading: isLoadingTour,
        isError: isTourError,
    } = useTourQuery(tourId, !!tourId, [...PUBLIC_TOUR_INCLUDE]);

    const { data: latestData } = useLatestTours();

    const payload = (tourPayload as { data?: { tour?: Tour; relatedData?: unknown }; tour?: Tour; relatedData?: unknown })?.data ?? tourPayload;
    const tour: Tour | null = payload?.tour
        ? (payload.tour as unknown as Tour)
        : tourPayload && (tourPayload as unknown as Tour).id
            ? (tourPayload as unknown as Tour)
            : null;

    const similarFromApi = (payload?.relatedData?.similarTours ?? []) as SimilarTourRelated[];
    const toursList = Array.isArray(latestData)
        ? latestData
        : (latestData as { data?: { tours?: Tour[] }; tours?: Tour[] })?.data?.tours ??
        (latestData as { tours?: Tour[] })?.tours ??
        [];
    const relatedTours: Tour[] =
        similarFromApi.length > 0
            ? similarFromApi.map((t) => ({
                  id: t.id,
                  title: t.title,
                  coverImage: t.coverImage,
                  price: t.price,
                  averageRating: t.averageRating,
                  reviewCount: t.reviewCount,
                  tourStatus: t.tourStatus,
              } as Tour))
            : tour
                ? toursList.filter((t: Tour) => t.id !== tour.id).slice(0, 3)
                : [];

    if (isLoadingTour) {
        return <TourDetailSkeleton />;
    }

    if (isTourError || !tour?.id) {
        return <TourNotFound />;
    }

    return (
        <div className="min-h-screen">
            <TourBanner tour={tour} />

            <TourPageLayout>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                        <TourHeader
                            title={tour.title}
                            code={tour.code}
                            categories={tour.category as Parameters<typeof TourHeader>[0]['categories']}
                        />

                        {tour.facts && tour.facts.length > 0 && (
                            <TourFacts facts={tour.facts as Parameters<typeof TourFacts>[0]['facts']} />
                        )}

                        <TourDetailClient
                            tour={tour}
                            destinations={(payload?.relatedData as { destinations?: { id: string; name: string }[] } | undefined)?.destinations}
                        />
                    </div>

                    <div className="lg:col-span-1 order-first lg:order-last">
                        <BookingWidgetClient tour={tour} />
                    </div>
                </div>

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
