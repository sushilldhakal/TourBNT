'use client';

import { formatPrice } from '@/lib/tourUtils';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface BasePricingProps {
    basePrice: number;
    saleEnabled?: boolean;
    salePrice?: number;
    pricePerPerson?: boolean;
    priceLockDate?: string;
    currency?: string;
}

export function BasePricing({
    basePrice,
    saleEnabled,
    salePrice,
    pricePerPerson = true,
    priceLockDate,
    currency = '$',
}: BasePricingProps) {
    const displayPrice = saleEnabled && salePrice ? salePrice : basePrice;
    const hasDiscount = saleEnabled && salePrice && salePrice < basePrice;
    const discountPercentage = hasDiscount
        ? Math.round(((basePrice - salePrice!) / basePrice) * 100)
        : 0;

    const isPriceLocked = priceLockDate && new Date(priceLockDate) > new Date();

    return (
        <section className="bg-card border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4" aria-labelledby="pricing-heading">
            <h3 id="pricing-heading" className="text-lg sm:text-xl font-semibold">Pricing</h3>

            <div className="space-y-2 sm:space-y-3">
                {/* Price display */}
                <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                    <div className="text-3xl sm:text-4xl font-bold text-primary">
                        {formatPrice(displayPrice, currency)}
                    </div>
                    {hasDiscount && (
                        <>
                            <div className="text-xl sm:text-2xl text-muted-foreground line-through">
                                {formatPrice(basePrice, currency)}
                            </div>
                            <Badge variant="destructive" className="text-xs sm:text-sm">
                                Save {discountPercentage}%
                            </Badge>
                        </>
                    )}
                </div>

                {/* Pricing type */}
                <div className="text-xs sm:text-sm text-muted-foreground">
                    {pricePerPerson ? 'Per Person' : 'Per Group'}
                </div>

                {/* Price lock alert */}
                {isPriceLocked && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md" role="status" aria-live="polite">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="text-xs sm:text-sm">
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                                Price Lock Available
                            </p>
                            <p className="text-blue-700 dark:text-blue-300 mt-1">
                                Lock in this price until {new Date(priceLockDate).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
