'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TourRouteDay, TourRouteStop } from '@/lib/api/tours';

const KIND = {
    location: { color: '#0f6cbd', label: 'Day location' },
    meal: { color: '#d97706', label: 'Meal' },
    stay: { color: '#15803d', label: 'Overnight stay' },
} as const;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const pinIcon = (stop: TourRouteStop) =>
    L.divIcon({
        className: '',
        iconSize: [34, 24],
        iconAnchor: [17, 12],
        html: `<div style="min-width:34px;height:24px;padding:0 6px;box-sizing:border-box;border-radius:9999px;background:${KIND[stop.kind].color};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font:700 12px/1 system-ui,sans-serif">${escapeHtml(stop.label)}</div>`,
    });

/**
 * Day-by-day route map (Leaflet + OpenStreetMap). Every stop gets a labelled pin — 1A, 1B, 2A… —
 * and a line joins them in order. Uses Leaflet directly: the map is created in an effect and
 * removed in its cleanup, so StrictMode / Fast Refresh remounts can't initialise a container twice.
 */
export default function ItineraryMap({ days }: { days: TourRouteDay[] }) {
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const boundsRef = useRef<L.LatLngBounds | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        const stops = days.flatMap((d) => d.stops);
        if (!el || stops.length === 0) return;

        const map = L.map(el, { scrollWheelZoom: false, zoomControl: false, attributionControl: true });
        L.control.zoom({ position: 'bottomright', zoomInText: '+', zoomOutText: '−' }).addTo(map); // always-visible + / − buttons
        mapRef.current = map;
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        const latlngs = stops.map((s) => [s.lat, s.lng] as [number, number]);
        if (latlngs.length > 1) L.polyline(latlngs, { color: '#0f6cbd', weight: 3, opacity: 0.85, dashArray: '2 6', lineCap: 'round' }).addTo(map);
        stops.forEach((s) => {
            L.marker([s.lat, s.lng], { icon: pinIcon(s), zIndexOffset: s.kind === 'location' ? 200 : 0 })
                .bindTooltip(`<strong>Day ${escapeHtml(s.label)}</strong> · ${escapeHtml(KIND[s.kind].label)}<br/>${escapeHtml(s.name)}${s.kind === 'location' ? '' : ` — ${escapeHtml(s.place)}`}${s.approximate ? '<br/><em>Approximate: shown beside the town</em>' : ''}`, { direction: 'top', offset: [0, -12] })
                .addTo(map);
        });

        const bounds = L.latLngBounds(latlngs);
        boundsRef.current = bounds;
        if (latlngs.length === 1) map.setView(latlngs[0], 9);
        else map.fitBounds(bounds, { padding: [40, 40] });

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [days]);

    // Expand / collapse: re-measure and re-fit.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        // The + / − buttons are always there; the mouse wheel only zooms once expanded (so it never hijacks page scroll).
        if (expanded) map.scrollWheelZoom.enable();
        else map.scrollWheelZoom.disable();
        map.invalidateSize();
        if (boundsRef.current && days.flatMap((d) => d.stops).length > 1) map.fitBounds(boundsRef.current, { padding: expanded ? [80, 80] : [40, 40] });
    }, [expanded, days]);

    useEffect(() => {
        if (!expanded) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [expanded]);

    if (days.length === 0) return null;

    return (
        <div
            className={cn('relative overflow-hidden bg-muted', expanded ? 'fixed inset-0 z-[1000] rounded-none' : 'z-0 h-64 w-full rounded-2xl border sm:h-96')}
            role="region"
            aria-label="Tour route map"
        >
            <div ref={containerRef} className="h-full w-full" />
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Exit full screen map' : 'Expand map'}
                className="absolute right-3 top-3 z-[1001] flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-md ring-1 ring-border transition hover:bg-background"
            >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <div className="absolute bottom-6 left-3 z-[1001] max-w-[70%] flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-background/95 px-3 py-1.5 text-xs shadow ring-1 ring-border">
                {Object.values(KIND).map((k) => (
                    <span key={k.label} className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: k.color }} />{k.label}
                    </span>
                ))}
                {days.some((d) => d.stops.some((s) => s.approximate)) && (
                    <span className="basis-full text-[11px] text-muted-foreground">Meal and hotel pins sit beside the town — exact addresses aren&apos;t on file yet.</span>
                )}
            </div>
        </div>
    );
}
