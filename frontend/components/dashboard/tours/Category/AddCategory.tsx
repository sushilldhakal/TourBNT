'use client';
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, FolderPlus, Image as ImageIcon, Save, Trash2, X, Sparkles, Info } from "lucide-react";
import { useAuth } from '@/lib/hooks/useAuth';
import { useCacheManager } from "@/lib/queries";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { addCategory, getAvailableCategoriesPage, bulkAddCategories } from '@/lib/api/categories';
import { ExistingItemsPicker } from '@/components/dashboard/shared/ExistingItemsPicker';
import { Gallery } from "@/components/dashboard/gallery/Gallery";
import { CategoryData } from "@/types/types";
import type { CategoryFormData } from "@/types/category";
import type { JSONContent } from "novel";

const NovelEditor = dynamic(() => import("@/components/dashboard/editor/NovelEditor"), { ssr: false });
import Image from "next/image";


const AddCategory = ({ onCategoryAdded }: { onCategoryAdded: (created?: unknown) => void }) => {
    // Admins manage the global list directly; "add existing" is for sellers building their own list.
    const isAdmin = useAuth().userRole === 'admin';
    const [dialogOpen, setDialogOpen] = useState(false);

    // Description content state for NovelEditor
    const [descriptionContent, setDescriptionContent] = useState<JSONContent>({
        type: "doc",
        content: [{ type: "paragraph", content: [] }]
    });

    // Calculate description length for validation
    const descriptionLength = JSON.stringify(descriptionContent).length;
    const maxDescriptionLength = 500;
    const remainingChars = maxDescriptionLength - descriptionLength;

    const { invalidateCategories } = useCacheManager();
    const form = useForm({
        defaultValues: {
            name: '',
            description: '',
            imageUrl: '',
            reason: '',
        },
        mode: 'onChange',
    });

    const categoryMutation = useMutation({
        mutationFn: (data: FormData) => addCategory(data),
        onSuccess: (created) => {
            toast({
                title: 'Category added successfully',
                description: 'Your category has been created.',
                variant: 'default',
            });
            onCategoryAdded(created);
            form.reset();
            // Reset description content
            setDescriptionContent({
                type: "doc",
                content: [{ type: "paragraph", content: [] }]
            });
        },
        onError: (error) => {
            toast({
                title: 'Failed to create category',
                description: 'An error occurred while creating the category.',
                variant: 'destructive',
            });
            console.error('Error creating category:', error);
        },
    });

    const handleSubmit = async (values: CategoryFormData) => {
        // Validate required fields on frontend
        if (!values.name || !values.description) {
            toast({
                title: 'Validation Error',
                description: 'Name and description are required',
                variant: 'destructive',
            });
            return;
        }

        // Validate description length (max 500 characters)
        // The description is stored as JSON string from NovelEditor
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
        formData.append('name', values.name.trim());
        formData.append('description', descriptionJson);
        formData.append('imageUrl', values.imageUrl);
        formData.append('reason', values.reason);

        await categoryMutation.mutateAsync(formData);
    };

    const handleImageSelect = (imageUrl: string, onChange: (value: string) => void) => {
        onChange(imageUrl);
        setDialogOpen(false);
    };

    const handleRemoveImage = (onChange: (value: string) => void) => {
        onChange('');
    };

    return (
        <Form {...form}>
            {/* Add existing categories — search, tick or select all, add in ONE request */}
            <div className="mb-6 w-full">
                {!isAdmin && (
<ExistingItemsPicker
                    noun="category"
                    nounPlural="categories"
                    queryKey="categories"
                    fetchPage={async (params) => {
                        const page = await getAvailableCategoriesPage(params);
                        return {
                            ...page,
                            items: page.items.map((c: any) => ({
                                id: c.id ?? c._id,
                                title: c.name,
                                subtitle: typeof c.description === 'string' ? c.description.slice(0, 80) : undefined,
                                imageUrl: c.imageUrl,
                            })),
                        };
                    }}
                    bulkAdd={bulkAddCategories}
                    onAdded={({ added, ids }) => {
                        invalidateCategories({ my: true, admin: true, approved: true });
                        if (added > 0) onCategoryAdded(ids && ids.length === 1 ? { id: ids[0] } : undefined);
                    }}
                />
)}
            </div>

            <form onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleSubmit)();
            }}>
                <Card className="shadow-lg border-0 bg-gradient-to-br from-background via-background to-primary/5 pt-0">
                    <CardHeader className="pb-6 pt-4 rounded-t-sm bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 shadow-sm">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    New Category
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Info className="h-3 w-3" />
                                Pending Approval
                            </div>
                        </div>
                        <CardTitle className="text-2xl flex items-center gap-3 font-semibold">
                            <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                <FolderPlus className="h-6 w-6" />
                            </div>
                            Create New Category
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            Add a new category to organize your tours. Categories help users discover and filter content more effectively.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            {/* Left Column - Form Fields */}
                            <div className="lg:col-span-3 space-y-5">
                                {/* Category Details Card */}
                                <div className="rounded-lg border bg-card p-5 space-y-4">
                                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <FolderPlus className="h-4 w-4 text-primary" />
                                        Category Details
                                    </h3>

                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium text-muted-foreground">Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Adventure Tours"
                                                        className="h-10"
                                                        {...field}
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
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium text-muted-foreground">
                                                    Reason for Creating This Category *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g., Popular category with high demand, unique classification needed..."
                                                        className="h-10"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-muted-foreground mt-1.5">
                                                    This helps administrators understand the business need for this category
                                                </p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Right Column - Image */}
                            <div className="lg:col-span-2 space-y-5">
                                {/* Cover Image Card */}
                                <div className="rounded-lg border bg-card p-5 space-y-4">
                                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-primary" />
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
                                                            src={String(field.value)}
                                                            alt="Category cover"
                                                            fill
                                                            className="object-cover transition-transform group-hover:scale-105"
                                                            sizes="(max-width: 1024px) 100vw, 33vw"
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
                                                            onMediaSelect={(url) => handleImageSelect(url as string, field.onChange)}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
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
                                            <div className="flex items-center justify-between mb-2">
                                                <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    Description
                                                </FormLabel>
                                                <span className={`text-xs ${remainingChars < 0 ? 'text-destructive font-semibold' : remainingChars < 50 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                                    {descriptionLength} / {maxDescriptionLength} characters
                                                    {remainingChars < 0 && ' (exceeds limit)'}
                                                </span>
                                            </div>
                                            <FormControl>
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
                                                        placeholder="Provide a detailed description of what this category represents..."
                                                        minHeight="300px"
                                                        enableAI={false}
                                                        enableGallery={true}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t px-6 py-5 bg-gradient-to-r from-muted/30 to-primary/5">
                        <Button
                            type="button"
                            variant="outline"
                            size="default"
                            onClick={() => {
                                form.reset();
                                onCategoryAdded(); // This will hide the form
                            }}
                            className="gap-2 px-6"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="default"
                            disabled={categoryMutation.isPending}
                            className="gap-2 px-6 bg-primary hover:bg-primary/90 shadow-md"
                        >
                            {categoryMutation.isPending ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Submit for Approval
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
};

export default AddCategory;
