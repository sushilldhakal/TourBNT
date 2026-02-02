import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
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
import { useUserDestinations, useAllDestinationsForSelect, useCacheManager } from '@/lib/queries';
import { addDestination, addExistingDestinationToSeller } from '@/lib/api/destinations';
import { DestinationTypes, TourTitle } from "@/types/types";
import type { DestinationFormData } from "@/types/destination";
import { Gallery } from "@/components/dashboard/gallery/Gallery";
import type { JSONContent } from "novel";

const NovelEditor = dynamic(() => import("@/components/dashboard/editor/NovelEditor"), { ssr: false });
import { MultiSelect } from "@/components/ui/MultiSelect";
import { PlaceResult } from "@/lib/hooks/useGooglePlacesAutocomplete";
import { GooglePlacesInput } from "@/components/GooglePlacesInput";
import Image from "next/image";

// Helper component to render image as icon in MultiSelect
// Note: MultiSelect applies h-4 w-4 className, so we use inline styles to override
const OptionImageIcon = ({ imageUrl, alt }: { imageUrl?: string; alt?: string }) => {
    if (!imageUrl) return null;
    return (
        <div
            className="relative rounded-md overflow-hidden flex-shrink-0"
            style={{
                marginRight: '12px',
                height: '48px',
                width: '48px',
            }}
        >
            <Image
                src={imageUrl}
                alt={alt || "Option"}
                fill
                className="object-cover"
                sizes="48px"
            />
        </div>
    );
};

interface AddDestinationProps {
    onDestinationAdded: () => void;
}

const AddDestination = ({ onDestinationAdded }: AddDestinationProps) => {
    const { invalidateDestinations } = useCacheManager();
    const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
    const [addingDestinationId, setAddingDestinationId] = useState<string | null>(null);
    const [showManualEntry, setShowManualEntry] = useState(false);

    const { data: allDestinations = [], isLoading: isLoadingAll } = useAllDestinationsForSelect();
    const { data: userDestinations } = useUserDestinations();

    const allDestinationsArray = Array.isArray(allDestinations) ? allDestinations : [];

    // useUserDestinations returns array directly
    const userDestinationsArray = Array.isArray(userDestinations) ? userDestinations : [];

    // Filter out destinations that user already has
    // Normalize IDs to handle both _id and id fields
    const availableDestinations = allDestinationsArray.filter((destination: DestinationTypes) => {
        const destId = (destination as any)._id || (destination as any).id;
        return !userDestinationsArray.some((userDest: DestinationTypes) => {
            const userDestId = (userDest as any)._id || (userDest as any).id;
            return userDestId === destId;
        });
    });

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
    // Destination mutation for creating new destinations
    const destinationMutation = useMutation({
        mutationFn: (data: FormData) => addDestination(data),
        onSuccess: () => {
            toast({
                title: "Destination submitted",
                description: "The destination has been submitted successfully.",
            });
            form.reset();
            invalidateDestinations({ my: true, admin: true, pending: true, approved: true });
            onDestinationAdded();
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

        // If name is empty, suggest the city name
        if (!form.getValues('name')) {
            form.setValue('name', place.city || place.name, { shouldDirty: true });
        }
    }, [form]);

    // Mutation for adding existing destination to seller's list
    const addExistingDestinationMutation = useMutation({
        mutationFn: (destinationId: string) => addExistingDestinationToSeller(destinationId),
        onSuccess: () => {
            toast({
                title: "Destination added to your list",
                description: "The existing destination has been added to your destinations.",
            });
            setAddingDestinationId(null);
            invalidateDestinations({ my: true, admin: true, approved: true });
            onDestinationAdded();
        },
        onError: () => {
            toast({
                title: "Failed to add destination",
                description: "There was an error adding the existing destination.",
                variant: "destructive",
            });
            setAddingDestinationId(null);
        }
    });

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
                        {/* Search existing destinations */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <FolderPlus className="h-5 w-5 text-primary" />
                                <div>
                                    <h3 className="text-sm font-medium">Add Existing Destinations</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Search and select existing destinations to add to your list instead of creating duplicates.
                                    </p>
                                </div>
                            </div>
                            <MultiSelect
                                popoverClassName="w-full min-w-[400px]"
                                matchTriggerWidth={true}
                                options={availableDestinations.map((dest: DestinationTypes) => {
                                    // Normalize ID - handle both _id and id fields
                                    const destId = (dest as any)._id || (dest as any).id;
                                    if (!destId) {
                                        console.warn('Destination missing ID:', dest);
                                    }
                                    const location = [dest.city, dest.region, dest.country].filter(Boolean).join(", ");
                                    const locationCode = [dest.city, dest.country]
                                        .filter((s): s is string => Boolean(s))
                                        .map((s: string) => s.substring(0, 3).toUpperCase())
                                        .join("-");
                                    return {
                                        value: destId || '',
                                        label: `${dest.name}${location ? ` • ${location}` : ''}${locationCode ? ` (${locationCode})` : ''}`,
                                        icon: () => <OptionImageIcon imageUrl={dest.coverImage} alt={dest.name} />,
                                        style: {
                                            badgeColor: "hsl(var(--primary))",
                                        },
                                    };
                                }).filter(opt => opt.value)} // Filter out options without valid IDs
                                defaultValue={selectedDestinations}
                                onValueChange={async (selected) => {
                                    // Find newly added destinations (difference between new and old selection)
                                    const newlyAdded = selected.filter(id => !selectedDestinations.includes(id));

                                    if (newlyAdded.length > 0) {
                                        // Optimistically update selection
                                        setSelectedDestinations(selected);

                                        for (const destId of newlyAdded) {
                                            // Validate destinationId before making the API call
                                            if (!destId || destId === 'undefined' || destId === 'null') {
                                                console.error('Invalid destination ID:', destId);
                                                toast({
                                                    title: "Invalid destination",
                                                    description: "The selected destination has an invalid ID. Please try again.",
                                                    variant: "destructive",
                                                });
                                                // Revert this id on error
                                                setSelectedDestinations(prev => prev.filter(id => id !== destId));
                                                continue;
                                            }

                                            try {
                                                await addExistingDestinationMutation.mutateAsync(destId);
                                            } catch (error) {
                                                // Revert this id on error
                                                setSelectedDestinations(prev => prev.filter(id => id !== destId));
                                                toast({
                                                    title: "Failed to add destination",
                                                    description: "Could not add destination. Please try again.",
                                                    variant: "destructive",
                                                });
                                                break;
                                            }
                                        }
                                    } else {
                                        // Simple removal / reorder case
                                        setSelectedDestinations(selected);
                                    }
                                }}
                                placeholder={isLoadingAll ? "Loading destinations..." : "Search and select existing destinations..."}
                                emptyIndicator={isLoadingAll ? "Loading destinations..." : "No destinations found"}
                                disabled={isLoadingAll}
                                className="w-full"
                            />
                            <div className="mt-3 text-xs text-chart-4 bg-chart-4/10 p-2 rounded border border-chart-4/30">
                                Selected destinations will be added to your list automatically
                            </div>
                        </div>

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
                                    {(showManualEntry || form.watch('city') || form.watch('region') || form.watch('country')) && (
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
