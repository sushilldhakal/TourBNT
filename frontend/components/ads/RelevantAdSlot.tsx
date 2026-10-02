'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getAdsForPlacement, recordAdClick, recordAdImpressions, type AdContextParams, type AdPlacementSlot, type Advertisement } from '@/lib/api/ads';

interface RelevantAdSlotProps extends AdContextParams {
    placementSlot: AdPlacementSlot;
    /** @deprecated pass categoryIds */
    categoryId?: string;
    /** @deprecated pass destinationIds */
    destinationId?: string;
    limit?: number;
    /** Heading shown above the ad cards; omit for a bare, unlabeled slot. */
    title?: string;
    /** `stack` for sidebars, `row` for a horizontal strip (listing pages). */
    layout?: 'stack' | 'row';
    className?: string;
}

/**
 * Ads from businesses connected to what this page is about — the places a tour visits
 * (including itinerary stops), its tour types, or what the visitor searched for. Renders
 * nothing when no business matches: never generic filler.
 *
 * A view is counted only once an ad has been at least half on screen for a second.
 */
export function RelevantAdSlot({
    placementSlot,
    tourId,
    destinationIds,
    categoryIds,
    q,
    near,
    categoryId,
    destinationId,
    limit = 2,
    title = 'Local businesses for your trip',
    layout = 'stack',
    className,
}: RelevantAdSlotProps) {
    const dests = [...(destinationIds ?? []), ...(destinationId ? [destinationId] : [])].filter(Boolean).sort();
    const cats = [...(categoryIds ?? []), ...(categoryId ? [categoryId] : [])].filter(Boolean).sort();
    const search = q?.trim() || undefined;
    const hasContext = !!tourId || dests.length > 0 || cats.length > 0 || !!search || !!near;

    const { data: ads } = useQuery({
        queryKey: ['ads-placement', placementSlot, tourId ?? null, dests, cats, search ?? null, near?.lat ?? null, near?.lng ?? null, limit],
        queryFn: () => getAdsForPlacement({ placementSlot, tourId, destinationIds: dests, categoryIds: cats, q: search, near, limit }),
        enabled: hasContext,
        staleTime: 5 * 60 * 1000,
    });

    if (!ads || ads.length === 0) return null;

    return (
        <div className={className}>
            {title && <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>}
            <div className={cn(layout === 'row' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3')}>
                {ads.map((ad) => <AdCard key={ad.id} ad={ad} compact={layout === 'stack'} />)}
            </div>
        </div>
    );
}

function AdCard({ ad, compact }: { ad: Advertisement; compact: boolean }) {
    const ref = useViewTracking(ad.id);

    const handleClick = () => {
        // Open in the click handler itself (popup blockers); count the click in the background.
        window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
        void recordAdClick(ad.id);
    };

    return (
        <div ref={ref} className="h-full">
            <Card className="overflow-hidden h-full py-0 gap-0 pt-0" >
                <button type="button" onClick={handleClick} className="w-full h-full text-left flex flex-col">
                    {ad.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.imageUrl} alt={ad.title} loading="lazy" className={cn('w-full object-cover', compact ? 'h-28' : 'h-36')} />
                    )}
                    <CardContent className="p-3 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-sm">{ad.title}</h4>
                            <span className="text-[10px] uppercase text-muted-foreground shrink-0">Sponsored</span>
                        </div>
                        {ad.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>}
                        {ad.business && <p className="text-xs text-muted-foreground mt-1">by {ad.business.name}</p>}
                        <span className="inline-block mt-2 text-xs font-medium text-primary">{ad.ctaLabel || 'Learn more'} →</span>
                    </CardContent>
                </button>
            </Card>
        </div>
    );
}

// Views seen on this page, batched into one request.
const pendingViews = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function queueView(adId: string) {
    pendingViews.add(adId);
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        const ids = [...pendingViews];
        pendingViews.clear();
        flushTimer = null;
        void recordAdImpressions(ids);
    }, 1500);
}

function useViewTracking(adId: string) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let counted = false;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (counted) return;
                if (entry.isIntersecting) {
                    timer = setTimeout(() => {
                        counted = true;
                        queueView(adId);
                        observer.disconnect();
                    }, 1000);
                } else if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(el);
        return () => {
            if (timer) clearTimeout(timer);
            observer.disconnect();
        };
    }, [adId]);

    return ref;
}
