import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { Tour, Location } from '@/lib/types';

interface TourBannerProps {
    tour: Tour;
}

/**
 * TourBanner - Server Component
 * 
 * Displays a full-width banner with the tour cover image, title, and location.
 * Includes breadcrumb navigation below the banner.
 * 
 * @param tour - The tour object containing title, coverImage, and location
 * 
 * Requirements: 1.2, 1.3
 * - Full-width banner with cover image and overlay
 * - Tour title and location centered
 * - Breadcrumb navigation: Home > Tours > [Tour Title]
 */
export default function TourBanner({ tour }: TourBannerProps) {
    // Extract location information
    const getLocationString = (): string => {
        if (!tour.location) return '';

        if (typeof tour.location === 'string') {
            return tour.location;
        }

        const location = tour.location as Location;
        const parts: string[] = [];

        if (location.city) parts.push(location.city);
        if (location.country) parts.push(location.country);

        return parts.join(', ') || location.name || location.formatted_address || '';
    };

    const locationString = getLocationString();

    return (
        <>
            {/* Full-width banner with cover image */}
            <header className="relative w-full h-[300px] md:h-[400px] bg-muted" role="banner">
                {/* Cover image */}
                <Image
                    src={tour.coverImage}
                    alt={`${tour.title} cover image`}
                    fill
                    className="object-cover"
                    priority
                />

                {/* Overlay pattern */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" aria-hidden="true" />

                {/* Centered content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                        {tour.title}
                    </h1>
                    {locationString && (
                        <p className="text-lg md:text-xl text-white/90 drop-shadow-md">
                            {locationString}
                        </p>
                    )}
                </div>
            </header>

            {/* Breadcrumb navigation below banner */}
            <div className="border-b border-border bg-background">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
                        <ol className="flex items-center space-x-2">
                            <li>
                                <Link
                                    href="/"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Home
                                </Link>
                            </li>
                            <li aria-hidden="true">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </li>
                            <li>
                                <Link
                                    href="/tours"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Tours
                                </Link>
                            </li>
                            <li aria-hidden="true">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </li>
                            <li aria-current="page">
                                <span className="text-foreground font-medium line-clamp-1">
                                    {tour.title}
                                </span>
                            </li>
                        </ol>
                    </nav>
                </div>
            </div>
        </>
    );
}
