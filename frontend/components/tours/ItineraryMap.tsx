'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ItineraryMapPoint {
    name: string;
    lat: number;
    lng: number;
    /** 1-based day numbers spent here, in order. */
    days: number[];
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const pinIcon = (label: string) =>
    L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<div style="width:28px;height:28px;border-radius:9999px;background:#0f6cbd;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:700 12px/1 system-ui,sans-serif">${label}</div>`,
    });

/**
 * Route map for an itinerary (Leaflet + OpenStreetMap): a numbered pin per stop, joined in day order.
 * Uses Leaflet directly — the map is created in an effect and removed in its cleanup, so React
 * StrictMode / Fast Refresh remounts can never initialise the same container twice.
 */
export default function ItineraryMap({ points, onActiveDay }: { points: ItineraryMapPoint[]; onActiveDay?: (day: number) => void }) {
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const onActiveDayRef = useRef(onActiveDay);
    onActiveDayRef.current = onActiveDay;
    const expandedRef = useRef(expanded);
    expandedRef.current = expanded;

    // Build / rebuild the map whenever the stops change.
    useEffect(() => {
        const el = containerRef.current;
        if (!el || points.length === 0) return;

        const map = L.map(el, { scrollWheelZoom: false, zoomControl: false, attributionControl: true });
        mapRef.current = map;
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
        if (latlngs.length > 1) L.polyline(latlngs, { color: '#0f6cbd', weight: 3, opacity: 0.9 }).addTo(map);
        points.forEach((p) => {
            L.marker([p.lat, p.lng], { icon: pinIcon(String(p.days[0])) })
                .bindTooltip(`${escapeHtml(p.name)} · day ${p.days.join(', ')}`, { direction: 'top', offset: [0, -14] })
                .on('click', () => onActiveDayRef.current?.(p.days[0]))
                .addTo(map);
        });

        if (latlngs.length === 1) map.setView(latlngs[0], 9);
        else map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [points]);

    // Expand / collapse: enable zoom + scroll only when expanded, then re-measure and re-fit.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        let zoomCtl: L.Control.Zoom | null = null;
        if (expanded) {
            map.scrollWheelZoom.enable();
            zoomCtl = L.control.zoom({ position: 'bottomright' }).addTo(map);
        } else {
            map.scrollWheelZoom.disable();
        }
        map.invalidateSize();
        if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: expanded ? [80, 80] : [40, 40] });
        return () => { zoomCtl?.remove(); };
    }, [expanded, points]);

    useEffect(() => {
        if (!expanded) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [expanded]);

    if (points.length === 0) return null;

    return (
        <div
            className={cn('relative overflow-hidden bg-muted', expanded ? 'fixed inset-0 z-[1000] rounded-none' : 'z-0 h-56 w-full rounded-2xl border sm:h-72')}
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
        </div>
    );
}
