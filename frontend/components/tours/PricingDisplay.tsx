'use client';

import { Tour } from '@/lib/types';
import { BasePricing } from './BasePricing';
import { PricingOptions } from './PricingOptions';

interface PricingDisplayProps {
    tour: Tour;
    currency?: string;
}

/**
 * Combined pricing display component that shows both base pricing and advanced pricing options
 * 
 * This component implements Requirements 5.1, 5.2, and 5.3:
 * - 5.1: Displays base pricing with standard price and pricing type (per person or per group)
 * - 5.2: Shows sale price with discount percentage and strikethrough when sale is enabled
 * - 5.3: Displays all pricing groups and options when advanced pricing is enabled
 * 
 * @example
 * ```tsx
 * // Basic usage with tour data
 * <PricingDisplay tour={tourData} />
 * 
 * // With custom currency
 * <PricingDisplay tour={tourData} currency="€" />
 * ```
 */
export function PricingDisplay({ tour, currency = '$' }: PricingDisplayProps) {
    return (
        <div className="space-y-6">
            {/* Base Pricing - Always shown (Requirement 5.1, 5.2) */}
            <BasePricing
                basePrice={tour.price}
                saleEnabled={tour.saleEnabled}
                salePrice={tour.salePrice}
                pricePerPerson={tour.pricePerPerson}
                priceLockDate={tour.priceLockDate}
                currency={currency}
            />

            {/* Advanced Pricing Options - Only shown if enabled (Requirement 5.3) */}
            {tour.pricingOptionsEnabled && tour.pricingGroups && (
                <PricingOptions
                    pricingGroups={tour.pricingGroups}
                    currency={currency}
                />
            )}
        </div>
    );
}
