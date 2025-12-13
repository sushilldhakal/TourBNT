'use client';
import { useState } from "react";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, FolderPlus, Image as ImageIcon, Save, Trash2, X, MessageSquare, Sparkles, Info } from "lucide-react";
import { useAllCategories, useCategoriesRoleBased } from "./useCategories";
import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { addCategory, addExistingCategoryToSeller } from "@/lib/api/categoryApi";
import { GalleryPage } from "@/components/dashboard/gallery/GalleryPage";
interface CategoryFormData {
    name: string;
    imageUrl: string;
    description: string;
    reason: string;
}

const AddCategory = ({ onCategoryAdded }: { onCategoryAdded: () => void }) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    // Search functionality state
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // All categories hook for MultiSelect
    const { data: allCategories, isLoading: isLoadingAll } = useAllCategories();

    // User's current categories to filter out already added ones
    const { data: userCategories } = useCategoriesRoleBased();

    // Filter out categories that user already has
    const availableCategories = allCategories?.filter(category =>
        !userCategories?.some(userCat => userCat._id === category._id)
    ) || [];
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
        onSuccess: () => {
            toast({
                title: 'Category added successfully',
                description: 'Your category has been created.',
                variant: 'default',
            });
            onCategoryAdded();
            form.reset();
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

    // Mutation for adding existing categories to seller's list
    const addExistingCategoryMutation = useMutation({
        mutationFn: (categoryId: string) => addExistingCategoryToSeller(categoryId),
        onSuccess: () => {
            toast({
                title: "Category added successfully",
                description: "The category has been added to your list.",
                variant: "default",
            });
            onCategoryAdded();
            setSelectedCategories([]);
        },
        onError: (error) => {
            toast({
                title: "Failed to add category",
                description: "An error occurred while adding the category to your list.",
                variant: "destructive",
            });
            console.error('Error adding existing category:', error);
        },
    });


    const handleSubmit = async (values: CategoryFormData) => {
        event?.preventDefault();

        console.log('🔍 Form values received:', values);
        console.log('🔍 Name value:', `"${values.name}"`);
        console.log('🔍 Description value:', `"${values.description}"`);

        // Validate required fields on frontend
        if (!values.name || !values.description) {
            toast({
                title: 'Validation Error',
                description: 'Name and description are required',
                variant: 'destructive',
            });
            return;
        }

        const formData = new FormData();
        formData.append('name', values.name.trim());
        formData.append('description', values.description.trim());
        formData.append('imageUrl', values.imageUrl);
        formData.append('reason', values.reason);

        console.log('FormData contents before submission:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        try {
            await categoryMutation.mutate(formData);
        } catch (error) {
            toast({
                title: 'Failed to create category',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        }
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
            {/* Search Existing Categories Section */}
            <div className="mb-6">
                <SearchableSelect
                    title="Add Existing Categories"
                    description="Search and add existing approved categories to your list instead of creating duplicates."
                    icon={<FolderPlus className="h-5 w-5" />}
                    options={availableCategories?.map((category) => ({
                        label: category.name,
                        value: category._id,
                        description: category.description,
                        imageUrl: category.imageUrl,
                        disable: false
                    })) || []}
                    value={selectedCategories}
                    onValueChange={(selected) => {
                        setSelectedCategories(selected);
                        // Auto-add selected categories
                        selected.forEach((categoryId) => {
                            addExistingCategoryMutation.mutate(categoryId);
                        });
                        // Clear selection after adding
                        setTimeout(() => setSelectedCategories([]), 500);
                    }}
                    placeholder={isLoadingAll ? "Loading categories..." : "Search and select existing categories..."}
                    searchPlaceholder="Search categories by name or description..."
                    emptyMessage="No categories found matching your search."
                    loading={isLoadingAll}
                    className="w-full"
                />
            </div>

            <form onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleSubmit)();
            }}>
                <Card className="shadow-lg border-0 bg-gradient-to-br from-background via-background to-primary/5">
                    <CardHeader className="pb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
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
                        {/* Two Column Layout - Responsive */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                            {/* Left Column - Image Upload */}
                            <div className="space-y-4 order-2 xl:order-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
                                    <Badge variant="secondary" className="px-3 py-1">
                                        <ImageIcon className="h-3 w-3 mr-1" />
                                        Cover Image
                                    </Badge>
                                    <div className="h-px bg-gradient-to-l from-primary/50 to-transparent flex-1" />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="relative">
                                                {field.value ? (
                                                    <div className="relative rounded-lg overflow-hidden border border-muted-foreground/20">
                                                        <img
                                                            src={field.value as string}
                                                            alt="Category cover"
                                                            className="w-full h-[250px] sm:h-[300px] lg:h-[350px] xl:h-[400px] object-cover"
                                                        />
                                                        <div className="absolute top-3 right-3 flex gap-2">
                                                            <Button
                                                                size="icon"
                                                                variant="secondary"
                                                                className="h-9 w-9 bg-background/90 backdrop-blur-sm shadow-md"
                                                                onClick={() => {
                                                                    if (typeof field.value === 'string' && field.value) {
                                                                        window.open(field.value, '_blank');
                                                                    }
                                                                }}
                                                            >
                                                                <ImageIcon className="h-4 w-4" />
                                                                <span className="sr-only">View image</span>
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="destructive"
                                                                className="h-9 w-9 bg-background/90 backdrop-blur-sm shadow-md"
                                                                onClick={() => handleRemoveImage(field.onChange)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">Remove image</span>
                                                            </Button>
                                                        </div>
                                                        <div className="absolute bottom-3 left-3 right-3">
                                                            <div className="bg-background/90 backdrop-blur-sm rounded-md p-2 text-xs text-muted-foreground">
                                                                Category cover image selected
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                                        <DialogTrigger asChild>
                                                            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20">
                                                                <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] xl:h-[350px] gap-4">
                                                                    <div className="p-4 rounded-full bg-primary/10">
                                                                        <ImageIcon className="h-8 w-8 text-primary" />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <h3 className="font-medium text-lg">Upload Cover Image</h3>
                                                                        <p className="text-sm text-muted-foreground max-w-xs">
                                                                            Choose a high-quality image that represents this category
                                                                        </p>
                                                                    </div>
                                                                    <Button variant="outline" className="gap-2">
                                                                        <ImageIcon className="h-4 w-4" />
                                                                        Browse Gallery
                                                                    </Button>
                                                                </div>
                                                            </div>
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
                                                                    Choose an image from your gallery to use as the category cover.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="upload dialog">
                                                                <GalleryPage
                                                                    mode="picker"
                                                                    onMediaSelect={(url) => handleImageSelect(url as string, field.onChange)}
                                                                />
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Right Column - Form Fields */}
                            <div className="space-y-6 order-1 xl:order-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
                                    <Badge variant="secondary" className="px-3 py-1">
                                        <FolderPlus className="h-3 w-3 mr-1" />
                                        Category Details
                                    </Badge>
                                    <div className="h-px bg-gradient-to-l from-primary/50 to-transparent flex-1" />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <FolderPlus className="h-4 w-4 text-primary" />
                                                Category Name
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="e.g., Adventure Tours, Cultural Experiences"
                                                    className="focus-visible:ring-primary/50 border-muted-foreground/20 h-11"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <FileText className="h-4 w-4 text-primary" />
                                                Description
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Provide a detailed description of what this category represents"
                                                    className="focus-visible:ring-primary/50 border-muted-foreground/20 min-h-[120px] resize-none"
                                                    rows={5}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Provide a detailed description of what this category represents
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                            </div>
                        </div>

                        {/* Reason Section - Full Width */}
                        <div className="col-span-1 xl:col-span-2 space-y-4 mt-8">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
                                <Badge variant="secondary" className="px-3 py-1">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Justification
                                </Badge>
                                <div className="h-px bg-gradient-to-l from-primary/50 to-transparent flex-1" />
                            </div>

                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                            <MessageSquare className="h-4 w-4 text-primary" />
                                            Reason for Creating This Category
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Explain why this category is needed. For example: 'We need this category because we're expanding our adventure tour offerings and current categories don't adequately represent extreme sports activities.'"
                                                className="focus-visible:ring-primary/50 border-muted-foreground/20 min-h-[120px] resize-none"
                                                rows={5}
                                            />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            This helps administrators understand the business need for this category
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Settings Section - Full Width */}
                        <div className="col-span-1 lg:col-span-2 space-y-4 mt-8">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
                                <Badge variant="secondary" className="px-3 py-1">
                                    <Info className="h-3 w-3 mr-1" />
                                    Settings
                                </Badge>
                                <div className="h-px bg-gradient-to-l from-primary/50 to-transparent flex-1" />
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
