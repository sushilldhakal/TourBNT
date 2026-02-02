'use client';

import { useRef, useEffect, useCallback } from 'react';

export interface PlaceResult {
  formattedAddress: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
  placeId: string;
  name: string;
}

interface UseGooglePlacesAutocompleteProps {
  onPlaceSelected: (place: PlaceResult) => void;
  types?: string[];
  componentRestrictions?: google.maps.places.ComponentRestrictions;
}

export function useGooglePlacesAutocomplete({
  onPlaceSelected,
  types = ['geocode', 'establishment'],
  componentRestrictions,
}: UseGooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const parseAddressComponents = useCallback(
    (place: google.maps.places.PlaceResult): PlaceResult => {
      const result: PlaceResult = {
        formattedAddress: place.formatted_address || '',
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        lat: null,
        lng: null,
        placeId: place.place_id || '',
        name: place.name || '',
      };

      if (!place.address_components) return result;

      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes('street_number')) {
          result.street = component.long_name + ' ';
        }
        if (types.includes('route')) {
          result.street += component.long_name;
        }
        if (types.includes('locality')) {
          result.city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          result.state = component.long_name;
        }
        if (types.includes('country')) {
          result.country = component.long_name;
        }
        if (types.includes('postal_code')) {
          result.postalCode = component.long_name;
        }
      });

      if (place.geometry?.location) {
        result.lat = place.geometry.location.lat();
        result.lng = place.geometry.location.lng();
      }

      result.street = result.street.trim();

      return result;
    },
    []
  );

  useEffect(() => {
    if (!inputRef.current || !window.google) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['address_components', 'geometry', 'formatted_address', 'name', 'place_id'],
      types,
      componentRestrictions,
    });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place) {
        const parsedPlace = parseAddressComponents(place);
        onPlaceSelected(parsedPlace);
      }
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [onPlaceSelected, parseAddressComponents, types, componentRestrictions]);

  return { inputRef };
}
