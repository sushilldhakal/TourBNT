'use client';

import { ReactNode, useEffect, useState } from 'react';

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places'];

interface GoogleMapsProviderProps {
    children: ReactNode;
}

// Check if Google Maps script is already loaded
const isGoogleMapsLoaded = (): boolean => {
    if (typeof window === 'undefined') return false;
    return typeof window.google !== 'undefined' && typeof window.google.maps !== 'undefined';
};

// Check if script tag already exists in DOM
const hasGoogleMapsScript = (): boolean => {
    if (typeof document === 'undefined') return false;
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src.includes('maps.googleapis.com/maps/api/js')) {
            return true;
        }
    }
    return false;
};

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [shouldLoad, setShouldLoad] = useState(() => {
        return !isGoogleMapsLoaded() && !hasGoogleMapsScript();
    });
    // Lazy load @react-google-maps/api (~250 KB) only when we need to inject the script
    const [LoadScriptComponent, setLoadScriptComponent] = useState<typeof import('@react-google-maps/api').LoadScript | null>(null);

    useEffect(() => {
        if (isGoogleMapsLoaded()) {
            setShouldLoad(false);
            return;
        }
        if (hasGoogleMapsScript()) {
            const checkInterval = setInterval(() => {
                if (isGoogleMapsLoaded()) {
                    setShouldLoad(false);
                    clearInterval(checkInterval);
                }
            }, 100);
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                setShouldLoad(false);
            }, 2000);
            return () => {
                clearInterval(checkInterval);
                clearTimeout(timeout);
            };
        }
    }, []);

    useEffect(() => {
        if (shouldLoad && apiKey && !LoadScriptComponent) {
            import('@react-google-maps/api').then((mod) => {
                setLoadScriptComponent(() => mod.LoadScript);
            });
        }
    }, [shouldLoad, apiKey, LoadScriptComponent]);

    if (!apiKey) {
        console.error('Google Maps API key is missing');
        return <>{children}</>;
    }

    if (!shouldLoad || isGoogleMapsLoaded() || hasGoogleMapsScript()) {
        return <>{children}</>;
    }

    if (!LoadScriptComponent) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <LoadScriptComponent
            googleMapsApiKey={apiKey}
            libraries={libraries}
            loadingElement={
                <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                </div>
            }
        >
            {children}
        </LoadScriptComponent>
    );
}
