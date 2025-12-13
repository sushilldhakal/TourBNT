import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Save, X, Image as ImageIcon, Trash2, FileText } from "lucide-react";
import { updateDestination, getUserToursTitle, getSellerDestinations, getUserDestinations, toggleDestinationActiveStatus } from "@/lib/api/destinationApi";
import { getUserId, getUserRole } from "@/lib/auth/authUtils";
import { GalleryPage } from "@/components/dashboard/gallery/GalleryPage";
import { MultiSelect, SelectValue } from "@/components/ui/MultiSelect";
import { NovelEditor } from "../../editor";

interface EditDestinationDialogProps {
    destinationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface TourTitle {
    _id: string;
    title: string;
    code?: string;
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

export const EditDestinationDialog = ({ destinationId, open, onOpenChange, onSuccess }: EditDestinationDialogProps) => {
    const userId = getUserId();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [descriptionContent, setDescriptionContent] = useState<DescriptionContent | string>('');

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

    // Check user role
    const userRole = getUserRole();
    const isAdmin = userRole === 'admin';

    // Fetch destinations based on user role
    const { data: globalDestinations } = useQuery({
        queryKey: ['seller-destinations'],
        queryFn: getSellerDestinations,
        enabled: isAdmin,
    });

    const { data: userDestinations } = useQuery({
        queryKey: ['user-destinations'],
        queryFn: getUserDestinations,
        enabled: !isAdmin,
    });

    // Choose the appropriate data source
    const destinationsData = isAdmin ? globalDestinations : userDestinations;
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
                description: isAdmin
                    ? "The destination has been updated successfully."
                    : "Your changes have been submitted for admin approval.",
            });
            onOpenChange(false);
            queryClient.invalidateQueries({ queryKey: ['destination', destinationId] });
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['tourTitles', userId] });
            }
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-destinations'] });
            }
            onSuccess();
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
            if (data.data?.isActive !== undefined) {
                form.setValue('isActive', data.data.isActive);
            }
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-destinations'] });
            }
            onSuccess();
        },
        onError: (error) => {
            toast({
                title: "Failed to update status",
                description: `There was an error: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    // Initialize form when dialog opens
    useEffect(() => {
        if (open && destination) {
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

            // Initialize rich text editor content
            if (destination.description) {
                try {
                    const isLikelyJSON = destination.description.trim().startsWith('{') && destination.description.trim().endsWith('}');
                    if (isLikelyJSON) {
                        setDescriptionContent(JSON.parse(destination.description));
                    } else {
                        setDescriptionContent({
                            type: "doc",
                            content: [{
                                type: "paragraph",
                                content: [{ type: "text", text: destination.description }]
                            }]
                        });
                    }
                } catch (e) {
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
    }, [open, destination, form]);

    // Handle form submission
    const handleSubmit = (values: any) => {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('description', JSON.stringify(descriptionContent));
        formData.append('coverImage', values.coverImage);
        formData.append('isActive', values.isActive.toString());
        formData.append('country', values.country);
        formData.append('region', values.region);
        formData.append('city', values.city);

        // If user is not admin, set approval status to pending for re-approval
        if (!isAdmin) {
            formData.append('approvalStatus', 'pending');
        }

        if (values.featuredTours && values.featuredTours.length > 0) {
            values.featuredTours.forEach((tourId: string) => {
                formData.append('featuredTours[]', tourId);
            });
        }
        if (userId) formData.append('userId', userId);

        updateMutation.mutate(formData);
    };

    const handleImageSelect = (coverImage: string, onChange: (value: string) => void) => {
        onChange(coverImage);
        setDialogOpen(false);
    };

    const handleRemoveImage = (onChange: (value: string) => void) => {
        onChange('');
    };

    if (!destination) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Destination</DialogTitle>
                    <DialogDescription>
                        Update the destination details below
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

                        <FormField
                            control={form.control}
                            name="featuredTours"
                            render={({ field }) => {
                                let fieldValue: string[] = [];
                                if (Array.isArray(field.value)) {
                                    if (Array.isArray(field.value[0])) {
                                        fieldValue = field.value[0];
                                    } else {
                                        fieldValue = field.value;
                                    }
                                    if (fieldValue.length > 0 && fieldValue[0] && typeof fieldValue[0] === 'object') {
                                        fieldValue = (fieldValue as unknown as TourObject[]).map((item) => item._id || item.id || '');
                                    }
                                }

                                const currentValues: SelectValue[] = Array.isArray(fieldValue) ?
                                    fieldValue.map(val => {
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
                                                options={(tourTitles?.data || []).map((item: TourTitle) => ({
                                                    value: item._id,
                                                    label: item.code ? `${item.title} (${item.code})` : item.title,
                                                }))}
                                                value={currentValues}
                                                onValueChange={(selectedValues: SelectValue[]) => {
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
                                                    type="button"
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-8 w-8 bg-background/80 backdrop-blur-xs"
                                                    onClick={() => window.open(field.value as string, '_blank')}
                                                >
                                                    <ImageIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="destructive"
                                                    className="h-8 w-8 bg-background/80 backdrop-blur-xs"
                                                    onClick={() => handleRemoveImage(field.onChange)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full h-[100px] flex flex-col items-center justify-center gap-2 border-dashed mt-1"
                                                onClick={() => setDialogOpen(true)}
                                            >
                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                <span className="text-muted-foreground">Select a cover image</span>
                                            </Button>
                                            <DialogContent
                                                className="max-w-[90%] max-h-[90%] overflow-auto"
                                                onInteractOutside={(e) => e.preventDefault()}
                                            >
                                                <DialogHeader>
                                                    <DialogTitle>Select Cover Image</DialogTitle>
                                                    <DialogDescription>
                                                        Choose an image from your gallery
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <GalleryPage
                                                    mode="picker"
                                                    onMediaSelect={(coverImage) =>
                                                        handleImageSelect(coverImage as string, field.onChange)
                                                    }
                                                />
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

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
