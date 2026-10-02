'use client';

import { useCallback, useEffect, useState } from 'react';

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
    const [coords, setCoords] = useState<UserCoords | null>(null);
    const [status, setStatus] = useState<LocationStatus>('checking');

    const request = useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setStatus('unsupported');
            return;
        }
        setStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const next = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
                try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage blocked: fine */ }
                setCoords(next);
                setStatus('ready');
            },
            () => setStatus('denied'),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
        );
    }, []);

    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setStatus('unsupported');
            return;
        }
        const stored = readStored();
        if (stored) {
            setCoords(stored);
            setStatus('ready');
            return;
        }
        // Already granted earlier -> use it without asking again. Never trigger a prompt from here.
        if (!navigator.permissions?.query) {
            setStatus('prompt');
            return;
        }
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((p) => {
            if (p.state === 'granted') request();
            else if (p.state === 'denied') setStatus('denied');
            else setStatus('prompt');
        }).catch(() => setStatus('prompt'));
    }, [request]);

    return { coords, status, request };
}
