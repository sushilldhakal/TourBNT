'use client';

import { Category, Destination } from '@/lib/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Grid, List, Filter, X, MapPin, Tag, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PriceRange {
    value: string;
    label: string;
}

interface TourFiltersProps {
    selectedCategory: string;
    selectedDestination: string;
    priceRange: string;
    viewMode: 'grid' | 'list';
    categories: Category[];
    destinations: Destination[];
    priceRanges: PriceRange[];
    onCategoryChange: (value: string) => void;
    onDestinationChange: (value: string) => void;
    onPriceRangeChange: (value: string) => void;
    onViewModeChange: (mode: 'grid' | 'list') => void;
    onReset: () => void;
}

export default function TourFilters({
    selectedCategory,
    selectedDestination,
    priceRange,
    viewMode,
    categories,
    destinations,
    priceRanges,
    onCategoryChange,
    onDestinationChange,
    onPriceRangeChange,
    onViewModeChange,
    onReset,
}: TourFiltersProps) {
    // Count active filters
    const activeFiltersCount = [
        selectedCategory !== 'all',
        selectedDestination !== 'all',
        priceRange !== 'all',
    ].filter(Boolean).length;

    // Get selected filter labels
    const getSelectedCategoryName = () => {
        if (selectedCategory === 'all') return null;
        return categories.find(c => c._id === selectedCategory)?.name;
    };

    const getSelectedDestinationName = () => {
        if (selectedDestination === 'all') return null;
        return destinations.find(d => d._id === selectedDestination)?.name;
    };

    const getSelectedPriceLabel = () => {
        if (priceRange === 'all') return null;
        return priceRanges.find(p => p.value === priceRange)?.label;
    };

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-3 sm:p-4">
                {/* Single Row Layout */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    {/* Filter Icon & Title */}
                    <div className="flex items-center gap-2 sm:min-w-fit">
                        <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="text-sm font-semibold whitespace-nowrap">Filter Tours</span>
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </div>

                    {/* Filters - Flex grow to fill space */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                        {/* Category Filter */}
                        <Select value={selectedCategory} onValueChange={onCategoryChange}>
                            <SelectTrigger id="category-filter" className="w-full sm:flex-1" aria-label="Filter by category">
                                <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category._id} value={category._id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Destination Filter */}
                        <Select value={selectedDestination} onValueChange={onDestinationChange}>
                            <SelectTrigger id="destination-filter" className="w-full sm:flex-1" aria-label="Filter by destination">
                                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="All Destinations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Destinations</SelectItem>
                                {destinations.map((destination) => (
                                    <SelectItem key={destination._id} value={destination._id}>
                                        {destination.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Price Range Filter */}
                        <Select value={priceRange} onValueChange={onPriceRangeChange}>
                            <SelectTrigger id="price-filter" className="w-full sm:flex-1" aria-label="Filter by price range">
                                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="All Prices" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Prices</SelectItem>
                                {priceRanges.map((range) => (
                                    <SelectItem key={range.value} value={range.value}>
                                        {range.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 sm:min-w-fit">
                        {/* Reset Button */}
                        {activeFiltersCount > 0 && (
                            <Button
                                onClick={onReset}
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none"
                                aria-label="Reset all filters"
                            >
                                <X className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Clear</span>
                            </Button>
                        )}

                        {/* View Mode Toggle */}
                        <div className="hidden sm:flex gap-1 bg-muted/50 rounded-md p-1" role="group" aria-label="View mode">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange('grid')}
                                className="h-8 w-8 p-0"
                                aria-label="Switch to grid view"
                                aria-pressed={viewMode === 'grid'}
                            >
                                <Grid className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange('list')}
                                className="h-8 w-8 p-0"
                                aria-label="Switch to list view"
                                aria-pressed={viewMode === 'list'}
                            >
                                <List className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Active Filters Display - Optional second row when filters are active */}
                {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                        {getSelectedCategoryName() && (
                            <Badge variant="outline" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {getSelectedCategoryName()}
                                <button
                                    onClick={() => onCategoryChange('all')}
                                    className="ml-1 hover:bg-muted rounded-full"
                                    aria-label="Remove category filter"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {getSelectedDestinationName() && (
                            <Badge variant="outline" className="gap-1">
                                <MapPin className="h-3 w-3" />
                                {getSelectedDestinationName()}
                                <button
                                    onClick={() => onDestinationChange('all')}
                                    className="ml-1 hover:bg-muted rounded-full"
                                    aria-label="Remove destination filter"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {getSelectedPriceLabel() && (
                            <Badge variant="outline" className="gap-1">
                                <DollarSign className="h-3 w-3" />
                                {getSelectedPriceLabel()}
                                <button
                                    onClick={() => onPriceRangeChange('all')}
                                    className="ml-1 hover:bg-muted rounded-full"
                                    aria-label="Remove price filter"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
