'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES, useCurrency } from '@/providers/CurrencyProvider';

/** Header control for the display currency. */
export function CurrencySwitcher() {
    const { currency, setCurrency, isConverted, source } = useCurrency();
    return (
        <Select value={currency} onValueChange={(v) => setCurrency(v as (typeof CURRENCIES)[number]['code'])}>
            <SelectTrigger aria-label="Display currency" className="h-9 w-[84px] px-2 text-xs sm:text-sm">
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
                {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                        {c.code} <span className="text-muted-foreground">· {c.label}</span>
                    </SelectItem>
                ))}
                <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground border-t mt-1 max-w-[220px]">
                    {isConverted
                        ? `Estimates${source === 'fallback' ? ' (approximate rates)' : ''}. You are charged in USD. `
                        : 'Tours are priced and charged in USD. '}
                    <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">Rates by Exchange Rate API</a>
                </p>
            </SelectContent>
        </Select>
    );
}
