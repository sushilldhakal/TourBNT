'use client';

import dynamic from 'next/dynamic';
import { Tour } from '@/types/types';
// Imported statically (not dynamic()): both render Radix Tabs, whose useId-based ids differ between
// the server render and a lazily-hydrated client tree, causing a hydration mismatch.
import { TourTabs } from './TourTabs';
import { BookingWidget } from './BookingWidget';

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

interface TourDetailClientProps {
    tour: Tour;
    /** Destination list from relatedData for resolving itinerary destination IDs to names */
    destinations?: { id: string; name: string }[];
}

/**
 * Client-side wrapper for tour detail components
 * Uses dynamic imports to optimize bundle size
 */
export function TourDetailClient({ tour, destinations }: TourDetailClientProps) {
    return (
        <>
            {/* Tour Gallery */}
            <TourGallery
                coverImage={tour.coverImage}
                gallery={tour.gallery}
                title={tour.title}
            />

            {/* Tour Tabs with all content */}
            <TourTabs tour={tour} destinations={destinations} />

            {/* Review System */}
            <ReviewSystem tourId={tour.id} />
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
