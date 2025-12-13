import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Edit, FileText, MapPin, Image as ImageIcon, Save, Trash2, X, Eye, EyeOff, Globe, Users, Star, Calendar } from "lucide-react";
import { updateDestination, removeExistingDestinationFromSeller, deleteDestination, getUserToursTitle, getSellerDestinations, getUserDestinations, toggleDestinationActiveStatus } from "@/lib/api/destinationApi";
import { getUserId, getUserRole } from "@/lib/auth/authUtils";
import { GalleryPage } from "@/components/dashboard/gallery/GalleryPage";

import { MultiSelect, SelectValue } from "@/components/ui/MultiSelect";
import RichTextRenderer from "@/components/RichTextRenderer";
import { NovelEditor } from "../../editor";

interface SingleDestinationProps {
    destinationId: string;
    onUpdate: () => void;
    onDelete?: () => void;  // Add this line
}

interface TourTitle {
    _id: string;
    title: string;
}

interface TourObject {
    _id?: string;
    id?: string;
    title?: string;
}

interface DescriptionContent {
    type?: string;
    content?: Array<{
        type?: string;
        content?: Array<{
            type?: string;
            text?: string;
        }>;
    }>;
}

interface OriginalDestinationValues {
    name: string;
    description: string;
    coverImage: string;
    isActive: boolean;
    country: string;
    region: string;
    city: string;
    featuredTours: string[];
}

const SingleDestination = ({ destinationId, onUpdate, onDelete }: SingleDestinationProps) => {
    const userId = getUserId();
    const queryClient = useQueryClient();
    const [isEditMode, setIsEditMode] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
    const [descriptionContent, setDescriptionContent] = useState<DescriptionContent | string>('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const form = useForm({
        defaultValues: {
            name: '',
            description: '',
            coverImage: '',
            isActive: true,
            country: '',
            region: '',
            city: '',
            featuredTours: []
        }
    });

    // Check user role to determine which data source to use
    const userRole = getUserRole();
    const isAdmin = userRole === 'admin';

    // Fetch destinations based on user role
    // Admin: Use global destinations, Seller: Use user-specific destinations
    const { data: globalDestinations, isLoading: globalLoading, isError: globalError } = useQuery({
        queryKey: ['seller-destinations'],
        queryFn: getSellerDestinations,
        enabled: isAdmin, // Only fetch for admin users
    });

    const { data: userDestinations, isLoading: userLoading, isError: userError } = useQuery({
        queryKey: ['user-destinations'],
        queryFn: getUserDestinations,
        enabled: !isAdmin, // Only fetch for non-admin users
    });

    // Choose the appropriate data source
    const destinationsData = isAdmin ? globalDestinations : userDestinations;
    const isLoading = isAdmin ? globalLoading : userLoading;
    const isError = isAdmin ? globalError : userError;

    // Find the specific destination from the appropriate data source
    const destination = destinationsData?.data?.find((dest: { _id: string }) => dest._id === destinationId);


    // Fetch tour titles
    const { data: tourTitles } = useQuery({
        queryKey: ['tourTitles', userId],
        queryFn: () => getUserToursTitle(userId!),
        enabled: !!userId,
    });


    // Update destination mutation
    const updateMutation = useMutation({
        mutationFn: (data: FormData) => updateDestination(destinationId, data),
        onSuccess: () => {
            toast({
                title: "Destination updated",
                description: "The destination has been updated successfully.",
            });
            setIsEditMode(false);
            // Invalidate and refetch the destination data to show the updated featured tours
            queryClient.invalidateQueries({
                queryKey: ['destination', destinationId]
            });
            // Also invalidate the tour titles to ensure we have the latest data
            if (userId) {
                queryClient.invalidateQueries({
                    queryKey: ['tourTitles', userId]
                });
            }
            onUpdate();
        },
        onError: (error) => {
            toast({
                title: "Failed to update",
                description: `There was an error updating the destination: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    // Toggle active status mutation
    const toggleActiveMutation = useMutation({
        mutationFn: () => toggleDestinationActiveStatus(destinationId),
        onSuccess: (data) => {
            toast({
                title: "Status updated",
                description: data.message || "Destination status has been updated successfully.",
            });
            // Update the form value to reflect the new status
            if (data.data?.isActive !== undefined) {
                form.setValue('isActive', data.data.isActive);
            }

            // Invalidate the appropriate query based on user role
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-destinations'] });
            }

            onUpdate();
        },
        onError: (error) => {
            toast({
                title: "Failed to update status",
                description: `There was an error updating the destination status: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    // Remove destination mutation
    const removeMutation = useMutation({
        mutationFn: () => {
            // Check if user is admin to determine which deletion method to use
            const userRole = getUserRole();
            console.log('🔍 User role for deletion:', userRole);
            if (userRole === 'admin') {
                console.log('🔧 Using admin deleteDestination for:', userRole);
                return deleteDestination(destinationId);
            } else {
                console.log('🔧 Using seller removeExistingDestinationFromSeller for:', destinationId);
                return removeExistingDestinationFromSeller(destinationId);
            }
        },
        onSuccess: () => {
            toast({
                title: "Destination removed",
                description: "The destination has been removed from your list successfully.",
            });
            setDeleteDialogOpen(false);
            onUpdate();
            if (onDelete) onDelete();
        },
        onError: (error) => {
            toast({
                title: "Failed to remove",
                description: `There was an error removing the destination: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    // Initialize form with destination data
    useEffect(() => {
        if (destination) {
            form.reset({
                name: destination.name,
                description: destination.description || '',
                coverImage: destination.coverImage || '',
                isActive: destination.isActive,
                country: destination.country || '',
                region: destination.region || '',
                city: destination.city || '',
                featuredTours: destination.featuredTours || []
            });

            // Initialize rich text editor content if description exists
            if (destination.description) {
                try {
                    // Check if the description is already JSON format
                    const isLikelyJSON = destination.description.trim().startsWith('{') && destination.description.trim().endsWith('}');

                    if (isLikelyJSON) {
                        // Try to parse as JSON and use it directly
                        const parsedContent = JSON.parse(destination.description);
                        setDescriptionContent(parsedContent);
                    } else {
                        // If it's plain text, wrap it in proper document structure
                        setDescriptionContent({
                            type: "doc",
                            content: [{
                                type: "paragraph",
                                content: [{ type: "text", text: destination.description }]
                            }]
                        });
                    }
                } catch (e) {
                    // If JSON parsing fails, treat as plain text
                    setDescriptionContent({
                        type: "doc",
                        content: [{
                            type: "paragraph",
                            content: [{ type: "text", text: destination.description }]
                        }]
                    });
                }
            }
        }
    }, [destination, form]);

    // Handle form submission for updating destination with smart change detection
    const handleUpdateDestination = (values: {
        name: string;
        description: string;
        coverImage: string;
        isActive: boolean;
        country: string;
        region: string;
        city: string;
        featuredTours: string[];
    }) => {
        // Get original values for comparison
        const originalValues: OriginalDestinationValues = (window as any).originalDestinationValues || {};

        // Check what fields have actually changed
        const hasContentChanges =
            values.name !== originalValues.name ||
            values.description !== originalValues.description ||
            values.coverImage !== originalValues.coverImage ||
            values.country !== originalValues.country ||
            values.region !== originalValues.region ||
            values.city !== originalValues.city;

        // Check if only isActive changed
        const onlyStatusChanged =
            !hasContentChanges &&
            values.isActive !== originalValues.isActive;

        // Check featured tours changes
        const originalTours = Array.isArray(destination.featuredTours)
            ? destination.featuredTours.map((tour: string) => typeof tour === 'string' ? tour : tour)
            : [];
        const updatedTours = values.featuredTours || [];
        const originalTourIds = originalTours.map((tour: string) => tour);
        const updatedTourIds = updatedTours.map((tour: string) => tour);
        const areToursDifferent = originalTourIds.length !== updatedTourIds.length ||
            !originalTourIds.every((tourId: string) => updatedTourIds.includes(tourId));

        console.log('🔍 Field change analysis:', {
            hasContentChanges,
            onlyStatusChanged,
            areToursDifferent,
            statusChange: `${originalValues.isActive} → ${values.isActive}`
        });

        // If only status changed, use the toggle endpoint
        if (onlyStatusChanged && !areToursDifferent) {
            console.log('✅ Using toggle endpoint for status-only change');
            toggleActiveMutation.mutate();
            return;
        }

        // Otherwise, use the full update endpoint
        console.log('📝 Using full update endpoint for content changes');
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('description', JSON.stringify(descriptionContent));
        formData.append('coverImage', values.coverImage);
        formData.append('isActive', values.isActive.toString());
        formData.append('country', values.country);
        formData.append('region', values.region);
        formData.append('city', values.city);

        if (areToursDifferent) {
            updatedTourIds.forEach((tourId: string) => {
                formData.append('featuredTours[]', tourId);
            });
        }
        if (userId) formData.append('userId', userId);
        updateMutation.mutate(formData);
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

    // Handle edit button click with smart field change detection
    const handleEditClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (destination) {
            // Store original values for comparison
            const originalValues = {
                name: destination.name,
                description: destination.description || '',
                coverImage: destination.coverImage || '',
                isActive: destination.isActive,
                country: destination.country || '',
                region: destination.region || '',
                city: destination.city || '',
                featuredTours: destination.featuredTours || []
            };

            // Initialize form with destination data
            form.setValue('name', destination.name);
            form.setValue('description', destination.description || '');
            form.setValue('coverImage', destination.coverImage || '');
            form.setValue('isActive', destination.isActive);
            form.setValue('country', destination.country || '');
            form.setValue('region', destination.region || '');
            form.setValue('city', destination.city || '');
            form.setValue('featuredTours', destination.featuredTours || []);

            // Initialize rich text editor content for edit mode
            if (destination.description) {
                try {
                    // Check if the description is already JSON format
                    const isLikelyJSON = destination.description.trim().startsWith('{') && destination.description.trim().endsWith('}');

                    if (isLikelyJSON) {
                        // Try to parse as JSON and use it directly
                        const parsedContent = JSON.parse(destination.description);
                        setDescriptionContent(parsedContent);
                    } else {
                        // If it's plain text, wrap it in proper document structure
                        setDescriptionContent({
                            type: "doc",
                            content: [{
                                type: "paragraph",
                                content: [{ type: "text", text: destination.description }]
                            }]
                        });
                    }
                } catch (e) {
                    // If JSON parsing fails, treat as plain text
                    setDescriptionContent({
                        type: "doc",
                        content: [{
                            type: "paragraph",
                            content: [{ type: "text", text: destination.description }]
                        }]
                    });
                }
            }

            // Store original values for later comparison
            (window as any).originalDestinationValues = originalValues;

            setIsEditMode(true);
        }
    };

    // Loading state
    if (isLoading) return (
        <Card className="shadow-xs">
            <CardContent className="p-0 flex flex-col">
                <div className="h-[200px] bg-muted/40 animate-pulse" />
                <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
                        <div className="h-6 w-[70%] bg-muted animate-pulse rounded-md" />
                    </div>
                    <div className="h-4 w-full bg-muted animate-pulse rounded-md" />
                    <div className="h-4 w-[80%] bg-muted animate-pulse rounded-md" />
                </div>
            </CardContent>
        </Card>
    );

    if (isError) return (
        <Card className="shadow-xs border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <X className="h-8 w-8 text-destructive" />
                    <div className="space-y-1">
                        <p className="text-lg font-medium text-destructive">Failed to load destination</p>
                        <p className="text-sm text-muted-foreground">There was an error loading this destination.</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            queryClient.invalidateQueries({
                                queryKey: ['destination', destinationId]
                            });
                        }}
                        className="mt-2"
                    >
                        Try Again
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <Card className={cn(
            "shadow-xs py-0 overflow-hidden",
            isEditMode ? "border-primary/30 bg-primary/5" : ""
        )}>
            <CardContent className="p-0">
                {isEditMode ? (
                    // Edit Mode
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleUpdateDestination)} className="space-y-4 p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary">Editing</Badge>
                            </div>

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
                                    <FormField
                                        control={form.control}
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Nepal" {...field} />
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
                                                <FormLabel>Region</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Bagmati" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Kathmandu" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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
                                                // If fieldValue contains objects instead of strings, extract the IDs
                                                if (fieldValue.length > 0 && fieldValue[0] && typeof fieldValue[0] === 'object') {
                                                    fieldValue = (fieldValue as unknown as TourObject[]).map((item) => item._id || item.id || '');
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
                                                    return { value: '', label: '' } as SelectValue; // Return empty object instead of null
                                                }).filter(val => {
                                                    const typedVal = val as { value: string; label: string };
                                                    return typedVal.value !== '';
                                                }) : [];

                                            return (
                                                <FormItem>
                                                    <FormLabel>Featured Tours</FormLabel>
                                                    <FormControl>
                                                        <MultiSelect
                                                            options={(tourTitles?.data?.data || []).map((item: TourTitle) => ({
                                                                value: item._id,
                                                                label: item.title,
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
                                                            maxDisplayValues={2}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />

                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="coverImage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4 text-primary" />
                                            Cover Image
                                        </FormLabel>
                                        {field.value ? (
                                            <div className="relative mt-1 rounded-md overflow-hidden">
                                                <img
                                                    src={field.value as string}
                                                    alt={form.getValues('name') || 'Destination cover'}
                                                    className="w-full h-[200px] object-cover"
                                                />
                                                <div className="absolute top-2 right-2 flex gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        className="h-8 w-8 bg-background/80 backdrop-blur-xs"
                                                        onClick={() => window.open(field.value as string, '_blank')}
                                                    >
                                                        <ImageIcon className="h-4 w-4" />
                                                        <span className="sr-only">View image</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="destructive"
                                                        className="h-8 w-8 bg-background/80 backdrop-blur-xs"
                                                        onClick={() => handleRemoveImage(field.onChange)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Remove image</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full h-[100px] flex flex-col items-center justify-center gap-2 border-dashed mt-1"
                                                    >
                                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                        <span className="text-muted-foreground">
                                                            Select a cover image
                                                        </span>
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent
                                                    className="max-w-[90%] max-h-[90%] overflow-auto"
                                                    onInteractOutside={(e) => {
                                                        e.preventDefault();
                                                    }}
                                                >
                                                    <DialogHeader>
                                                        <DialogTitle className="mb-3 text-left">
                                                            Select Cover Image
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            Choose an image from your gallery to use as the destination cover.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="upload dialog">
                                                        <GalleryPage
                                                            mode="picker"
                                                            onMediaSelect={(coverImage) =>
                                                                handleImageSelect(coverImage as string, field.onChange)
                                                            }
                                                        />
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-primary" />
                                            Description
                                        </FormLabel>
                                        <FormControl>
                                            <div className="border rounded-md">
                                                <NovelEditor
                                                    initialValue={typeof descriptionContent === 'string'
                                                        ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: descriptionContent }] }] }
                                                        : descriptionContent}
                                                    onContentChange={(content) => {
                                                        setDescriptionContent(content);
                                                        // Extract text content for form submission
                                                        let textContent = "";
                                                        if (content.content) {
                                                            content.content.forEach(node => {
                                                                if (node.type === 'paragraph' && node.content) {
                                                                    node.content.forEach(textNode => {
                                                                        if (textNode.type === 'text') {
                                                                            textContent += textNode.text + " ";
                                                                        }
                                                                    });
                                                                    textContent += "\n";
                                                                }
                                                            });
                                                        }
                                                        field.onChange(textContent.trim());
                                                    }}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </form>
                    </Form>
                ) : (
                    // View Mode - Enhanced Design
                    <>
                        {/* Hero Image Section with Overlay */}
                        <div className="relative overflow-hidden">
                            {destination?.coverImage ? (
                                <div className="relative">
                                    <img
                                        src={destination.coverImage as string}
                                        alt={destination.name || 'Destination'}
                                        className="w-full h-[240px] object-cover transition-transform duration-300 hover:scale-105"
                                    />
                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                </div>
                            ) : (
                                <div className="w-full h-[240px] bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center">
                                    <div className="text-center">
                                        <MapPin className="h-16 w-16 text-primary/60 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">No image uploaded</p>
                                    </div>
                                </div>
                            )}
                            {destination.approvalStatus && (
                                <div className="absolute top-3 left-3">
                                    <Badge
                                        className={cn(
                                            "shadow-lg backdrop-blur-sm",
                                            destination.approvalStatus === 'pending'
                                                ? "bg-orange-500/90 hover:bg-orange-600/90 text-white border-orange-400/50"
                                                : destination.isApproved
                                                    ? "bg-green-500/90 hover:bg-green-600/90 text-white border-green-400/50"
                                                    : "bg-gray-500/90 hover:bg-gray-600/90 text-white border-gray-400/50"
                                        )}
                                    >

                                        <Calendar className="h-3 w-3 mr-1" />
                                        {destination.approvalStatus === 'pending' ? 'Pending Approval' : destination.approvalStatus === 'approved' ? 'Approved' : 'Rejected'}

                                    </Badge>
                                </div>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-3 right-3">
                                <Badge
                                    className={cn(
                                        "shadow-lg backdrop-blur-sm",
                                        destination.approvalStatus === 'pending'
                                            ? "bg-orange-500/90 hover:bg-orange-600/90 text-white border-orange-400/50"
                                            : destination.isActive
                                                ? "bg-green-500/90 hover:bg-green-600/90 text-white border-green-400/50"
                                                : "bg-gray-500/90 hover:bg-gray-600/90 text-white border-gray-400/50"
                                    )}
                                >
                                    {destination.approvalStatus === 'pending' ? (
                                        <>
                                            <Calendar className="h-3 w-3 mr-1" />
                                            Pending Approval
                                        </>
                                    ) : destination.isActive ? (
                                        <>
                                            <Eye className="h-3 w-3 mr-1" />
                                            Active
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="h-3 w-3 mr-1" />
                                            Inactive
                                        </>
                                    )}
                                </Badge>
                            </div>



                            {/* Title Overlay */}
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="flex items-end justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
                                            {destination?.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-white/90">
                                            <Globe className="h-4 w-4" />
                                            <span className="text-sm font-medium">
                                                {[destination?.city, destination?.region, destination?.country]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </span>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </div>

                        <CardContent className="p-6 space-y-6">
                            {/* Quick Stats Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 p-4 rounded-lg border border-green-200/50 dark:border-green-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">Status</span>
                                    </div>
                                    <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                                        {destination.approvalStatus === 'approved' ? 'Approved' :
                                            destination.approvalStatus === 'pending' ? 'Pending' : 'Draft'}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 p-4 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">Tours</span>
                                    </div>
                                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                                        {destination?.featuredTours?.length || 0} Featured
                                    </p>
                                </div>
                            </div>

                            {/* Enhanced Toggle Control */}
                            <div className="">
                                {destination?.approvalStatus === 'approved' && (
                                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="">

                                                <div className="text-left">
                                                    <div className="text-sm font-medium text-white">
                                                        {destination.isActive ? 'Live' : 'Hidden'}
                                                    </div>
                                                    <div className="text-xs text-white/70">
                                                        {destination.isActive ? 'Customers can see' : 'Not visible'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">

                                                <Switch
                                                    checked={destination.isActive}
                                                    onCheckedChange={() => toggleActiveMutation.mutate()}
                                                    disabled={toggleActiveMutation.isPending}
                                                    className="data-[state=checked]:bg-green-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* Featured Tours Section */}
                            {destination?.featuredTours && destination.featuredTours.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Star className="h-5 w-5 text-amber-500" />
                                        <h4 className="font-semibold text-lg">Featured Tours</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {destination.featuredTours.map((tour: string | TourObject) => {
                                            const tourId = typeof tour === 'string' ? tour : (tour._id || tour.id || '');
                                            const tourTitle = typeof tour === 'string'
                                                ? (tourTitles?.data?.data?.find((t: TourTitle) => t._id === tourId)?.title || tourId)
                                                : (tour.title || 'Unknown Tour');

                                            return (
                                                <div
                                                    key={tourId}
                                                    className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                                                        <span className="text-sm font-medium text-foreground">{tourTitle}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Description Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <h4 className="font-semibold text-lg">About This Destination</h4>
                                </div>
                                <div className="bg-gradient-to-br from-secondary/30 to-secondary/10 p-4 rounded-lg border border-secondary/40">
                                    {destination?.description ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <RichTextRenderer content={destination.description} />
                                            {destination.description.length > 300 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-primary hover:text-primary/80 p-0 h-auto font-medium mt-3"
                                                    onClick={() => setDescriptionDialogOpen(true)}
                                                >
                                                    Read full description →
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p className="text-sm">No description available</p>
                                            <p className="text-xs">Add a description to help customers learn about this destination</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </>
                )}
            </CardContent>

            <CardFooter
                className={cn(
                    "flex flex-col gap-4 px-6 py-4 bg-gradient-to-r from-secondary/30 to-secondary/20 border-t border-secondary/40",
                    isEditMode && "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20"
                )}
            >
                {isEditMode ? (
                    <>
                        <div className="text-sm text-muted-foreground w-full">
                            Make your changes and save to request an update for the destination
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditMode(false)}
                                className="gap-2 hover:bg-secondary/80"
                            >
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={form.handleSubmit(handleUpdateDestination)}
                                disabled={updateMutation.isPending}
                                className="gap-2 bg-primary hover:bg-primary/90"
                            >
                                <Save className="h-4 w-4" />
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEditClick}
                            className="gap-2 hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                        >
                            <Edit className="h-4 w-4" />
                            Edit Details
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                            className="gap-2 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                            Remove
                        </Button>
                    </div>
                )}
            </CardFooter>


            {/* Description Dialog */}
            <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            {destination?.name} - Full Description
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                    </DialogDescription>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <div className="text-sm space-y-4 leading-relaxed">
                            <RichTextRenderer content={destination?.description || 'No description provided'} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Removal</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove this destination from your list? You can add it back later if needed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => removeMutation.mutate()}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default SingleDestination;
