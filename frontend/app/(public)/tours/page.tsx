'use client';

import { useLayout } from '@/providers/LayoutProvider';
import ToursBreadcrumb from '@/components/tours/ToursBreadcrumb';
import TourFilters from '@/components/tours/TourFilters';
import TourCard from '@/components/tours/TourCard';
import TourSearch from '@/components/tours/TourSearch';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getTours } from '@/lib/api/tours';
import { getAllCategories } from '@/lib/api/categories';
import { getAllDestinations } from '@/lib/api/destinations';
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';

export default function ToursPage() {
    const { isFullWidth } = useLayout();

    // Filter state management
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedDestination, setSelectedDestination] = useState<string>('all');
    const [priceRange, setPriceRange] = useState<string>('all');
    const [sortOption, setSortOption] = useState<string>('featured');

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Intersection observer ref for infinite scroll
    const observerRef = useRef<HTMLDivElement>(null);

    // Fetch tours with infinite scroll
    const {
        data: toursData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingTours,
        isError: isErrorTours,
        error: toursError,
    } = useInfiniteQuery({
        queryKey: ['tours'],
        queryFn: ({ pageParam }: { pageParam: number }) => getTours({ page: pageParam, limit: 12 }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.nextPage,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 2,
    });

    // Fetch categories for filtering
    const { data: categories = [] } = useQuery({
        queryKey: ['global-categories-approved'],
        queryFn: getAllCategories,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
    });

    // Fetch destinations for filtering
    const { data: destinations = [] } = useQuery({
        queryKey: ['global-destinations-approved'],
        queryFn: getAllDestinations,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
    });

    // Intersection observer callback for infinite scroll
    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [target] = entries;
            if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
        [fetchNextPage, hasNextPage, isFetchingNextPage]
    );

    // Set up intersection observer
    useEffect(() => {
        const element = observerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(handleObserver, {
            threshold: 0.1,
        });

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [handleObserver]);

    // Flatten all pages of tours
    const allTours = toursData?.pages.flatMap((page) => page.tours) ?? [];


    // Dynamic price range generation
    const dynamicPriceRanges = useMemo(() => {
        if (allTours.length === 0) return [];

        // Extract all prices from tours
        const prices = allTours.map((tour) => tour.price).filter((price) => price > 0);

        if (prices.length === 0) return [];

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        // If all tours have the same price, return a single range
        if (minPrice === maxPrice) {
            return [
                {
                    value: `${minPrice}-${maxPrice}`,
                    label: `$${minPrice}`,
                },
            ];
        }

        // Generate 5 price range options
        const rangeSize = (maxPrice - minPrice) / 5;
        const ranges = [];

        for (let i = 0; i < 5; i++) {
            const rangeMin = Math.floor(minPrice + rangeSize * i);
            const rangeMax = i === 4 ? maxPrice : Math.floor(minPrice + rangeSize * (i + 1));

            ranges.push({
                value: `${rangeMin}-${rangeMax}`,
                label: `$${rangeMin} - $${rangeMax}`,
            });
        }

        return ranges;
    }, [allTours]);

    // Get price range values function
    const getPriceRangeValues = useCallback(
        (range: string): { min: number; max: number } | null => {
            if (range === 'all') return null;

            // Try to parse dynamic range format "min-max"
            const parts = range.split('-');
            if (parts.length === 2) {
                const min = parseInt(parts[0], 10);
                const max = parseInt(parts[1], 10);
                if (!isNaN(min) && !isNaN(max)) {
                    return { min, max };
                }
            }

            // Fallback to static ranges if dynamic parsing fails
            const staticRanges: Record<string, { min: number; max: number }> = {
                '0-100': { min: 0, max: 100 },
                '100-500': { min: 100, max: 500 },
                '500-1000': { min: 500, max: 1000 },
                '1000-5000': { min: 1000, max: 5000 },
                '5000+': { min: 5000, max: Infinity },
            };

            return staticRanges[range] || null;
        },
        []
    );

    // Client-side filtering logic
    const filteredTours = useMemo(() => {
        let filtered = [...allTours];

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter((tour) => {
                if (!tour.category) return false;

                // Handle category as array
                if (Array.isArray(tour.category)) {
                    return tour.category.some((cat: any) => {
                        if (typeof cat === 'string') {
                            return cat === selectedCategory;
                        }
                        return (cat as any)._id === selectedCategory;
                    });
                }

                // Handle category as string
                if (typeof tour.category === 'string') {
                    return tour.category === selectedCategory;
                }

                // Handle category as object
                return (tour.category as any)._id === selectedCategory;
            });
        }

        // Filter by destination
        if (selectedDestination !== 'all') {
            filtered = filtered.filter((tour) => {
                if (!tour.destination) return false;

                // Handle destination as string
                if (typeof tour.destination === 'string') {
                    return tour.destination === selectedDestination;
                }

                // Handle destination as object
                return tour.destination._id === selectedDestination;
            });
        }

        // Filter by price range
        const priceRangeValues = getPriceRangeValues(priceRange);
        if (priceRangeValues) {
            filtered = filtered.filter((tour) => {
                return tour.price >= priceRangeValues.min && tour.price <= priceRangeValues.max;
            });
        }

        // Sort tours
        switch (sortOption) {
            case 'name':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'price-low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'date-new':
                filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'date-old':
                filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'featured':
            default:
                // Keep original order for featured
                break;
        }

        return filtered;
    }, [allTours, selectedCategory, selectedDestination, priceRange, sortOption, getPriceRangeValues]);


    // Reset filters function
    const handleResetFilters = useCallback(() => {
        setSelectedCategory('all');
        setSelectedDestination('all');
        setPriceRange('all');
        setSortOption('featured');
    }, []);

    // TODO: Implement view mode toggle in task 6

    return (
        <>
            {/* Skip to main content link for keyboard users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground"
            >
                Skip to main content
            </a>

            {/* Hero Banner Section */}
            <div
                className="relative h-[150px] sm:h-[180px] md:h-[200px] bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop')"
                }}
                role="banner"
                aria-label="Tours page banner"
            >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />

                {/* Title */}
                <div className="relative h-full flex items-center justify-center px-4">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center">
                        Tour Listing
                    </h1>
                </div>
            </div>

            {/* Breadcrumb Navigation */}
            <ToursBreadcrumb />
            <div className={`${isFullWidth ? 'w-full px-4' : ' mx-auto max-w-7xl  px-4'} py-4 sm:py-6 lg:py-8 transition-all duration-300`}>
                {/* Main Content Area */}
                <main id="main-content" className={`py-4 sm:py-6 lg:py-8 transition-all duration-300`}>
                    {/* ARIA live region for screen readers */}
                    <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="sr-only"
                    >
                        {isLoadingTours && "Loading tours..."}
                        {!isLoadingTours && !isErrorTours && `${filteredTours.length} tours found`}
                        {isErrorTours && "Error loading tours. Please try again."}
                    </div>
                </main>

                {/* Responsive Layout: Main Content + Sidebar */}
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                    {/* Main Content Area (3/4 width on large screens, full width on mobile) */}
                    <div className="w-full lg:flex-1 lg:w-3/4">
                        {/* Placeholder for filters and tour grid */}
                        <div className="space-y-6">
                            {/* Filter controls */}
                            <section aria-label="Tour filters">
                                <TourFilters
                                    selectedCategory={selectedCategory}
                                    selectedDestination={selectedDestination}
                                    priceRange={priceRange}
                                    viewMode={viewMode}
                                    categories={categories}
                                    destinations={destinations}
                                    priceRanges={dynamicPriceRanges}
                                    onCategoryChange={setSelectedCategory}
                                    onDestinationChange={setSelectedDestination}
                                    onPriceRangeChange={setPriceRange}
                                    onViewModeChange={setViewMode}
                                    onReset={handleResetFilters}
                                />
                            </section>

                            {/* Loading state during initial load */}
                            {isLoadingTours && (
                                <div className="flex justify-center items-center py-12">
                                    <p className="text-lg text-muted-foreground">Loading tours...</p>
                                </div>
                            )}

                            {/* Error state */}
                            {isErrorTours && !isLoadingTours && (
                                <div className="flex justify-center items-center py-12">
                                    <div className="text-center space-y-2">
                                        <p className="text-lg text-destructive">Error loading tours</p>
                                        {toursError && (
                                            <p className="text-sm text-muted-foreground">
                                                {toursError instanceof Error ? toursError.message : 'Unknown error'}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Make sure the backend server is running at {process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tours display */}
                            {!isLoadingTours && !isErrorTours && (
                                <>
                                    {/* Empty state - no tours at all */}
                                    {allTours.length === 0 && (
                                        <div className="flex justify-center items-center py-12">
                                            <div className="text-center">
                                                <p className="text-lg text-muted-foreground">
                                                    No tours available at the moment
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    Please check back later for new tours
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty results state - filters applied but no matches */}
                                    {filteredTours.length === 0 && allTours.length > 0 && (
                                        <div className="flex justify-center items-center py-12">
                                            <div className="text-center">
                                                <p className="text-lg text-muted-foreground">
                                                    No tours found matching your filters
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    Try adjusting your filter criteria
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tour grid/list with conditional layout */}
                                    {filteredTours.length > 0 && (
                                        <div
                                            className={`grid gap-4 sm:gap-6 ${viewMode === 'grid'
                                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                                                : 'grid-cols-1'
                                                }`}
                                        >
                                            {filteredTours.map((tour) => (
                                                <TourCard key={tour._id} tour={tour} viewMode={viewMode} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Intersection observer target for infinite scroll */}
                                    <div ref={observerRef} className="py-4">
                                        {isFetchingNextPage && (
                                            <div className="flex justify-center">
                                                <p className="text-muted-foreground">Loading more tours...</p>
                                            </div>
                                        )}
                                        {!hasNextPage && allTours.length > 0 && (
                                            <div className="flex justify-center">
                                                <p className="text-muted-foreground">No more tours to load</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sidebar (1/4 width on large screens, full width on mobile) */}
                    <aside className="w-full lg:w-1/4 order-first lg:order-last">
                        <div className="lg:sticky lg:top-20">
                            {/* Search sidebar */}
                            <div className="p-4 sm:p-6 bg-card border border-border rounded-lg">
                                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Search Tours</h3>
                                <TourSearch />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

        </>
    );
}
