'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsClient } from './useIsClient';

export interface UserCoords {
    lat: number;
    lng: number;
}

/** 'checking' = still working out whether location is available; callers should wait before using it. */
export type LocationStatus = 'checking' | 'unsupported' | 'prompt' | 'loading' | 'ready' | 'denied';

const STORAGE_KEY = 'tourbnt:location';

// ~1 km precision: plenty to pick the nearest destination, and nothing finer ever leaves the browser.
const round = (n: number) => Math.round(n * 100) / 100;

function readStored(): UserCoords | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as UserCoords) : null;
        return parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * The visitor's approximate location, only ever with their consent. Never prompts on its own: if the
 * browser already allows location it is used silently; otherwise `status` is 'prompt' and the page
 * can offer a button that calls `request()`. Coordinates are kept for the browser session only.
 */
export function useUserLocation() {
    const isClient = useIsClient();
    // Read once on the client: geolocation support and coordinates kept from earlier in this session.
    const supported = isClient && typeof navigator !== 'undefined' && !!navigator.geolocation;
    const stored = useMemo(() => (isClient ? readStored() : null), [isClient]);
    const [located, setLocated] = useState<UserCoords | null>(null);
    // Status from the permission check or a request(); null until one has run.
    const [checked, setChecked] = useState<Exclude<LocationStatus, 'checking' | 'unsupported'> | null>(null);

    const request = useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;
        setChecked('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const next = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
                try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage blocked: fine */ }
                setLocated(next);
                setChecked('ready');
            },
            () => setChecked('denied'),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
        );
    }, []);

    useEffect(() => {
        if (!supported || stored) return;
        // Already granted earlier -> use it without asking again. Never trigger a prompt from here.
        if (!navigator.permissions?.query) return;
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((p) => {
            if (p.state === 'granted') request();
            else setChecked(p.state === 'denied' ? 'denied' : 'prompt');
        }).catch(() => setChecked('prompt'));
    }, [supported, stored, request]);

    const coords = located ?? stored;
    let status: LocationStatus;
    if (!isClient) status = 'checking';
    else if (!supported) status = 'unsupported';
    else if (checked) status = checked;
    else if (stored) status = 'ready';
    // No permissions API to ask: offer the button.
    else status = typeof navigator.permissions?.query === 'function' ? 'checking' : 'prompt';

    return { coords, status, request };
}
