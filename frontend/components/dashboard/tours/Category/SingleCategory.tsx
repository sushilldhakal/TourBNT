'use client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { updateCategory, getCategoryById, toggleCategoryActiveStatus, removeExistingCategoryFromSeller } from "@/lib/api/categoryApi";
import { toast } from "@/components/ui/use-toast";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Check,
    Clock,
    Edit,
    FileText,
    FolderClosed,
    Image as ImageIcon,
    Minus,
    Save,
    Trash2,
    X,
    ToggleLeft,
    ToggleRight,
    Eye,
    EyeOff
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GalleryPage } from "../../gallery/GalleryPage";
import { CategoryData } from "@/lib/types";
import { useAuth } from "@/lib/hooks/useAuth";

interface SingleCategoryProps {
    category?: CategoryData;
    onDelete?: (id: string) => void;
    onUpdate?: () => void;
}

const SingleCategory: React.FC<SingleCategoryProps> = ({
    category,
    onDelete,
    onUpdate,
}: SingleCategoryProps) => {
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [uploadSubmit, setUploadSubmit] = useState(false);

    const queryClient = useQueryClient();

    // Check user role for query invalidation
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';

    // Debug user role
    console.log('🔍 Current user role:', userRole);
    console.log('🔍 Is admin:', isAdmin);

    const form = useForm({
        mode: 'onChange',
        defaultValues: {
            name: '',
            description: '',
            imageUrl: '',
            isActive: true,
        },
    });

    // Remove category from seller's list mutation (user-specific)
    const removeCategoryMutation = useMutation({
        mutationFn: () => removeExistingCategoryFromSeller(category?._id || ''),
        onSuccess: (data) => {
            toast({
                title: "Category removed",
                description: data.message || "Category has been removed from your list successfully.",
            });
            // Invalidate the appropriate query based on user role
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-categories'] });
            }
            if (onUpdate) onUpdate();
        },
        onError: (error) => {
            toast({
                title: "Failed to remove category",
                description: "An error occurred while removing the category from your list.",
                variant: "destructive",
            });
            console.error('Error removing category:', error);
        },
    });

    // Fetch single category data if categoryId is provided
    const { data: categorySingle, isLoading, isError, error } = useQuery<CategoryData>({
        queryKey: ['singleCategory', category?._id],
        queryFn: async () => {
            console.log('🔍 Fetching category data for ID:', category?._id);
            console.log('🔍 User role:', userRole, 'isAdmin:', isAdmin);

            if (category?._id) {
                try {
                    const result = await getCategoryById(category._id);
                    console.log('🔍 Category data fetched successfully:', result);
                    return result;
                } catch (error) {
                    console.error('❌ Error fetching category:', error);
                    throw error;
                }
            }
            console.error('❌ No category ID provided');
            return Promise.reject('No category ID provided');
        },
        enabled: false, // Disable automatic fetching, we'll use existing category data
        retry: 1,
    });

    // Initialize form with category data when component mounts or category changes
    useEffect(() => {
        if (category) {
            console.log('🔍 Initializing form with category data:', category);
            console.log('🔍 Category fields - name:', category.name, 'description:', category.description, 'imageUrl:', category.imageUrl, 'isActive:', category.isActive);

            const formData = {
                name: category.name || '',
                description: category.description || '',
                imageUrl: category.imageUrl || '',
                isActive: category.isActive ?? true,
            };
            console.log('🔍 Form data being set:', formData);

            form.reset(formData);

            // Also set values individually as a fallback
            form.setValue('name', category.name || '');
            form.setValue('description', category.description || '');
            form.setValue('imageUrl', category.imageUrl || '');
            form.setValue('isActive', category.isActive ?? true);

            console.log('🔍 Form values after reset:', form.getValues());
        }
    }, [category, form]);

    // Update form when entering edit mode with existing category data
    useEffect(() => {
        if (isEditMode && category) {
            console.log('🔍 Entering edit mode, updating form with category data:', category);
            console.log('🔍 Edit mode - isEditMode:', isEditMode);

            // Force form to update with category data
            setTimeout(() => {
                const formData = {
                    name: category.name || '',
                    description: category.description || '',
                    imageUrl: category.imageUrl || '',
                    isActive: category.isActive ?? true,
                };
                console.log('🔍 Edit mode - Setting form data:', formData);
                form.reset(formData);

                // Force individual field updates
                form.setValue('name', category.name || '', { shouldValidate: true });
                form.setValue('description', category.description || '', { shouldValidate: true });
                form.setValue('imageUrl', category.imageUrl || '', { shouldValidate: true });
                form.setValue('isActive', category.isActive ?? true, { shouldValidate: true });

                console.log('🔍 Edit mode - Form values after update:', form.getValues());
            }, 100);
        }
    }, [isEditMode, category, form]);

    // Update form when fresh category data is loaded from API (optional)
    useEffect(() => {
        if (categorySingle && isEditMode) {
            console.log('🔍 Fresh category data loaded from API:', categorySingle);
            form.reset({
                name: categorySingle.name || '',
                description: categorySingle.description || '',
                imageUrl: categorySingle.imageUrl || '',
                isActive: categorySingle.isActive ?? true,
            });
        }
    }, [categorySingle, isEditMode, form]);

    // Show error message if API call fails but continue with existing data
    useEffect(() => {
        if (isError && isEditMode) {
            console.log('⚠️ API call failed, but continuing with existing category data');
            toast({
                title: "Using existing data",
                description: "Could not fetch latest data, but you can still edit with current information.",
                variant: "default",
            });
        }
    }, [isError, isEditMode]);

    const updateCategoryMutation = useMutation({
        mutationFn: (categoryData: FormData) => updateCategory(category?._id || '', categoryData),
        onSuccess: () => {
            toast({
                title: 'Category updated successfully',
                description: 'Your changes have been saved.',
                variant: 'default',
            });
            setIsEditMode(false);
            setUploadSubmit(!uploadSubmit);
            // Invalidate the appropriate query based on user role
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-categories'] });
            }
            if (onUpdate) onUpdate();
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

    // Toggle category active status mutation (user-specific)
    const toggleStatusMutation = useMutation({
        mutationFn: () => toggleCategoryActiveStatus(category?._id || ''),
        onSuccess: (data) => {
            toast({
                title: "Status updated",
                description: data.message || "Category status has been updated successfully.",
            });
            // Invalidate the appropriate query based on user role
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-categories'] });
            }
            if (onUpdate) onUpdate();
        },
        onError: (error) => {
            toast({
                title: "Failed to update status",
                description: "An error occurred while updating the category status.",
                variant: "destructive",
            });
            console.error('Error toggling category status:', error);
        },
    });

    const handleUpdateCategory = async () => {
        if (form.formState.isValid) {
            const formData = new FormData();
            console.log('Form Values:', form.getValues()); // Debug log to check form values
            formData.append('name', form.getValues('name') || '');
            formData.append('description', form.getValues('description') || '');
            formData.append('imageUrl', form.getValues('imageUrl') || '');

            // Note: isActive is user-specific and handled separately via toggleCategoryActiveStatus
            // It should not be sent as part of global category updates
            console.log('📝 isActive field not included in global category update (user-specific)');

            // Log each key-value pair in FormData for debugging
            console.log('FormData contents:');
            for (const [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            try {
                setUploadSubmit(true);
                await updateCategoryMutation.mutateAsync(formData);
            } catch (error) {
                toast({
                    title: 'Failed to update category',
                    description: 'Please try again later.',
                    variant: 'destructive',
                });
            }
        }
    };

    const handleDeleteCategory = () => {
        // Open the confirmation dialog instead of deleting immediately
        setDeleteDialogOpen(true);
    };

    // This function is called when the user confirms deletion in the dialog
    const confirmDeleteCategory = () => {
        if (onDelete && category?._id) {
            onDelete(category._id);
            setDeleteDialogOpen(false);
            toast({
                title: "Category deleted",
                description: "The category has been deleted successfully."
            });
        } else {
            toast({
                title: "Error",
                description: "Could not delete the category. Please try again.",
                variant: "destructive"
            });
            setDeleteDialogOpen(false);
        }
    };

    const handleImageSelect = (imageUrl: string, onChange: (value: string) => void) => {
        onChange(imageUrl);
        setDialogOpen(false);
    };

    const handleRemoveImage = (onChange: (value: string) => void) => {
        onChange('');
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.preventDefault();
        console.log('🔍 Edit button clicked!');
        console.log('🔍 Category data available:', !!category);
        console.log('🔍 Category object:', category);

        if (category) {
            const formData = {
                name: category.name || '',
                description: category.description || '',
                imageUrl: category.imageUrl || '',
                isActive: category.isActive ?? true,
            };

            console.log('🔍 Form data to be set in handleEditClick:', formData);

            // Initialize form with category data immediately
            form.reset(formData);

            // Also set values individually
            form.setValue('name', category.name || '');
            form.setValue('description', category.description || '');
            form.setValue('imageUrl', category.imageUrl || '');
            form.setValue('isActive', category.isActive ?? true);

            console.log('🔍 Form values after handleEditClick:', form.getValues());

            setIsEditMode(true);

            console.log('🔍 Edit mode set to true');
        } else {
            console.log('❌ No category data available for editing');
        }
    };

    const handleCancelClick = () => {
        setIsEditMode(false);
        form.reset();
    };

    // Test function to manually set form values
    const testFormValues = () => {
        console.log('🧪 Testing form values...');
        form.setValue('name', 'Test Name');
        form.setValue('description', 'Test Description');
        form.setValue('imageUrl', 'test-image.jpg');
        form.setValue('isActive', true);
        console.log('🧪 Form values after manual set:', form.getValues());
    };

    const handleToggleStatus = () => {
        if (category?._id) {
            toggleStatusMutation.mutate();
        }
    };

    if (isLoading) return (
        <Card className="shadow-xs animate-pulse py-0">
            <div className="w-full h-[200px] bg-muted rounded-t-md"></div>
            <CardContent className="p-6 space-y-4">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-16 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
            </CardContent>
        </Card>
    );

    if (isError) return (
        <Card className="shadow-xs border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
                <p className="text-destructive">Failed to load category data</p>
            </CardContent>
        </Card>
    );

    return (
        <Form {...form}>
            <form onSubmit={(e) => {
                e.preventDefault();
                handleUpdateCategory();
            }}>
                <Card className={cn(
                    "shadow-xs py-0 overflow-hidden transition-all",
                    isEditMode ? "border-primary/30 bg-primary/5" : "hover:border-border/80"
                )}>
                    {isEditMode ? (
                        <>
                            <div className="relative">
                                <FormField
                                    control={form.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            {field.value ? (
                                                <div className="relative">
                                                    <img
                                                        src={field.value}
                                                        alt="Category cover"
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
                                                    <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-xs">
                                                        Cover Image
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="w-full h-[200px] flex flex-col items-center justify-center gap-2 border-dashed"
                                                        >
                                                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
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
                                                                Choose an image from your gallery to use as the category cover.
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
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <CardContent className="p-5 mt-2 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-primary/10 text-primary">Editing</Badge>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1.5">
                                                <FolderClosed className="h-3.5 w-3.5 text-primary" />
                                                Category Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Enter category name"
                                                    className="focus-visible:ring-primary"
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
                                            <FormLabel className="flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5 text-primary" />
                                                Description
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    rows={4}
                                                    placeholder="Enter category description"
                                                    className="focus-visible:ring-primary resize-none"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Provide a brief description of this category
                                            </p>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Active Status</FormLabel>
                                                <p className="text-sm text-muted-foreground">
                                                    Enable this category to make it visible to users
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </>
                    ) : (
                        <>
                            <div className="relative overflow-hidden rounded-t-lg">
                                {category?.imageUrl ? (
                                    <>
                                        <img
                                            src={category.imageUrl as string}
                                            alt={category.name || 'Category'}
                                            className="w-full h-[200px] object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                        {/* Subtle gradient overlay for better badge visibility */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
                                    </>
                                ) : (
                                    <div className="w-full h-[200px] bg-gradient-to-br from-muted to-muted/70 flex items-center justify-center">
                                        <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
                                    </div>
                                )}

                                {/* Active/Inactive Status Badge - Top Left */}
                                {category?.isActive ? (
                                    <div className="absolute top-3 left-3 z-10">
                                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-white/20 shadow-xl backdrop-blur-md font-semibold px-3 py-2 text-xs rounded-full transition-all duration-200">
                                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                                            <span>Active</span>
                                        </Badge>
                                    </div>
                                ) : (
                                    <div className="absolute top-3 left-3 z-10">
                                        <Badge className="bg-gray-700 hover:bg-gray-800 text-white border-2 border-white/20 shadow-xl backdrop-blur-md font-semibold px-3 py-2 text-xs rounded-full transition-all duration-200">
                                            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                                            <span>Inactive</span>
                                        </Badge>
                                    </div>
                                )}

                                {/* Approval Status Badge - Top Right */}
                                {category?.approvalStatus === 'approved' ? (
                                    <div className="absolute top-3 right-3 z-10">
                                        <Badge className="bg-green-600 hover:bg-green-700 text-white border-2 border-white/20 shadow-xl backdrop-blur-md font-semibold px-3 py-2 text-xs rounded-full transition-all duration-200">
                                            <Check className="mr-1.5 h-3.5 w-3.5" />
                                            <span>Approved</span>
                                        </Badge>
                                    </div>
                                ) : category?.approvalStatus === 'rejected' ? (
                                    <div className="absolute top-3 right-3 z-10">
                                        <Badge className="bg-red-600 hover:bg-red-700 text-white border-2 border-white/20 shadow-xl backdrop-blur-md font-semibold px-3 py-2 text-xs rounded-full transition-all duration-200">
                                            <X className="mr-1.5 h-3.5 w-3.5" />
                                            <span>Rejected</span>
                                        </Badge>
                                    </div>
                                ) : (
                                    <div className="absolute top-3 right-3 z-10">
                                        <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-2 border-white/20 shadow-xl backdrop-blur-md font-semibold px-3 py-2 text-xs rounded-full transition-all duration-200">
                                            <Clock className="mr-1.5 h-3.5 w-3.5" />
                                            <span>Pending</span>
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <FolderClosed className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold text-lg">
                                        {category?.name}
                                    </h3>
                                </div>

                                <Separator className="my-3" />

                                <div className="text-sm text-muted-foreground">
                                    {category?.description
                                        ? category.description.length > 150
                                            ? `${category.description.slice(0, 150)}...`
                                            : category.description
                                        : <span className="italic text-muted-foreground/70">No description available</span>}
                                </div>
                            </CardContent>
                        </>
                    )}

                    <CardFooter className={cn(
                        "flex justify-end gap-2 px-5 py-3 bg-secondary/50 border-t",
                        isEditMode && "bg-primary/5 border-primary/20"
                    )}>
                        {isEditMode ? (
                            <>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={updateCategoryMutation.isPending}
                                    className="gap-1.5"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelClick}
                                    className="gap-1.5"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                {/* Toggle button for non-admin users */}
                                {!isAdmin && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleToggleStatus}
                                        disabled={toggleStatusMutation.isPending}
                                        className={cn(
                                            "gap-1.5",
                                            category?.isActive
                                                ? "text-green-600 hover:text-green-700"
                                                : "text-muted-foreground hover:text-primary"
                                        )}
                                    >
                                        {category?.isActive ? (
                                            <ToggleRight className="h-3.5 w-3.5" />
                                        ) : (
                                            <ToggleLeft className="h-3.5 w-3.5" />
                                        )}
                                        {category?.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                )}

                                {/* Remove button for sellers (removes from their list only) */}
                                {!isAdmin && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeCategoryMutation.mutate()}
                                        disabled={removeCategoryMutation.isPending}
                                        className="text-muted-foreground hover:text-red-600 gap-1.5"
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                        {removeCategoryMutation.isPending ? 'Removing...' : 'Remove'}
                                    </Button>
                                )}

                                {/* Edit button for admin users */}
                                {isAdmin && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleEditClick}
                                        className="text-muted-foreground hover:text-primary gap-1.5"
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                        Edit
                                    </Button>
                                )}

                                {/* Delete button for admin users */}
                                {isAdmin && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteCategory()}
                                        className="text-muted-foreground hover:text-destructive gap-1.5"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </Button>
                                )}
                            </>
                        )}


                    </CardFooter>
                </Card>
            </form>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this category? This action cannot be undone.
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
                            onClick={confirmDeleteCategory}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Form>
    );
};

export default SingleCategory;
