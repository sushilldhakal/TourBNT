'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LatLng {
    latitude: number;
    longitude: number;
}

const NEPAL: [number, number] = [28.2, 84.1];

const pin = L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0f6cbd;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>',
});

/**
 * Pick a destination's position on an OpenStreetMap map: click to drop the pin, drag it to adjust.
 * `value` can also be set from outside (e.g. a place chosen in the search box) and the map follows it.
 * Uses Leaflet directly; the map is created in an effect and removed in its cleanup.
 */
export default function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng) => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const placeRef = useRef<((lat: number, lng: number) => void) | null>(null);
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    });

    const round = (n: number) => Math.round(n * 1e6) / 1e6;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const map = L.map(el, { scrollWheelZoom: false });
        mapRef.current = map;
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        map.setView(NEPAL, 6);

        const place = (lat: number, lng: number) => {
            if (!markerRef.current) {
                markerRef.current = L.marker([lat, lng], { icon: pin, draggable: true }).addTo(map);
                markerRef.current.on('dragend', () => {
                    const p = markerRef.current!.getLatLng();
                    onChangeRef.current({ latitude: round(p.lat), longitude: round(p.lng) });
                });
            } else {
                markerRef.current.setLatLng([lat, lng]);
            }
        };
        map.on('click', (e: L.LeafletMouseEvent) => {
            place(e.latlng.lat, e.latlng.lng);
            onChangeRef.current({ latitude: round(e.latlng.lat), longitude: round(e.latlng.lng) });
        });
        placeRef.current = place;

        // Dialogs open with an animation; measure again once the container has its final size.
        const t = setTimeout(() => map.invalidateSize(), 250);
        return () => {
            clearTimeout(t);
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
            placeRef.current = null;
        };
    }, []);

    // Follow `value` when it changes from outside (search box, or the saved position when editing).
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !value) return;
        const current = markerRef.current?.getLatLng();
        if (current && Math.abs(current.lat - value.latitude) < 1e-6 && Math.abs(current.lng - value.longitude) < 1e-6) return;
        placeRef.current?.(value.latitude, value.longitude);
        map.setView([value.latitude, value.longitude], Math.max(map.getZoom(), 11));
    }, [value]);

    return (
        <div className="space-y-1.5">
            <div ref={containerRef} className="relative z-0 h-64 w-full overflow-hidden rounded-lg border" role="application" aria-label="Map: click to place the destination's pin" />
            <p className="text-xs text-muted-foreground">
                {value
                    ? `Pinned at ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}. Drag the pin to adjust.`
                    : 'Click the map to place a pin where this destination is. This puts it on tour route maps.'}
            </p>
        </div>
    );
}
