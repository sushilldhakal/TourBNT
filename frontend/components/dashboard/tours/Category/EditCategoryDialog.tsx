'use client';
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Image as ImageIcon, Trash2, FileText, FolderOpen, Loader2 } from "lucide-react";
import { Gallery } from "@/components/dashboard/gallery/Gallery";

const NovelEditor = dynamic(() => import("@/components/dashboard/editor/NovelEditor"), { ssr: false });
import { useAuth } from "@/lib/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { useCategoryById, useCacheManager } from "@/lib/queries";
import { updateCategory } from "@/lib/api/categories";
import { CategoryData, DescriptionContent, TourObject, TourTitle } from "@/types/types";
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useTourTitles } from "@/lib/queries/useDestinations";

export interface EditCategoryDialogProps {
    categoryId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const EditCategoryDialog = ({ categoryId, open, onOpenChange, onSuccess }: EditCategoryDialogProps) => {
    const { userId, userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const { invalidateCategories } = useCacheManager();
    const { data: tourTitles } = useTourTitles(userId || '');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [descriptionContent, setDescriptionContent] = useState<DescriptionContent | string>('');

    // Calculate description length for validation
    const descriptionLength = typeof descriptionContent === 'string'
        ? descriptionContent.length
        : JSON.stringify(descriptionContent).length;
    const maxDescriptionLength = 500;
    const remainingChars = maxDescriptionLength - descriptionLength;

    const { category, isLoading } = useCategoryById(categoryId, open && !!categoryId);

    const form = useForm({
        defaultValues: {
            name: '',
            description: '',
            imageUrl: '',
            featuredTours: [],
            reason: ''
        }
    });

    const updateMutation = useMutation({
        mutationFn: (formData: FormData) => updateCategory(categoryId, formData),
        onSuccess: (response: any) => {
            // Check if this was a change request (for approved categories edited by non-admins)
            const isChangeRequest = !isAdmin && category?.approvalStatus === 'approved';

            toast({
                title: isChangeRequest ? 'Change request submitted' : 'Category updated successfully',
                description: isChangeRequest
                    ? 'Your change request has been submitted for admin review. The category remains approved until reviewed.'
                    : 'Your changes have been saved.',
            });

            invalidateCategories({ detailId: categoryId, my: true, admin: true, changeRequests: true });
            onOpenChange(false);
            onSuccess();
        },
        onError: (error) => {
            toast({
                title: 'Failed to update category',
                description: 'An error occurred while saving changes.',
                variant: 'destructive',
            });
            console.error('Error updating category:', error);
        },
    });

    useEffect(() => {
        if (!open || !categoryId || !category) return;
        form.reset({
            name: category.name || '',
            description: category.description || '',
            imageUrl: category.imageUrl || '',
            reason: (category as any).reason || '',
            featuredTours: (category.featuredTours || []) as string[],
        });
        if (category.description) {
            try {
                const isLikelyJSON = category.description.trim().startsWith('{') && category.description.trim().endsWith('}');
                if (isLikelyJSON) {
                    setDescriptionContent(JSON.parse(category.description));
                } else {
                    setDescriptionContent({
                        type: 'doc',
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: category.description }] }],
                    });
                }
            } catch {
                setDescriptionContent({
                    type: 'doc',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: category.description }] }],
                });
            }
        }
    }, [open, categoryId, category, form]);

    const handleSubmit = (values: { name: string; description: string; imageUrl: string; featuredTours: string[]; reason: string }) => {
        // Validate reason is required for change requests (non-admin editing approved category)
        if (!isAdmin && category?.approvalStatus === 'approved' && (!values.reason || values.reason.trim().length < 10)) {
            form.setError('reason', {
                type: 'manual',
                message: 'Reason is required and must be at least 10 characters when requesting changes to an approved category'
            });
            return;
        }

        // Validate description length (max 500 characters)
        const descriptionJson = JSON.stringify(descriptionContent);
        if (descriptionJson.length > 500) {
            toast({
                title: 'Description too long',
                description: `Description must be 500 characters or less. Your description is ${descriptionJson.length} characters. Please shorten it before submitting.`,
                variant: 'destructive',
            });
            form.setError('description', {
                type: 'manual',
                message: `Description is ${descriptionJson.length} characters. Maximum allowed is 500 characters. Please shorten it.`
            });
            return;
        }

        const formData = new FormData();
        formData.append('name', values.name || '');
        formData.append('description', descriptionJson);
        formData.append('imageUrl', values.imageUrl || '');
        formData.append('reason', values.reason || '');

        // Don't set approvalStatus here - backend handles change requests automatically
        // For approved categories edited by non-admins, backend creates a change request
        // For pending/rejected categories, backend handles the status appropriately

        if (isAdmin && values.featuredTours && values.featuredTours.length > 0) {
            values.featuredTours.forEach((tourId: string) => {
                formData.append('featuredTours[]', tourId);
            });
        }
        if (userId) formData.append('userId', userId);

        updateMutation.mutate(formData);
    };

    const handleImageSelect = (imageUrl: string, onChange: (value: string) => void) => {
        onChange(imageUrl);
        setDialogOpen(false);
    };

    const handleRemoveImage = (onChange: (value: string) => void) => {
        onChange('');
    };

    if (isLoading) return null;
    if (!category) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-4xl p-0 gap-0 overflow-hidden" aria-describedby="edit-category-description">
                {/* Header with subtle background */}
                <div className="bg-muted/50 px-6 py-6 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Edit Category</DialogTitle>
                        <DialogDescription id="edit-category-description" className="text-sm text-muted-foreground">
                            Update the category details below
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col" aria-label="Edit category form">
                        <div className="max-h-[65vh] overflow-y-auto px-6 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                {/* Left Column - Form Fields */}
                                <div className="lg:col-span-3 space-y-6">
                                    {/* Category Details Card */}
                                    <div className="rounded-lg border bg-card p-6 space-y-4">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                                            Category Details
                                        </h3>

                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium">Name</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g. Adventure Tours"
                                                            className="h-10"
                                                            {...field}
                                                            aria-required="true"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Reason Field inside Category Details */}
                                        <FormField
                                            control={form.control}
                                            name="reason"
                                            render={({ field }) => {
                                                const isRequired = !isAdmin && category?.approvalStatus === 'approved' || category?.approvalStatus === 'rejected';
                                                return (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium">
                                                            {isRequired
                                                                ? 'Reason for Change Request *'
                                                                : 'Reason for Adding Category'}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder={
                                                                    isRequired
                                                                        ? "e.g., Category name changed, updated information needed... (required, min 10 characters)"
                                                                        : "e.g., Popular category with high demand, unique classification needed, etc."
                                                                }
                                                                className="h-10"
                                                                {...field}
                                                                aria-required={isRequired}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                        {isRequired && (
                                                            <p className="text-xs text-muted-foreground mt-2">
                                                                Required when requesting changes to an approved category (minimum 10 characters)
                                                            </p>
                                                        )}
                                                    </FormItem>
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Right Column - Image */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Cover Image Card */}
                                    <div className="rounded-lg border bg-card p-6 space-y-4">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                                            Cover Image
                                        </h3>

                                        <FormField
                                            control={form.control}
                                            name="imageUrl"
                                            render={({ field }) => (
                                                <FormItem>
                                                    {field.value ? (
                                                        <div className="relative rounded-lg overflow-hidden aspect-[4/3] group">
                                                            <Image
                                                                src={field.value as string || "/placeholder.svg"}
                                                                alt={form.getValues('name') || 'Category cover'}
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
                                                                    aria-label="Change cover image"
                                                                >
                                                                    <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                                                                    Change
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="h-9"
                                                                    onClick={() => handleRemoveImage(field.onChange)}
                                                                    aria-label="Remove cover image"
                                                                >
                                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                                            onClick={() => setDialogOpen(true)}
                                                            aria-label="Upload cover image"
                                                        >
                                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                                <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
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

                                    {/* Featured Tours (Admin only) */}
                                    {isAdmin && (
                                        <div className="rounded-lg border bg-card p-6 space-y-4">
                                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" />
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
                                                                    return (val as TourObject).id ||  '';
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
                                                                        value: item.id,
                                                                        label: item.code ? `${item.title} (${item.code})` : item.title,
                                                                    }))}
                                                                    defaultValue={normalizedValue}
                                                                    onValueChange={(selectedValues: string[]) => {
                                                                        field.onChange(selectedValues);
                                                                    }}
                                                                    placeholder="Select featured tours"
                                                                    className="w-full"
                                                                    maxCount={2}
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
                            <div className="mt-6">
                                <div className="rounded-lg border bg-card p-6 space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between mb-3">
                                                    <FormLabel className="text-sm font-semibold flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                                                        Description
                                                    </FormLabel>
                                                    <span 
                                                        className={`text-xs font-medium ${remainingChars < 0 ? 'text-destructive' : remainingChars < 50 ? 'text-orange-500' : 'text-muted-foreground'}`}
                                                        role="status"
                                                        aria-live="polite"
                                                    >
                                                        {descriptionLength} / {maxDescriptionLength} characters
                                                        {remainingChars < 0 && ' (exceeds limit)'}
                                                    </span>
                                                </div>
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
                                aria-label="Cancel editing"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="min-w-[120px]"
                                aria-label="Save category changes"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" aria-hidden="true" />
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
