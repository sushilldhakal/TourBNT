'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { getTourRouteMap } from '@/lib/api/tours';

// Leaflet touches `window`, so it only loads in the browser.
const ItineraryMap = dynamic(() => import('@/components/tours/ItineraryMap'), {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-muted sm:h-96" />,
});

/** Always-visible day-by-day route map for a tour (sits between the gallery and the tabs). */
export function TourRouteMap({ tourId }: { tourId: string }) {
    const { data } = useQuery({
        queryKey: ['tour-route-map', tourId],
        queryFn: () => getTourRouteMap(tourId),
        staleTime: 5 * 60_000,
        // Places are looked up a few at a time the first time; keep polling until they are all in.
        refetchInterval: (q) => ((q.state.data?.pending ?? 0) > 0 && q.state.dataUpdateCount < 25 ? 1500 : false),
    });

    if (!data || data.days.length === 0) return null;
    return (
        <section className="my-6" aria-label="Tour route">
            <ItineraryMap days={data.days} />
            {data.pending > 0 && <p className="mt-2 text-xs text-muted-foreground">Placing {data.pending} more stop{data.pending === 1 ? '' : 's'} on the map…</p>}
        </section>
    );
}
