import { format } from 'date-fns';

export const PRICE_MIN = 0;
export const PRICE_MAX = 10000;

/**
 * The /tours URL for a search form's choices. Destination and trip type are ids (what the tours page and
 * the API filter on). Dates are calendar days (YYYY-MM-DD) in the visitor's own time zone; toISOString()
 * would shift them to UTC, a day early for anyone east of Greenwich. The price is only sent when narrowed.
 */
export function buildTourSearchUrl(opts: {
    keyword?: string;
    destinationId?: string;
    categoryId?: string;
    from?: Date;
    to?: Date;
    priceRange?: [number, number];
}): string {
    const params = new URLSearchParams();
    if (opts.keyword?.trim()) params.set('keyword', opts.keyword.trim());
    if (opts.destinationId) params.set('destination', opts.destinationId);
    if (opts.categoryId) params.set('type', opts.categoryId);
    if (opts.from) params.set('startDate', format(opts.from, 'yyyy-MM-dd'));
    if (opts.to) params.set('endDate', format(opts.to, 'yyyy-MM-dd'));
    const [min, max] = opts.priceRange ?? [PRICE_MIN, PRICE_MAX];
    if (min > PRICE_MIN) params.set('minPrice', String(min));
    if (max < PRICE_MAX) params.set('maxPrice', String(max));
    const qs = params.toString();
    return qs ? `/tours?${qs}` : '/tours';
}
