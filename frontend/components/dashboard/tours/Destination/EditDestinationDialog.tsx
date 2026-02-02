import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Image as ImageIcon, Trash2, FileText, MapPin, Star, Loader2 } from "lucide-react";
import { Gallery } from "@/components/dashboard/gallery/Gallery";
import { MultiSelect } from "@/components/ui/MultiSelect";

const NovelEditor = dynamic(() => import("@/components/dashboard/editor/NovelEditor"), { ssr: false });
import { useAuth } from "@/lib/hooks/useAuth";
import { useDestinationById, useTourTitles, useUpdateDestination } from '@/lib/queries/useDestinations';
import { EditDestinationDialogProps, TourTitle, TourObject, DescriptionContent } from "@/types/types";
import Image from "next/image";

export const EditDestinationDialog = ({ destinationId, open, onOpenChange, onSuccess }: EditDestinationDialogProps) => {
    const { userId, userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const { destination } = useDestinationById(destinationId);
    const { data: tourTitles } = useTourTitles(userId || '');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [descriptionContent, setDescriptionContent] = useState<DescriptionContent | string>('');

    const form = useForm<{
        name: string;
        description: string;
        coverImage: string;
        isActive: boolean;
        country: string;
        region: string;
        city: string;
        featuredTours: string[];
        reason: string;
    }>({
        defaultValues: {
            name: '',
            description: '',
            coverImage: '',
            isActive: true,
            country: '',
            region: '',
            city: '',
            featuredTours: [] as string[],
            reason: ''
        }
    });

    const updateMutation = useUpdateDestination(destinationId, {
        onSuccess: () => {
            onOpenChange(false);
            onSuccess();
        },
    });


    useEffect(() => {
        if (!open || !destinationId || !destination) return;
        form.reset({
            name: destination.name || '',
            description: destination.description || '',
            coverImage: destination.coverImage || '',
            isActive: destination.isActive ?? true,
            country: destination.country || '',
            region: destination.region || '',
            city: destination.city || '',
            reason: destination.reason || '',
            featuredTours: (destination.featuredTours || []) as string[],
        });
        if (destination.description) {
            try {
                const isLikelyJSON = destination.description.trim().startsWith('{') && destination.description.trim().endsWith('}');
                if (isLikelyJSON) {
                    setDescriptionContent(JSON.parse(destination.description));
                } else {
                    setDescriptionContent({
                        type: 'doc',
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: destination.description }] }],
                    });
                }
            } catch {
                setDescriptionContent({
                    type: 'doc',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: destination.description }] }],
                });
            }
        }
    }, [open, destinationId, destination, form]);

    const handleSubmit = (values: { name: string; description: string; coverImage: string; isActive: boolean; country: string; region: string; city: string; featuredTours: string[], reason: string }) => {
        // Validate reason is required for change requests (non-admin editing approved destination)
        if (!isAdmin && destination?.approvalStatus === 'approved' && (!values.reason || values.reason.trim().length < 10)) {
            form.setError('reason', {
                type: 'manual',
                message: 'Reason is required and must be at least 10 characters when requesting changes to an approved destination'
            });
            return;
        }

        const formData = new FormData();
        formData.append('name', values.name || '');
        formData.append('description', JSON.stringify(descriptionContent));
        formData.append('coverImage', values.coverImage || '');
        formData.append('isActive', (values.isActive ?? destination?.isActive ?? true).toString());
        formData.append('country', values.country || '');
        formData.append('region', values.region || '');
        formData.append('city', values.city || '');
        formData.append('reason', values.reason || '');

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
            <DialogContent className="!max-w-4xl p-0 gap-0 overflow-hidden">
                {/* Header with subtle background */}
                <div className="bg-muted/50 px-6 py-5 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Edit Destination</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Update the destination details below
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col">
                        <div className="max-h-[65vh] overflow-y-auto px-6 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                {/* Left Column - Form Fields */}
                                <div className="lg:col-span-3 space-y-5">
                                    {/* Location Details Card */}
                                    <div className="rounded-lg border bg-card p-5 space-y-4">
                                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            Location Details
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. Kathmandu"
                                                                className="h-10"
                                                                {...field}
                                                            />
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Country</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. Nepal"
                                                                className="h-10"
                                                                {...field}
                                                            />
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">City</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. Kathmandu"
                                                                className="h-10"
                                                                {...field}
                                                            />
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
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">Region</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. Bagmati"
                                                                className="h-10"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Reason Field inside Location Details */}
                                        <FormField
                                            control={form.control}
                                            name="reason"
                                            render={({ field }) => {
                                                const isRequired = !isAdmin && destination?.approvalStatus === 'approved' || destination?.approvalStatus === 'rejected';
                                                return (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">
                                                            {isRequired
                                                                ? 'Reason for Change Request *'
                                                                : 'Reason for Adding Destination'}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder={
                                                                    isRequired
                                                                        ? "e.g., Location name changed, incorrect coordinates, updated information needed... (required, min 10 characters)"
                                                                        : "e.g., Popular tourist destination with high demand, unique cultural significance, etc."
                                                                }
                                                                className="h-10"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                        {isRequired && (
                                                            <p className="text-xs text-muted-foreground mt-1.5">
                                                                Required when requesting changes to an approved destination (minimum 10 characters)
                                                            </p>
                                                        )}
                                                    </FormItem>
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Right Column - Image & Featured Tours */}
                                <div className="lg:col-span-2 space-y-5">
                                    {/* Cover Image Card */}
                                    <div className="rounded-lg border bg-card p-5 space-y-4">
                                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4 text-primary" />
                                            Cover Image
                                        </h3>

                                        <FormField
                                            control={form.control}
                                            name="coverImage"
                                            render={({ field }) => (
                                                <FormItem>
                                                    {field.value ? (
                                                        <div className="relative rounded-lg overflow-hidden aspect-[4/3] group">
                                                            <Image
                                                                src={field.value as string || "/placeholder.svg"}
                                                                alt={form.getValues('name') || 'Destination cover'}
                                                                fill
                                                                className="object-cover transition-transform group-hover:scale-105"
                                                                sizes="(max-width: 768px) 100vw, 300px"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    className="h-9"
                                                                    onClick={() => setDialogOpen(true)}
                                                                >
                                                                    <ImageIcon className="h-4 w-4 mr-2" />
                                                                    Change
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="h-9"
                                                                    onClick={() => handleRemoveImage(field.onChange)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer"
                                                            onClick={() => setDialogOpen(true)}
                                                        >
                                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-sm font-medium text-foreground">Upload cover image</p>
                                                                <p className="text-xs text-muted-foreground">Click to browse gallery</p>
                                                            </div>
                                                        </button>
                                                    )}
                                                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                                        <DialogContent
                                                            className="!max-w-[80vw] !max-h-[90vh] overflow-auto"
                                                            onInteractOutside={(e) => e.preventDefault()}
                                                        >
                                                            <DialogHeader>
                                                                <DialogTitle>
                                                                    {field.value ? 'Change cover image' : 'Select cover image'}
                                                                </DialogTitle>
                                                                <DialogDescription>
                                                                    Choose an image from your gallery
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <Gallery
                                                                mode="picker"
                                                                onMediaSelect={(coverImage) =>
                                                                    handleImageSelect(coverImage as string, field.onChange)
                                                                }
                                                            />
                                                        </DialogContent>
                                                    </Dialog>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Featured Tours (if admin) */}
                                    {isAdmin && (
                                        <div className="rounded-lg border bg-card p-5 space-y-4">
                                            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                                <Star className="h-4 w-4 text-primary" />
                                                Featured Tours
                                            </h3>

                                            <FormField
                                                control={form.control}
                                                name="featuredTours"
                                                render={({ field }) => {
                                                    // Normalize field value to string array
                                                    let normalizedValue: string[] = [];
                                                    if (Array.isArray(field.value)) {
                                                        normalizedValue = field.value
                                                            .map((val) => {
                                                                if (typeof val === 'string') {
                                                                    return val;
                                                                } else if (val && typeof val === 'object') {
                                                                    // Handle TourObject or SelectValue objects
                                                                    return (val as TourObject)._id || (val as TourObject).id || '';
                                                                }
                                                                return '';
                                                            })
                                                            .filter((val) => val !== '');
                                                    }

                                                    return (
                                                        <FormItem>
                                                            <FormControl>
                                                                <MultiSelect
                                                                    options={(tourTitles as TourTitle[] || []).map((item: TourTitle) => ({
                                                                        value: item._id,
                                                                        label: item.code ? `${item.title} (${item.code})` : item.title,
                                                                    }))}
                                                                    defaultValue={normalizedValue}
                                                                    onValueChange={(selectedValues: string[]) => {
                                                                        field.onChange(selectedValues);
                                                                    }}
                                                                    placeholder="Select featured tours"
                                                                    className="w-full"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    );
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Full width Description */}
                            <div className="mt-5">
                                <div className="rounded-lg border bg-card p-5 space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    Description
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="border rounded-lg overflow-hidden bg-background">
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
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t bg-muted/30 px-6 py-4 flex items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="min-w-[120px]"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
