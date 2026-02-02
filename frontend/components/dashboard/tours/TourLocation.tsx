'use client';

import { useFormContext } from 'react-hook-form';
import { useMemo, useState, useCallback } from 'react';
import { MapPin, Map, Navigation, Globe, MapPinned } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DestinationTypes } from '@/types/types';
import { useDestinationsRoleBased } from '@/lib/queries/useDestinations';
import { PlaceResult } from '@/components/hooks/useGooglePlacesAutocomplete';
import { generateMapEmbedCode } from '@/lib/utils/googleMapsUtils';
import { GooglePlacesInput } from '@/components/GooglePlacesInput';

export function TourLocation() {
    const form = useFormContext();
    const [showManualEntry, setShowManualEntry] = useState(false);
    const { data: destinations = [], isLoading: destinationsLoading } = useDestinationsRoleBased();

    const hasLocationData = useMemo(() => {
        const location = form.watch('location');
        return !!(location?.street || location?.city || location?.state || location?.country || location?.lat || location?.lng);
    }, [form]);

    const handlePlaceSelected = useCallback(
        (place: PlaceResult) => {
            // Update form values
            form.setValue('location.street', place.street, { shouldDirty: true });
            form.setValue('location.city', place.city, { shouldDirty: true });
            form.setValue('location.state', place.state, { shouldDirty: true });
            form.setValue('location.country', place.country, { shouldDirty: true });
            form.setValue('location.lat', place.lat || undefined, { shouldDirty: true });
            form.setValue('location.lng', place.lng || undefined, { shouldDirty: true });
            // Generate and set map embed
            if (place.lat && place.lng) {
                const embedCode = generateMapEmbedCode(
                    place.lat,
                    place.lng,
                    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
                );
                form.setValue('map', embedCode, { shouldDirty: true });
            }
        },
        [form]
    );

    return (
        <Card className="overflow-hidden">
            <CardHeader className="space-y-1">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold">Tour Location</CardTitle>
                        <CardDescription className="text-sm">Search or manually enter starting point details</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-8">
                {/* Destination Select */}
                <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">Destination</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select a destination" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {destinationsLoading ? (
                                        <div className="px-2 py-3 text-center text-sm text-muted-foreground">Loading destinations...</div>
                                    ) : Array.isArray(destinations) && destinations.length > 0 ? (
                                        (destinations as DestinationTypes[]).map((destination) => (
                                            <SelectItem
                                                disabled={destination.isActive === false}
                                                key={destination._id}
                                                value={destination._id}
                                            >
                                                {destination.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-2 py-3 text-center text-sm text-muted-foreground">No destinations available</div>
                                    )}
                                </SelectContent>
                            </Select>
                            <FormDescription>Manage destinations in your settings</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Google Places Search */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPinned className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-medium">Location Search</h3>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowManualEntry(!showManualEntry)}>
                            {showManualEntry ? 'Use Search' : 'Manual Entry'}
                        </Button>
                    </div>

                    {!showManualEntry && <GooglePlacesInput onPlaceSelected={handlePlaceSelected} icon="pin" />}
                </div>

                {/* Address Section */}
                {(showManualEntry || hasLocationData) && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-medium">Address Details</h3>
                        </div>

                        <div className="grid gap-5">
                            <FormField
                                control={form.control}
                                name="location.street"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Street Address</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ''} placeholder="123 Main Street" className="h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="location.city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} placeholder="City" className="h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="location.state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State / Province</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} placeholder="State" className="h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="location.country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Country</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ''} placeholder="Country" className="h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="location.lat"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Latitude</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    value={field.value || ''}
                                                    placeholder="40.7128"
                                                    className="h-11"
                                                    type="number"
                                                    step="any"
                                                    onChange={(e) => {
                                                        // Convert string to number
                                                        const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                                        field.onChange(value);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="location.lng"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Longitude</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    value={field.value || ''}
                                                    placeholder="-74.0060"
                                                    className="h-11"
                                                    type="number"
                                                    step="any"
                                                    onChange={(e) => {
                                                        // Convert string to number
                                                        const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                                        field.onChange(value);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Map Embed Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Map className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium">Map Embed (Optional)</h3>
                    </div>
                    <FormField
                        control={form.control}
                        name="map"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        value={field.value || ''}
                                        placeholder="Auto-generated or paste custom Google Maps iframe embed code..."
                                        className="min-h-[80px] resize-none font-mono text-xs"
                                    />
                                </FormControl>
                                <FormDescription>Map embed is auto-generated when you search for a location</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Map Preview */}
                <div className="overflow-hidden rounded-xl border bg-muted/30">
                    <div className="relative aspect-[16/9] w-full">
                        {!hasLocationData && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                    <Globe className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">Search for a location to preview map</p>
                            </div>
                        )}
                        {hasLocationData && (
                            <div className="absolute inset-0">
                                {form.watch('map') ? (
                                    <div
                                        className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
                                        dangerouslySetInnerHTML={{ __html: form.watch('map') || '' }}
                                    />
                                ) : (
                                    <iframe
                                        className="h-full w-full border-0"
                                        loading="lazy"
                                        allowFullScreen
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                                            }&q=${encodeURIComponent(
                                                [form.watch('location.street'), form.watch('location.city'), form.watch('location.state'), form.watch('location.country')]
                                                    .filter(Boolean)
                                                    .join(', ')
                                            )}`}
                                        title="Location Map"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}