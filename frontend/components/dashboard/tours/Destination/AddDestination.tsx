import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Image as ImageIcon, Save, Trash2, X, FolderPlus } from "lucide-react";
import { useDestination, useAllDestinations, useUserDestinations } from "./useDestination";
import { addDestination, addExistingDestinationToSeller, getUserToursTitle } from "@/lib/api/destinations";
import { Destination } from "@/lib/types";
import { GalleryPage } from "@/components/dashboard/gallery/GalleryPage";
import { JSONContent } from "novel";
import { getUserId } from "@/lib/utils/auth";
import NovelEditor from "../../editor/NovelEditor";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { MultiSelect, SelectValue } from "@/components/ui/MultiSelect";

interface DestinationFormData {
    name: string;
    coverImage: string;
    description: string;
    reason: string;
    isActive: boolean;
    country: string;
    region: string;
    city: string;
    popularity: number;
    featuredTours: string[]; // Array of tour IDs
}

interface TourTitle {
    _id: string;
    title: string;
    code?: string;
}

interface SearchDestination {
    _id: string;
    name: string;
    city?: string;
    region?: string;
    country: string;
    description: string;
    coverImage: string;
    isActive: boolean;
    featuredTours?: string[];
    popularity?: number;
    createdAt: string;
    userId?: string;
    approvalStatus?: string;
}

interface AddDestinationProps {
    onDestinationAdded: () => void;
}

const AddDestination = ({ onDestinationAdded }: AddDestinationProps) => {
    const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
    const [addingDestinationId, setAddingDestinationId] = useState<string | null>(null);

    // All destinations hook for MultiSelect
    const { data: allDestinations, isLoading: isLoadingAll } = useAllDestinations();

    // User's current destinations to filter out already added ones
    const { data: userDestinations } = useUserDestinations();

    // Filter out destinations that user already has
    const availableDestinations = (allDestinations?.data || []).filter((destination: SearchDestination) =>
        !(userDestinations?.data || []).some((userDest: Destination) => userDest._id === destination._id)
    );

    const [dialogOpen, setDialogOpen] = useState(false);
    const [descriptionContent, setDescriptionContent] = useState<JSONContent>({
        type: "doc",
        content: [{ type: "paragraph", content: [] }]
    });

    const { data: tourTitles } = useQuery({
        queryKey: ['tour-titles'],
        queryFn: () => getUserToursTitle(getUserId() || ''),
        enabled: !!getUserId(), // Only enable if userId exists
    });

    console.log("tourTitles", tourTitles)
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

    // Mutation for adding existing destination to seller's list
    const addExistingDestinationMutation = useMutation({
        mutationFn: (destinationId: string) => addExistingDestinationToSeller(destinationId),
        onSuccess: () => {
            toast({
                title: "Destination added to your list",
                description: "The existing destination has been added to your destinations.",
            });
            setAddingDestinationId(null);
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
                        <SearchableSelect
                            title="Add Existing Destinations"
                            description="Search and select existing destinations to add to your list instead of creating duplicates."
                            icon={<FolderPlus className="h-5 w-5" />}
                            options={availableDestinations.map((dest: SearchDestination) => ({
                                value: dest._id,
                                label: dest.name,
                                description: `${[dest.city, dest.region, dest.country].filter(Boolean).join(", ")}`,
                                imageUrl: dest.coverImage,
                                disable: false
                            }))}
                            value={selectedDestinations}
                            onValueChange={(selected) => {
                                // Find newly added destinations (difference between new and old selection)
                                const newlyAdded = selected.filter(id => !selectedDestinations.includes(id));

                                // Update state first
                                setSelectedDestinations(selected);

                                // Auto-add only newly selected destinations
                                newlyAdded.forEach((destId) => {
                                    addExistingDestinationMutation.mutate(destId);
                                });
                            }}
                            placeholder={isLoadingAll ? "Loading destinations..." : "Search and select existing destinations..."}
                            searchPlaceholder="Search destinations by name, city, or country..."
                            emptyMessage="No destinations found"
                            loading={isLoadingAll}
                            className="w-full"
                        />
                        <div className="mt-3 text-xs text-chart-4 bg-chart-4/10 p-2 rounded border border-chart-4/30">
                            Selected destinations will be added to your list automatically
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
                                                <div className="relative mt-2 rounded-md overflow-hidden border">
                                                    <img src={field.value} alt="Cover" className="w-full h-[300px] object-cover rounded-md" />
                                                    <div className="absolute top-2 right-2 flex gap-2">
                                                        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => {
                                                            if (typeof field.value === 'string' && field.value) {
                                                                window.open(field.value, '_blank');
                                                            }
                                                        }}>
                                                            <ImageIcon className="w-4 h-4" />
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
                                                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                                            <span>Select cover image</span>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl h-[80vh] overflow-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Select Cover Image</DialogTitle>
                                                            <DialogDescription>Choose a photo from your gallery</DialogDescription>
                                                        </DialogHeader>
                                                        <GalleryPage
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


                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Destination Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Kathmandu" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {["country", "region", "city"].map((fieldName) => (
                                        <FormField
                                            key={fieldName}
                                            control={form.control}
                                            name={fieldName as "country" | "region" | "city"}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="capitalize">{fieldName}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={`Enter ${fieldName}`} {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    ))}

                                    <FormField
                                        control={form.control}
                                        name="popularity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Popularity</FormLabel>
                                                <FormControl>
                                                    <Input type="number" disabled placeholder="e.g., 10" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="featuredTours"
                                        render={({ field }) => {
                                            // Extract current field value and handle nested arrays
                                            let fieldValue: string[] = [];
                                            if (Array.isArray(field.value)) {
                                                if (Array.isArray(field.value[0])) {
                                                    // It's a nested array, extract the inner array
                                                    fieldValue = field.value[0];
                                                } else {
                                                    // It's a flat array
                                                    fieldValue = field.value;
                                                }
                                            }

                                            // Format current values to match MultiSelect expected format
                                            const currentValues: SelectValue[] = Array.isArray(fieldValue) ?
                                                fieldValue.map(val => {
                                                    // Handle different possible formats
                                                    if (typeof val === 'string') {
                                                        return { value: val, label: val } as SelectValue;
                                                    } else if (val && typeof val === 'object' && 'value' in val) {
                                                        return val as SelectValue;
                                                    }
                                                    return { value: '', label: '' } as SelectValue;
                                                }).filter(val => {
                                                    const typedVal = val as { value: string; label: string };
                                                    return typedVal.value !== '';
                                                }) : [];

                                            return (
                                                <FormItem>
                                                    <FormLabel>Featured Tours</FormLabel>
                                                    <FormControl>
                                                        <MultiSelect
                                                            options={(Array.isArray(tourTitles) ? tourTitles : tourTitles?.data || []).map((item: TourTitle) => ({
                                                                value: item._id,
                                                                label: item.code ? `${item.title} (${item.code})` : item.title,
                                                            }))}
                                                            value={currentValues}
                                                            onValueChange={(selectedValues: SelectValue[]) => {
                                                                // Ensure only the string values (IDs) are passed to RHF
                                                                const ids = selectedValues.map((val: SelectValue) =>
                                                                    typeof val === 'string' ? val : val.value
                                                                );
                                                                field.onChange(ids);
                                                            }}
                                                            placeholder="Select featured tours"
                                                            className="w-full"
                                                            disabled={false}
                                                            maxDisplayValues={2}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />

                                    {/* <FormField
                                        control={form.control}
                                        name="featuredTours"
                                        render={({ field }) => {
                                            return (
                                                <FormItem>
                                                    <FormLabel>Featured Tours</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            value={field.value.join(",")}
                                                            onChange={(e) => field.onChange(e.target.value.split(",").map((x) => x.trim()))}
                                                            placeholder="Comma-separated tour IDs" />
                                                    </FormControl>
                                                </FormItem>
                                            );
                                        }}
                                    /> */}
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
                                <FormItem className="mt-6">
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
                                <FormItem className="mt-6">
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
