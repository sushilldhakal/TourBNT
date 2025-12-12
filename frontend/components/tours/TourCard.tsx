'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import RichTextRenderer from '@/components/RichTextRenderer';
import { Tour, Category, TourPricing } from '@/lib/types';

interface TourCardProps {
    tour: Tour;
    viewMode: 'grid' | 'list';
}

// Helper function to calculate tour pricing with discounts
const getTourPricing = (tour: Tour): TourPricing => {
    let originalPrice = tour.price || 0;
    let displayPrice = originalPrice;
    let hasDiscount = false;
    let discountPercentage = 0;

    // Check for sale price (highest priority)
    if (tour.saleEnabled && tour.salePrice) {
        hasDiscount = true;
        displayPrice = tour.salePrice;
        discountPercentage = Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
    }
    // Check pricing options with discounts
    else if (tour.pricingOptions && tour.pricingOptions.length > 0) {
        const firstOption = tour.pricingOptions[0];
        if (firstOption.price) {
            originalPrice = firstOption.price;
            displayPrice = firstOption.price;

            const discountData = firstOption.discount;
            if (discountData && discountData.discountDateRange) {
                const now = new Date();
                const discountStart = new Date(discountData.discountDateRange.from);
                const discountEnd = new Date(discountData.discountDateRange.to);

                // Validate discount is within date range
                if (now >= discountStart && now <= discountEnd) {
                    hasDiscount = true;

                    // Calculate percentage-based discount
                    if (discountData.percentageOrPrice && discountData.discountPercentage) {
                        discountPercentage = discountData.discountPercentage;
                        displayPrice = originalPrice - (originalPrice * discountPercentage / 100);
                    }
                    // Calculate fixed-price discount
                    else if (!discountData.percentageOrPrice && discountData.discountPrice) {
                        displayPrice = discountData.discountPrice;
                        discountPercentage = Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
                    }
                }
            }
        }
    }

    return { originalPrice, displayPrice, hasDiscount, discountPercentage };
};

export default function TourCard({ tour, viewMode }: TourCardProps) {
    const pricing = getTourPricing(tour);

    // Render grid view
    if (viewMode === 'grid') {
        return (
            <div className="bg-card rounded-lg overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow">
                {/* Grid View Image Section */}
                <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] overflow-hidden">
                    <Link href={`/tours/${tour._id}`}>
                        <Image
                            src={tour.coverImage}
                            alt={tour.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-300 hover:scale-105"
                            loading="lazy"
                        />
                    </Link>

                    {/* Discount Badge (top-left) */}
                    {pricing.hasDiscount && (
                        <div className="absolute top-2 left-2">
                            <Badge className="bg-green-600 text-white hover:bg-green-700">
                                -{pricing.discountPercentage}% OFF
                            </Badge>
                        </div>
                    )}

                    {/* Duration Badge (top-right) */}
                    {tour.duration && (
                        <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="bg-black/70 text-white hover:bg-black/80">
                                <Clock className="h-3 w-3 mr-1" />
                                {tour.duration}
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Grid View Details Section */}
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {/* Tour Title */}
                    <Link href={`/tours/${tour._id}`}>
                        <h3 className="text-base sm:text-lg font-semibold hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">
                            {tour.title}
                        </h3>
                    </Link>

                    {/* Availability Dates */}
                    {tour.dates && tour.dates.startDate && tour.dates.endDate && (
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                            <span className="truncate">
                                {new Date(tour.dates.startDate).toLocaleDateString()} - {new Date(tour.dates.endDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {/* Description with 2-line clamp */}
                    {tour.description && (
                        <div className="line-clamp-2 text-xs sm:text-sm text-muted-foreground overflow-hidden">
                            <RichTextRenderer content={tour.description} className="prose-sm" />
                        </div>
                    )}

                    {/* Category Badges */}
                    {tour.category && Array.isArray(tour.category) && tour.category.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {tour.category.slice(0, 3).map((cat, index) => {
                                const categoryName = typeof cat === 'string' ? cat : (cat as Category).name;
                                const categoryId = typeof cat === 'string' ? cat : (cat as Category)._id;
                                return (
                                    <Badge key={categoryId || index} variant="outline" className="text-xs">
                                        {categoryName}
                                    </Badge>
                                );
                            })}
                            {tour.category.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{tour.category.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Grid View Pricing Section */}
                    <div className="pt-2 sm:pt-3 border-t border-border space-y-2 sm:space-y-3">
                        {/* Star Rating with Review Count */}
                        <div className="flex items-center">
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`h-3 w-3 sm:h-4 sm:w-4 ${star <= (tour.averageRating || 0)
                                            ? 'text-primary fill-primary'
                                            : 'text-muted-foreground'
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] sm:text-xs text-muted-foreground ml-1.5 sm:ml-2 truncate">
                                ({tour.reviewCount || 0} {tour.reviewCount === 1 ? 'review' : 'reviews'})
                            </span>
                        </div>

                        {/* Pricing Display */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] sm:text-xs text-muted-foreground">From</span>
                                {pricing.hasDiscount ? (
                                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                        <span className="text-muted-foreground line-through text-xs sm:text-sm">
                                            ${pricing.originalPrice.toFixed(0)}
                                        </span>
                                        <span className="text-green-600 font-bold text-lg sm:text-xl">
                                            ${pricing.displayPrice.toFixed(0)}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-primary font-bold text-lg sm:text-xl">
                                        ${pricing.displayPrice.toFixed(0)}
                                    </span>
                                )}
                            </div>

                            {/* MORE INFO Button */}
                            <Link href={`/tours/${tour._id}`}>
                                <Button size="sm" variant="default" className="text-xs sm:text-sm whitespace-nowrap">
                                    MORE INFO
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render list view
    return (
        <div className="bg-card rounded-lg overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow">
            {/* List View - Horizontal Layout */}
            <div className="flex flex-col md:flex-row">
                {/* Image Column - 1/3 width on desktop */}
                <div className="relative w-full md:w-1/3 aspect-[16/10] md:aspect-auto md:h-[240px] overflow-hidden flex-shrink-0">
                    <Link href={`/tours/${tour._id}`}>
                        <Image
                            src={tour.coverImage}
                            alt={tour.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition-transform duration-300 hover:scale-105"
                            loading="lazy"
                        />
                    </Link>

                    {/* Discount Badge */}
                    {pricing.hasDiscount && (
                        <div className="absolute top-2 left-2">
                            <Badge className="bg-green-600 text-white hover:bg-green-700">
                                -{pricing.discountPercentage}% OFF
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Details Column - Flexible width */}
                <div className="flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {/* Title as clickable link */}
                    <Link href={`/tours/${tour._id}`}>
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold hover:text-primary transition-colors line-clamp-2">
                            {tour.title}
                        </h3>
                    </Link>

                    {/* Duration below title */}
                    {tour.duration && (
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                            <span>{tour.duration}</span>
                        </div>
                    )}

                    {/* Availability with calendar icon */}
                    {tour.dates && tour.dates.startDate && tour.dates.endDate && (
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                            <span className="truncate">
                                {new Date(tour.dates.startDate).toLocaleDateString()} - {new Date(tour.dates.endDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {/* Description with 3-line clamp */}
                    {tour.description && (
                        <div className="line-clamp-3 text-xs sm:text-sm text-muted-foreground overflow-hidden">
                            <RichTextRenderer content={tour.description} className="prose-sm" />
                        </div>
                    )}

                    {/* Category Badges */}
                    {tour.category && Array.isArray(tour.category) && tour.category.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {tour.category.slice(0, 3).map((cat, index) => {
                                const categoryName = typeof cat === 'string' ? cat : (cat as Category).name;
                                const categoryId = typeof cat === 'string' ? cat : (cat as Category)._id;
                                return (
                                    <Badge key={categoryId || index} variant="outline" className="text-xs">
                                        {categoryName}
                                    </Badge>
                                );
                            })}
                            {tour.category.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{tour.category.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Column - 1/4 width on desktop */}
                <div className="md:w-1/4 p-3 sm:p-4 flex flex-row md:flex-col items-center justify-between md:justify-center space-x-3 md:space-x-0 md:space-y-3 lg:space-y-4 border-t md:border-t-0 md:border-l border-border">
                    {/* Pricing at top */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">From</span>
                        {pricing.hasDiscount ? (
                            <div className="flex flex-col items-center">
                                <span className="text-muted-foreground line-through text-xs sm:text-sm">
                                    ${pricing.originalPrice.toFixed(0)}
                                </span>
                                <span className="text-green-600 font-bold text-xl sm:text-2xl">
                                    ${pricing.displayPrice.toFixed(0)}
                                </span>
                            </div>
                        ) : (
                            <span className="text-primary font-bold text-xl sm:text-2xl">
                                ${pricing.displayPrice.toFixed(0)}
                            </span>
                        )}
                    </div>

                    {/* Star Rating in middle */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-3 w-3 sm:h-4 sm:w-4 ${star <= (tour.averageRating || 0)
                                        ? 'text-primary fill-primary'
                                        : 'text-muted-foreground'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 whitespace-nowrap">
                            ({tour.reviewCount || 0})
                        </span>
                    </div>

                    {/* MORE INFO Button at bottom */}
                    <Link href={`/tours/${tour._id}`} className="w-auto md:w-full">
                        <Button size="sm" variant="default" className="w-full text-xs sm:text-sm whitespace-nowrap">
                            MORE INFO
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
