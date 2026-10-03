'use client';

import { useCurrency } from '@/providers/CurrencyProvider';

/**
 * A USD price shown in the visitor's chosen display currency. Renders plain text, so it drops into any span.
 * `title` explains converted amounts: they are estimates, and the booking is charged in USD.
 */
export function Price({ usd, decimals = 0, className }: { usd: number; decimals?: number; className?: string }) {
    const { format, isConverted } = useCurrency();
    if (typeof usd !== 'number' || Number.isNaN(usd)) return null;
    return (
        <span className={className} title={isConverted ? 'Approximate. Prices are set and charged in US dollars.' : undefined}>
            {format(usd, decimals)}
        </span>
    );
}
