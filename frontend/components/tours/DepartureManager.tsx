'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Departure,
    PricingOption,
    TourDates,
} from '@/lib/types';
import {
    formatPrice,
    formatDate,
    calculateDeparturePrice,
    generateDepartureInstances,
} from '@/lib/tourUtils';

interface DepartureManagerProps {
    tourDates: TourDates;
    basePrice: number;
    salePrice?: number;
    saleEnabled?: boolean;
    pricingOptions?: PricingOption[];
    pricingGroups?: { label: string; options: PricingOption[] }[];
    pricePerPerson?: boolean;
    onBookNow?: (departure: Departure) => void;
}

export function DepartureManager({
    tourDates,
    basePrice,
    salePrice,
    saleEnabled,
    pricingOptions,
    pricingGroups,
    pricePerPerson = true,
    onBookNow,
}: DepartureManagerProps) {
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [currentPage, setCurrentPage] = useState(1);
    const departuresPerPage = 6;

    // Generate all departure instances (including recurring)
    const allDepartures = useMemo(() => {
        return generateDepartureInstances(tourDates);
    }, [tourDates]);

    // Get unique months from all departures
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        allDepartures.forEach(dep => {
            const date = new Date(dep.dateRange.from);
            if (!isNaN(date.getTime())) {
                months.add(`${date.getFullYear()}-${date.getMonth()}`);
            }
        });
        return Array.from(months).sort();
    }, [allDepartures]);

    // Filter departures by selected month
    const filteredDepartures = useMemo(() => {
        return allDepartures.filter(dep => {
            const depDate = new Date(dep.dateRange.from);
            if (isNaN(depDate.getTime())) return false;

            return (
                depDate.getFullYear() === selectedMonth.getFullYear() &&
                depDate.getMonth() === selectedMonth.getMonth()
            );
        });
    }, [allDepartures, selectedMonth]);

    // Paginate departures
    const paginatedDepartures = useMemo(() => {
        const start = (currentPage - 1) * departuresPerPage;
        return filteredDepartures.slice(start, start + departuresPerPage);
    }, [filteredDepartures, currentPage]);

    const totalPages = Math.ceil(filteredDepartures.length / departuresPerPage);

    // Handle month navigation
    const handlePreviousMonth = () => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        setSelectedMonth(newDate);
        setCurrentPage(1);
    };

    const handleNextMonth = () => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        setSelectedMonth(newDate);
        setCurrentPage(1);
    };

    // Handle book now
    const handleBookNow = (departure: Departure) => {
        if (onBookNow) {
            onBookNow(departure);
        }

        // Scroll to booking widget
        const bookingWidget = document.getElementById('booking-widget');
        if (bookingWidget) {
            bookingWidget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Handle flexible schedule display
    if (tourDates.scheduleType === 'flexible') {
        return (
            <div className="space-y-4">
                <div className="bg-muted/50 border border-dashed rounded-lg p-4 sm:p-6 text-center">
                    <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Flexible Schedule</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                        This tour has a flexible schedule. You can choose your preferred dates when booking.
                    </p>
                    {tourDates.defaultDateRange && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Available from {formatDate(tourDates.defaultDateRange.from)} to{' '}
                            {formatDate(tourDates.defaultDateRange.to)}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // No departures available
    if (allDepartures.length === 0) {
        return (
            <div className="bg-muted/50 border border-dashed rounded-lg p-4 sm:p-6 text-center">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">No Departures Available</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                    There are currently no scheduled departures for this tour.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6" role="region" aria-label="Departure dates selection">
            {/* Month Selector */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 sm:p-4" role="navigation" aria-label="Month navigation">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousMonth}
                    disabled={availableMonths.length === 0}
                    className="h-9 w-9 sm:h-10 sm:w-10"
                    aria-label="Previous month"
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>

                <div className="text-center">
                    <h3 className="text-base sm:text-lg font-semibold" id="current-month-label">
                        {selectedMonth.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                        })}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground" aria-live="polite">
                        {filteredDepartures.length} departure{filteredDepartures.length !== 1 ? 's' : ''} available
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextMonth}
                    disabled={availableMonths.length === 0}
                    className="h-9 w-9 sm:h-10 sm:w-10"
                    aria-label="Next month"
                >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>

            {/* Departures List */}
            {filteredDepartures.length === 0 ? (
                <div className="bg-muted/50 border border-dashed rounded-lg p-4 sm:p-6 text-center" role="status">
                    <Calendar className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm sm:text-base text-muted-foreground">
                        No departures available for this month.
                    </p>
                </div>
            ) : (
                <div className="space-y-3" role="list" aria-label="Available departures">
                    {paginatedDepartures.map((departure, index) => (
                        <DepartureCard
                            key={`${departure.dateRange.from}-${index}`}
                            departure={departure}
                            basePrice={basePrice}
                            salePrice={salePrice}
                            saleEnabled={saleEnabled}
                            pricingOptions={pricingOptions}
                            pricingGroups={pricingGroups}
                            pricePerPerson={pricePerPerson}
                            onBookNow={() => handleBookNow(departure)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination - responsive for mobile */}
            {totalPages > 1 && (
                <nav className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap" aria-label="Departure pagination">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="text-xs sm:text-sm min-h-[44px]"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                        <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>

                    <div className="flex items-center gap-1" role="group" aria-label="Page numbers">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="h-9 w-9 sm:h-10 sm:w-10 p-0 min-h-[44px]"
                                aria-label={`Page ${page}`}
                                aria-current={currentPage === page ? 'page' : undefined}
                            >
                                {page}
                            </Button>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="text-xs sm:text-sm min-h-[44px]"
                        aria-label="Next page"
                    >
                        <span className="hidden sm:inline mr-1">Next</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                    </Button>
                </nav>
            )}
        </div>
    );
}

interface DepartureCardProps {
    departure: Departure;
    basePrice: number;
    salePrice?: number;
    saleEnabled?: boolean;
    pricingOptions?: PricingOption[];
    pricingGroups?: { label: string; options: PricingOption[] }[];
    pricePerPerson?: boolean;
    onBookNow: () => void;
}

function DepartureCard({
    departure,
    basePrice,
    salePrice,
    saleEnabled,
    pricingOptions,
    pricingGroups,
    pricePerPerson,
    onBookNow,
}: DepartureCardProps) {
    // Calculate pricing
    const pricing = calculateDeparturePrice(
        departure,
        basePrice,
        salePrice,
        saleEnabled,
        pricingOptions,
        pricingGroups
    );

    // Get selected pricing options details
    const selectedOptions = useMemo(() => {
        if (!departure.selectedPricingOptions) return [];

        const options: PricingOption[] = [];

        // Search in flat pricingOptions array
        if (pricingOptions) {
            const found = pricingOptions.filter(option =>
                departure.selectedPricingOptions?.includes(option.id || option._id || '')
            );
            options.push(...found);
        }

        // Search in pricingGroups if not found
        if (options.length === 0 && pricingGroups) {
            for (const group of pricingGroups) {
                if (group.options) {
                    const found = group.options.filter(option =>
                        departure.selectedPricingOptions?.includes(option.id || option._id || '')
                    );
                    options.push(...found);
                }
            }
        }

        return options;
    }, [departure.selectedPricingOptions, pricingOptions, pricingGroups]);

    // Format date range
    const fromDate = new Date(departure.dateRange.from);
    const toDate = new Date(departure.dateRange.to);
    const isValidDates = !isNaN(fromDate.getTime()) && !isNaN(toDate.getTime());

    return (
        <Card className="hover:shadow-md transition-shadow" role="listitem">
            <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    {/* Left: Date and Label */}
                    <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2 sm:gap-3">
                            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                {isValidDates ? (
                                    <>
                                        <div className="font-semibold text-sm sm:text-base break-words">
                                            {formatDate(fromDate)} - {formatDate(toDate)}
                                        </div>
                                        {departure.label && (
                                            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                                                {departure.label}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="font-semibold text-sm sm:text-base">
                                        {departure.label || 'Departure'}
                                    </div>
                                )}

                                {/* Recurring pattern badge */}
                                {departure.isRecurring && departure.recurrencePattern && (
                                    <Badge variant="secondary" className="mt-2 text-xs">
                                        <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                                        {departure.recurrencePattern.charAt(0).toUpperCase() +
                                            departure.recurrencePattern.slice(1)}{' '}
                                        Recurring
                                    </Badge>
                                )}

                                {/* Pricing option tags */}
                                {selectedOptions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label="Pricing options">
                                        {selectedOptions.map(option => (
                                            <Badge
                                                key={option.id || option._id}
                                                variant="outline"
                                                className="text-xs"
                                                role="listitem"
                                            >
                                                <Tag className="h-3 w-3 mr-1" aria-hidden="true" />
                                                {option.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Pricing and Book Button */}
                    <div className="flex flex-col sm:items-end gap-2 sm:gap-3 sm:min-w-[180px]">
                        <div className="text-left sm:text-right">
                            {pricing.hasDiscount && (
                                <div className="flex items-center gap-2 sm:justify-end mb-1">
                                    <span className="text-xs sm:text-sm text-muted-foreground line-through">
                                        {formatPrice(pricing.originalPrice)}
                                    </span>
                                    <Badge variant="destructive" className="text-xs">
                                        {pricing.discountPercentage}% OFF
                                    </Badge>
                                </div>
                            )}
                            <div className="text-xl sm:text-2xl font-bold text-primary">
                                {formatPrice(pricing.displayPrice)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {pricePerPerson ? 'per person' : 'per group'}
                            </div>
                        </div>

                        <Button
                            onClick={onBookNow}
                            className="w-full sm:w-auto min-h-[44px]"
                            size="lg"
                            aria-label={`Book tour departing ${isValidDates ? formatDate(fromDate) : departure.label}`}
                        >
                            Book Now
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
