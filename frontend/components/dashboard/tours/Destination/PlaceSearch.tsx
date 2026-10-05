'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { PlaceHit } from '@/lib/places';

export function PlaceSearch({ onSelect }: { onSelect: (place: PlaceHit) => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PlaceHit[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const q = query.trim();
        const timer = setTimeout(() => {
            if (q.length < 2) {
                setResults([]);
                setOpen(false);
                return;
            }
            fetch(`/api/places/search?q=${encodeURIComponent(q)}`)
                .then((response) => (response.ok ? response.json() : []))
                .then((places: PlaceHit[]) => {
                    setResults(Array.isArray(places) ? places : []);
                    setOpen(true);
                })
                .catch(() => setResults([]));
        }, 400);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="relative space-y-2">
            <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for city, region, or country..."
                aria-label="Search OpenStreetMap for a place"
                autoComplete="off"
            />
            {open && results.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                    {results.map((place) => (
                        <li key={`${place.lat},${place.lng},${place.label}`}>
                            <button
                                type="button"
                                className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                                onClick={() => {
                                    onSelect(place);
                                    setQuery(place.label);
                                    setOpen(false);
                                }}
                            >
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>{place.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <p className="text-xs text-muted-foreground">
                Search OpenStreetMap to fill city, region, and country, and to drop the pin.
            </p>
        </div>
    );
}
