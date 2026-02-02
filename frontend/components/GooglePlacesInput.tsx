'use client';

import { forwardRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PlaceResult, useGooglePlacesAutocomplete } from '@/lib/hooks/useGooglePlacesAutocomplete';

interface GooglePlacesInputProps {
    onPlaceSelected: (place: PlaceResult) => void;
    placeholder?: string;
    className?: string;
    types?: string[];
    componentRestrictions?: google.maps.places.ComponentRestrictions;
    icon?: 'search' | 'pin' | 'none';
}

export const GooglePlacesInput = forwardRef<HTMLInputElement, GooglePlacesInputProps>(
    (
        {
            onPlaceSelected,
            placeholder = 'Search for a location...',
            className,
            types,
            componentRestrictions,
            icon = 'search',
        },
        externalRef
    ) => {
        const { inputRef } = useGooglePlacesAutocomplete({
            onPlaceSelected,
            types,
            componentRestrictions,
        });

        const IconComponent = icon === 'search' ? Search : icon === 'pin' ? MapPin : null;

        return (
            <div className="relative">
                {IconComponent && (
                    <IconComponent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                )}
                <Input
                    ref={(node) => {
                        // Handle both refs
                        if (inputRef) {
                            // eslint-disable-next-line react-hooks/immutability
                            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
                        }
                        if (typeof externalRef === 'function') {
                            externalRef(node);
                        } else if (externalRef) {
                            externalRef.current = node;
                        }
                    }}
                    placeholder={placeholder}
                    className={cn('h-11', icon !== 'none' && 'pl-10', className)}
                />
            </div>
        );
    }
);

GooglePlacesInput.displayName = 'GooglePlacesInput';