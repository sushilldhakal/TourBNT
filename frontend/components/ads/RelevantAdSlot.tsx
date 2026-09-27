'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { getAdsForPlacement, recordAdClick, AdPlacementSlot } from '@/lib/api/ads';

interface RelevantAdSlotProps {
    placementSlot: AdPlacementSlot;
    categoryId?: string;
    destinationId?: string;
    limit?: number;
    /** Heading shown above the ad cards; omit for a bare, unlabeled slot. */
    title?: string;
    className?: string;
}

/**
 * Renders contextually-targeted ad campaigns for a placement slot — e.g.
 * trekking-gear/medicine ads on a trekking-category tour page, or nearby-food
 * ads on a hotel page. Returns nothing if no ad matches, so it never shows
 * generic filler.
 */
export function RelevantAdSlot({ placementSlot, categoryId, destinationId, limit = 2, title = 'You might also need', className }: RelevantAdSlotProps) {
    const { data: ads } = useQuery({
        queryKey: ['ads-placement', placementSlot, categoryId, destinationId],
        queryFn: () => getAdsForPlacement({ placementSlot, categoryId, destinationId, limit }),
        staleTime: 5 * 60 * 1000,
    });

    if (!ads || ads.length === 0) return null;

    const handleClick = async (adId: string, ctaUrl: string) => {
        const result = await recordAdClick(adId);
        window.open(result?.ctaUrl || ctaUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={className}>
            {title && <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>}
            <div className="space-y-3">
                {ads.map((ad) => (
                    <Card key={ad.id} className="overflow-hidden">
                        <button type="button" onClick={() => handleClick(ad.id, ad.ctaUrl)} className="w-full text-left">
                            {ad.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={ad.imageUrl} alt={ad.title} className="w-full h-28 object-cover" />
                            )}
                            <CardContent className="p-3">
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
                ))}
            </div>
        </div>
    );
}
