'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrencyRates } from '@/lib/api/currency';

/**
 * Display currency. Tours are priced and charged in USD; this converts prices for browsing only, so a visitor from
 * Sydney or Kathmandu sees something familiar. Checkout always shows (and charges) USD.
 */
export const CURRENCIES = [
    { code: 'USD', label: 'US dollar' },
    { code: 'EUR', label: 'Euro' },
    { code: 'GBP', label: 'British pound' },
    { code: 'AUD', label: 'Australian dollar' },
    { code: 'CAD', label: 'Canadian dollar' },
    { code: 'NPR', label: 'Nepalese rupee' },
    { code: 'INR', label: 'Indian rupee' },
    { code: 'SGD', label: 'Singapore dollar' },
    { code: 'JPY', label: 'Japanese yen' },
    { code: 'CNY', label: 'Chinese yuan' },
    { code: 'AED', label: 'UAE dirham' },
    { code: 'CHF', label: 'Swiss franc' },
] as const;

type Code = (typeof CURRENCIES)[number]['code'];
const STORAGE_KEY = 'tourbnt:currency';

// The header currency switcher is turned off: every price shows in USD, the currency tours are charged in.
// To bring it back, set this to true and put <CurrencySwitcher /> back in MainHeader.
const VISITOR_CAN_CHOOSE = false;

// First-visit guess from the browser's region. The visitor can always change it.
const REGION_CURRENCY: Record<string, Code> = {
    AU: 'AUD', GB: 'GBP', CA: 'CAD', NP: 'NPR', IN: 'INR', SG: 'SGD', JP: 'JPY', CN: 'CNY', AE: 'AED', CH: 'CHF',
    DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR',
};

interface CurrencyContextValue {
    currency: Code;
    setCurrency: (c: Code) => void;
    /** USD amount -> display currency. */
    convert: (usd: number) => number;
    /** USD amount -> "A$1,234". */
    format: (usd: number, decimals?: number) => string;
    isConverted: boolean;
    source: 'live' | 'fallback' | 'none';
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<Code>('USD');

    // Chosen after mount (not during render) so the server HTML and the first client render agree.
    useEffect(() => {
        if (!VISITOR_CAN_CHOOSE) return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as Code | null;
            if (stored && CURRENCIES.some((c) => c.code === stored)) {
                setCurrencyState(stored);
                return;
            }
            const region = (navigator.language || '').split('-')[1]?.toUpperCase();
            const guess = region ? REGION_CURRENCY[region] : undefined;
            if (guess) setCurrencyState(guess);
        } catch { /* storage blocked: stay on USD */ }
    }, []);

    const setCurrency = useCallback((c: Code) => {
        setCurrencyState(c);
        try { localStorage.setItem(STORAGE_KEY, c); } catch { /* not persisted */ }
    }, []);

    // Only fetch rates when a non-USD currency is actually in use.
    const { data } = useQuery({
        queryKey: ['currency-rates'],
        queryFn: getCurrencyRates,
        enabled: currency !== 'USD',
        staleTime: 6 * 60 * 60 * 1000,
    });

    const value = useMemo<CurrencyContextValue>(() => {
        const rate = currency === 'USD' ? 1 : data?.rates?.[currency];
        // Until the rate arrives (or if it can't be fetched) show USD rather than a wrong number.
        const active: Code = rate ? currency : 'USD';
        const r = rate ?? 1;
        return {
            currency: active,
            setCurrency,
            convert: (usd) => usd * r,
            format: (usd, decimals = 0) => {
                const d = active === 'JPY' ? 0 : decimals; // yen has no minor unit
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: active, minimumFractionDigits: d, maximumFractionDigits: d }).format(usd * r);
            },
            isConverted: active !== 'USD',
            source: currency === 'USD' || !data ? 'none' : data.source,
        };
    }, [currency, data, setCurrency]);

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

const FALLBACK: CurrencyContextValue = {
    currency: 'USD',
    setCurrency: () => undefined,
    convert: (usd) => usd,
    format: (usd, decimals = 0) => `$${usd.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`,
    isConverted: false,
    source: 'none',
};

/** Safe outside the provider (tests, isolated components): falls back to plain USD. */
export const useCurrency = () => useContext(CurrencyContext) ?? FALLBACK;
