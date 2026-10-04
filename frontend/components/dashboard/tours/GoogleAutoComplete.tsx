'use client';

import { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface GoogleAutoCompleteProps {
    onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
}

export function GoogleAutoComplete({ onPlaceSelected }: GoogleAutoCompleteProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        if (!inputRef.current || !window.google) return;

        // Initialize Google Places Autocomplete
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            fields: ['address_components', 'geometry', 'formatted_address', 'name'],
            types: ['geocode', 'establishment'],
        });

        // Listen for place selection
        const listener = autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (place && onPlaceSelected) {
                onPlaceSelected(place);
            }
        });

        return () => {
            if (listener) {
                google.maps.event.removeListener(listener);
            }
        };
    }, [onPlaceSelected]);

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                ref={inputRef}
                placeholder="Search for a location..."
                className="h-11 pl-10"
            />
        </div>
    );
}