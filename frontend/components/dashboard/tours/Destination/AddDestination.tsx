import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useForm, useWatch } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Save, Trash2, X, FolderPlus } from "lucide-react";
import { useAuth } from '@/lib/hooks/useAuth';
import { useCacheManager } from '@/lib/queries';
import { addDestination, getAvailableDestinationsPage, bulkAddDestinations } from '@/lib/api/destinations';
import { ExistingItemsPicker } from '@/components/dashboard/shared/ExistingItemsPicker';
import type { DestinationFormData } from "@/types/destination";
import { Gallery } from "@/components/dashboard/gallery/Gallery";
import type { JSONContent } from "novel";

const NovelEditor = dynamic(() => import("@/components/dashboard/editor/NovelEditor"), { ssr: false });
// Leaflet needs the browser.
const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-muted" /> });
import type { LatLng } from "./LocationPicker";
import { PlaceResult } from "@/lib/hooks/useGooglePlacesAutocomplete";
import { GooglePlacesInput } from "@/components/GooglePlacesInput";
import Image from "next/image";


interface AddDestinationProps {
    onDestinationAdded: (created?: unknown) => void;
}

const AddDestination = ({ onDestinationAdded }: AddDestinationProps) => {
    // Admins manage the global list directly; "add existing" is for sellers building their own list.
    const isAdmin = useAuth().userRole === 'admin';
    const { invalidateDestinations } = useCacheManager();
    const [showManualEntry, setShowManualEntry] = useState(false);
    // Where the destination is on the map (route maps use it). Set by the search box or by clicking the map.
    const [position, setPosition] = useState<LatLng | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [descriptionContent, setDescriptionContent] = useState<JSONContent>({
        type: "doc",
        content: [{ type: "paragraph", content: [] }]
    });


    const form = useForm<DestinationFormData>({
        defaultValues: {
            name: "",
            coverImage: "",
            description: "",
            reason: "",
            isActive: true,
            country: "",
            region: "",
            city: "",
            popularity: 0,
            featuredTours: [],
        }
    });
    const [watchedCity, watchedRegion, watchedCountry] = useWatch({ control: form.control, name: ['city', 'region', 'country'] });
    // Destination mutation for creating new destinations
    const destinationMutation = useMutation({
        mutationFn: (data: FormData) => addDestination(data),
        onSuccess: (created) => {
            toast({
                title: "Destination submitted",
                description: "The destination has been submitted successfully.",
            });
            form.reset();
            setPosition(null);
            invalidateDestinations({ my: true, admin: true, pending: true, approved: true });
            onDestinationAdded(created);
        },
        onError: (error) => {
            toast({
                title: "Failed to add destination",
                description: "There was an error adding the destination.",
                variant: "destructive",
            });
            console.error(error);
        }
    });

    // Handle place selection from Google Places
    const handlePlaceSelected = useCallback((place: PlaceResult) => {
        // Auto-fill location fields from Google Places
        form.setValue('city', place.city, { shouldDirty: true });
        form.setValue('region', place.state, { shouldDirty: true });
        form.setValue('country', place.country, { shouldDirty: true });
        if (place.lat != null && place.lng != null) setPosition({ latitude: place.lat, longitude: place.lng });

        // If name is empty, suggest the city name
        if (!form.getValues('name')) {
            form.setValue('name', place.city || place.name, { shouldDirty: true });
        }
    }, [form]);

    // Handle form submission
    const onSubmit = async (values: DestinationFormData) => {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('description', values.description);
        formData.append('reason', values.reason);
        formData.append('coverImage', values.coverImage);
        formData.append('isActive', values.isActive.toString());
        formData.append('country', values.country);
        formData.append('region', values.region);
        formData.append('city', values.city);
        formData.append('popularity', values.popularity.toString());
        if (position) {
            formData.append('latitude', String(position.latitude));
            formData.append('longitude', String(position.longitude));
        }
        values.featuredTours.forEach((id) => formData.append('featuredTours[]', id));
        await destinationMutation.mutateAsync(formData);
    };

    // Handle image selection from gallery
    const handleImageSelect = (coverImage: string, onChange: (value: string) => void) => {
        onChange(coverImage);
        setDialogOpen(false);
    };

    // Handle removing the image
    const handleRemoveImage = (onChange: (value: string) => void) => {
        onChange('');
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card className="shadow-xs border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                                New Destination
                            </Badge>
                        </div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <FolderPlus className="h-5 w-5 text-primary" />
                            Add New Destination
                        </CardTitle>
                        <CardDescription>
                            Add a new destination location for your tours
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid gap-6">
                        {/* Add existing destinations — search, tick or select all, add in ONE request */}
                        {!isAdmin && (
<ExistingItemsPicker
                            noun="destination"
                            nounPlural="destinations"
                            queryKey="destinations"
                            fetchPage={async (params) => {
                                const page = await getAvailableDestinationsPage(params);
                                return {
                                    ...page,
                                    items: page.items.map((d) => ({
                                        id: d.id,
                                        title: d.name,
                                        subtitle: [d.city, d.region, d.country].filter(Boolean).join(', '),
                                        imageUrl: d.coverImage ?? undefined,
                                    })),
                                };
                            }}
                            bulkAdd={bulkAddDestinations}
                            onAdded={({ added, ids }) => {
                                invalidateDestinations({ my: true, admin: true, approved: true });
                                if (added > 0) onDestinationAdded(ids && ids.length === 1 ? { id: ids[0] } : undefined);
                            }}
                        />
)}

                        {/* Split layout */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Left: Image selector */}
                            <div className="col-span-1">
                                <FormField
                                    control={form.control}
                                    name="coverImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium text-muted-foreground">Cover Image</FormLabel>
                                            {field.value ? (
                                                <div className="relative mt-2 rounded-md overflow-hidden border h-[300px]">
                                                    <Image
                                                        src={field.value}
                                                        alt="Cover"
                                                        fill
                                                        className="object-cover rounded-md"
                                                        sizes="(max-width: 768px) 100vw, 400px"
                                                    />
                                                    <div className="absolute top-2 right-2 flex gap-2">
                                                        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => {
                                                            if (typeof field.value === 'string' && field.value) {
                                                                window.open(field.value, '_blank');
                                                            }
                                                        }}>
                                                            <Image src="/placeholder.svg" alt="View" width={16} height={16} className="w-4 h-4" />
                                                        </Button>
                                                        <Button type="button" size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleRemoveImage(field.onChange)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" className="w-full h-[300px] border-dashed flex flex-col items-center justify-center text-sm">
                                                            <Image src="/placeholder.svg" alt="" width={24} height={24} className="w-6 h-6 text-muted-foreground" />
                                                            <span>Select cover image</span>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] left-1/2 -translate-x-1/2 max-h-[90vh] p-4">
                                                        <DialogHeader>
                                                            <DialogTitle>Select Cover Image</DialogTitle>
                                                            <DialogDescription>Choose a photo from your gallery</DialogDescription>
                                                        </DialogHeader>
                                                        <Gallery
                                                            mode="picker"
                                                            onMediaSelect={(url) => handleImageSelect(url as string, field.onChange)}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Right: Inputs */}
                            <div className="col-span-2 grid gap-4">


                                <div className="grid grid-cols-1 gap-4">
                                    {/* Destination Name */}
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Destination Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Kathmandu Valley" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Google Places Search Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-sm font-medium">Location Details</FormLabel>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowManualEntry(!showManualEntry)}
                                            >
                                                {showManualEntry ? 'Use Search' : 'Manual Entry'}
                                            </Button>
                                        </div>

                                        {!showManualEntry && (
                                            <div className="space-y-2">
                                                <GooglePlacesInput
                                                    onPlaceSelected={handlePlaceSelected}
                                                    placeholder="Search for city, region, or country..."
                                                    icon="pin"
                                                    types={['(cities)', '(regions)']}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Search and select a location to auto-fill city, region, and country
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Location Fields - Show when manual entry or after selection */}
                                    {(showManualEntry || watchedCity || watchedRegion || watchedCountry) && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-secondary/30">
                                            <FormField
                                                control={form.control}
                                                name="city"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>City</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter city" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="region"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Region / State</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter region" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="country"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Country</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter country" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* Map position */}
                                    <div className="space-y-2">
                                        <FormLabel className="text-sm font-medium">Location on the map</FormLabel>
                                        <LocationPicker value={position} onChange={setPosition} />
                                    </div>

                                    {/* Active toggle */}
                                    <FormField
                                        control={form.control}
                                        name="isActive"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-md border p-3 mt-2">
                                                <div>
                                                    <FormLabel className="text-sm font-medium">Active Status</FormLabel>
                                                    <p className="text-xs text-muted-foreground">
                                                        {field.value ? "Destination is active." : "Destination is inactive."}
                                                    </p>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>



                            {/* Description section (Full width) */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="mt-6 w-full">
                                        <FormLabel>Description</FormLabel>
                                        <div className="border rounded-md overflow-hidden">
                                            <NovelEditor
                                                initialValue={descriptionContent}
                                                onContentChange={(content: JSONContent) => {
                                                    setDescriptionContent(content);
                                                    const plainText = content?.content?.map((node) =>
                                                        node?.content?.map((n) => n?.text).join(" ")
                                                    ).join("\n") || "";
                                                    field.onChange(plainText);
                                                }}
                                                placeholder="Describe the tour details..."
                                                minHeight="300px"
                                                enableAI={false}
                                                enableGallery={true}
                                            />

                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* Reason section */}
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem className="mt-6 w-full">
                                        <FormLabel>Reason for Adding Destination</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Popular tourist destination with high demand, unique cultural significance, etc."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t px-6 py-4 bg-secondary/50">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                form.reset();
                                onDestinationAdded(); // This will hide the form
                            }}
                            className="gap-1.5"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={destinationMutation.isPending}
                            className="gap-1.5"
                        >
                            <Save className="h-3.5 w-3.5" />
                            Create Destination
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
};

export default AddDestination;
