'use client';

import { formatPrice } from '@/lib/tourUtils';
import { PricingGroup, PricingOption } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar } from 'lucide-react';

interface PricingOptionsProps {
    pricingGroups?: PricingGroup[];
    currency?: string;
}

export function PricingOptions({ pricingGroups, currency = '$' }: PricingOptionsProps) {
    if (!pricingGroups || pricingGroups.length === 0) {
        return null;
    }

    return (
        <section className="space-y-4 sm:space-y-6" aria-labelledby="pricing-options-heading">
            <h3 id="pricing-options-heading" className="text-lg sm:text-xl font-semibold">Pricing Options</h3>

            {pricingGroups.map((group, groupIndex) => (
                <Card key={groupIndex}>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">{group.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="space-y-3 sm:space-y-4" role="list" aria-label={`${group.label} options`}>
                            {group.options.map((option, optionIndex) => (
                                <PricingOptionCard
                                    key={optionIndex}
                                    option={option}
                                    currency={currency}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </section>
    );
}

interface PricingOptionCardProps {
    option: PricingOption;
    currency: string;
}

function PricingOptionCard({ option, currency }: PricingOptionCardProps) {
    // Calculate discount if enabled and within date range
    const hasActiveDiscount = option.discountEnabled && option.discount;
    let displayPrice = option.price;
    let discountPercentage = 0;

    if (hasActiveDiscount) {
        const now = new Date();
        const discountStart = option.discount?.discountDateRange?.from
            ? new Date(option.discount.discountDateRange.from)
            : null;
        const discountEnd = option.discount?.discountDateRange?.to
            ? new Date(option.discount.discountDateRange.to)
            : null;

        const isWithinDateRange =
            (!discountStart || now >= discountStart) &&
            (!discountEnd || now <= discountEnd);

        if (isWithinDateRange && option.discount) {
            if (option.discount.percentageOrPrice) {
                // Percentage discount
                const discountAmount =
                    (option.price * (option.discount.discountPercentage || 0)) / 100;
                displayPrice = option.price - discountAmount;
                discountPercentage = option.discount.discountPercentage || 0;
            } else {
                // Fixed price discount
                displayPrice = option.price - (option.discount.discountPrice || 0);
                discountPercentage = Math.round(
                    ((option.price - displayPrice) / option.price) * 100
                );
            }
        }
    }

    const hasDiscount = displayPrice < option.price;

    // Format category display
    const categoryDisplay =
        option.category === 'custom' && option.customCategory
            ? option.customCategory
            : option.category.charAt(0).toUpperCase() + option.category.slice(1);

    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-3" role="listitem">
            <div className="space-y-2 flex-1 min-w-0">
                {/* Option name and category */}
                <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm sm:text-base">{option.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                        {categoryDisplay}
                    </Badge>
                </div>

                {/* Passenger range */}
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                        <span>
                            {option.minPax === option.maxPax
                                ? `${option.minPax} pax`
                                : `${option.minPax}-${option.maxPax} pax`}
                        </span>
                    </div>

                    {/* Discount date range */}
                    {hasDiscount && option.discount?.discountDateRange && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                            <span className="text-xs">
                                Valid until{' '}
                                {new Date(option.discount.discountDateRange.to).toLocaleDateString(
                                    'en-US',
                                    {
                                        month: 'short',
                                        day: 'numeric',
                                    }
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Price display */}
            <div className="text-left sm:text-right space-y-1 sm:ml-4">
                <div className="flex items-baseline gap-2">
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                        {formatPrice(displayPrice, currency)}
                    </div>
                    {hasDiscount && (
                        <Badge variant="destructive" className="text-xs">
                            -{discountPercentage}%
                        </Badge>
                    )}
                </div>
                {hasDiscount && (
                    <div className="text-xs sm:text-sm text-muted-foreground line-through">
                        {formatPrice(option.price, currency)}
                    </div>
                )}
            </div>
        </div>
    );
}
