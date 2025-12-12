'use client';

import dynamic from 'next/dynamic';
import { Tour } from '@/lib/types';

// Dynamic imports for heavy client components to optimize bundle size
// These components are loaded on-demand to reduce initial bundle size

const TourGallery = dynamic(
    () => import('./TourGallery').then(mod => ({ default: mod.TourGallery })),
    {
        loading: () => (
            <div className="bg-card border rounded-lg p-4 sm:p-6">
                <div className="h-8 bg-muted rounded w-32 mb-4 animate-pulse" />
                <div className="aspect-video bg-muted rounded-lg animate-pulse" />
            </div>
        ),
    }
);

const TourTabs = dynamic(
    () => import('./TourTabs').then(mod => ({ default: mod.TourTabs })),
    {
        loading: () => (
            <div className="bg-card border rounded-lg p-4 sm:p-6">
                <div className="h-96 bg-muted rounded animate-pulse" />
            </div>
        ),
    }
);

const ReviewSystem = dynamic(
    () => import('./ReviewSystem').then(mod => ({ default: mod.ReviewSystem })),
    {
        loading: () => (
            <div className="bg-card border rounded-lg p-4 sm:p-6">
                <div className="h-8 bg-muted rounded w-32 mb-4 animate-pulse" />
                <div className="space-y-4">
                    <div className="h-32 bg-muted rounded animate-pulse" />
                    <div className="h-32 bg-muted rounded animate-pulse" />
                </div>
            </div>
        ),
    }
);

const BookingWidget = dynamic(
    () => import('./BookingWidget').then(mod => ({ default: mod.BookingWidget })),
    {
        loading: () => (
            <div className="sticky top-24">
                <div className="bg-card border rounded-lg overflow-hidden shadow-lg " style={{ marginTop: '-134px', zIndex: 20 }}>
                    <div className="h-16 bg-primary animate-pulse" />
                    <div className="p-6 space-y-4">
                        <div className="h-10 bg-muted rounded animate-pulse" />
                        <div className="h-10 bg-muted rounded animate-pulse" />
                        <div className="h-10 bg-muted rounded animate-pulse" />
                    </div>
                </div>
            </div>
        ),
    }
);

interface TourDetailClientProps {
    tour: Tour;
}

/**
 * Client-side wrapper for tour detail components
 * Uses dynamic imports to optimize bundle size
 */
export function TourDetailClient({ tour }: TourDetailClientProps) {
    return (
        <>
            {/* Tour Gallery */}
            <TourGallery
                coverImage={tour.coverImage}
                gallery={tour.gallery}
                title={tour.title}
            />

            {/* Tour Tabs with all content */}
            <TourTabs tour={tour} />

            {/* Review System */}
            <ReviewSystem tourId={tour._id} />
        </>
    );
}

interface BookingWidgetClientProps {
    tour: Tour;
}

/**
 * Client-side wrapper for booking widget
 * Separate component to allow independent loading
 */
export function BookingWidgetClient({ tour }: BookingWidgetClientProps) {
    return <BookingWidget tour={tour} />;
}
