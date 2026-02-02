import { PlaceResult } from "../hooks/useGooglePlacesAutocomplete";

/**
 * Generate Google Maps embed iframe code
 */
export function generateMapEmbedCode(lat: number, lng: number, apiKey: string): string {
  return `<iframe
  width="600"
  height="450"
  style="border:0"
  loading="lazy"
  allowfullscreen
  referrerpolicy="no-referrer-when-downgrade"
  src="https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}">
</iframe>`;
}

/**
 * Generate Google Maps URL
 */
export function generateMapUrl(place: PlaceResult): string {
  if (place.lat && place.lng) {
    return `https://www.google.com/maps?q=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(place.formattedAddress)}`;
}

/**
 * Generate embed URL for iframe
 */
export function generateEmbedUrl(place: PlaceResult, apiKey: string): string {
  if (place.lat && place.lng) {
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(
    place.formattedAddress
  )}`;
}