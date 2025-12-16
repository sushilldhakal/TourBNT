'use client';
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import SingleCategory from "./SingleCategory";
import CategoryTableRow from "./CategoryTableRow";
import AddCategory from "./AddCategory";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CameraIcon,
    Folder,
    FolderPlus,
    Plus,
    Search,
    X,
    AlertTriangle,
    Check,
    XIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCategoriesRoleBased, usePendingCategories } from "./useCategories";
import { approveCategory, deleteCategory, rejectCategory } from "@/lib/api/categoryApi";
import { CategoryData } from "@/lib/types";
import { ViewToggle, ViewMode } from "../ViewToggle";
import { getViewPreference, setViewPreference } from "@/lib/utils/viewPreferences";
import { useAuth } from "@/lib/hooks/useAuth";

const TourCategory = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [view, setView] = useState<ViewMode>(() => getViewPreference('categories'));

    // Load view preference on mount and save when it changes
    useEffect(() => {
        const savedView = getViewPreference('categories');
        setView(savedView);
    }, []);

    // Save view preference when it changes
    const handleViewChange = (newView: ViewMode) => {
        setView(newView);
        setViewPreference('categories', newView);
    };

    // Check user role for query invalidation

    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const isAdminView = useMemo(() => {
        // userRole is a string, so check directly
        return userRole === 'admin';
        // Or, if userRole can be multiple roles like "admin,seller":
        // return userRole?.split(',').includes('admin') ?? false;
    }, [userRole]);

    // Fetch categories based on user role (admin sees all, users see their personal categories)
    const { data: categories, isLoading, isError } = useCategoriesRoleBased();

    // Fetch pending categories for admin users
    const { data: pendingCategories, isLoading: pendingLoading, isError: pendingError } = usePendingCategories();

    // Filter categories based on search query
    const filteredCategories = categories?.filter((category: CategoryData) => {
        const nameMatch = category.name.toLowerCase().includes(searchQuery.toLowerCase());
        const descriptionMatch = category.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || descriptionMatch;
    });

    // Admin mutations
    const approveMutation = useMutation({
        mutationFn: (categoryId: string) => approveCategory(categoryId),
        onSuccess: () => {
            toast({
                title: "Category approved",
                description: "The category has been approved and is now available.",
                variant: "default",
            });
            // Invalidate both query types since approval affects both admin and user views
            queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
            queryClient.invalidateQueries({ queryKey: ['user-categories'] });
            queryClient.invalidateQueries({ queryKey: ['pending-categories'] });
        },
        onError: () => {
            toast({
                title: "Failed to approve category",
                description: "There was an error approving the category.",
                variant: "destructive",
            });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ categoryId, reason }: { categoryId: string; reason: string }) =>
            rejectCategory(categoryId, reason),
        onSuccess: () => {
            toast({
                title: "Category rejected",
                description: "The category has been rejected.",
                variant: "default",
            });
            // Invalidate both query types since rejection affects both admin and user views
            queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
            queryClient.invalidateQueries({ queryKey: ['user-categories'] });
            queryClient.invalidateQueries({ queryKey: ['pending-categories'] });
            setRejectDialogOpen(false);
            setRejectReason("");
            setSelectedCategory(null);
        },
        onError: () => {
            toast({
                title: "Failed to reject category",
                description: "There was an error rejecting the category.",
                variant: "destructive",
            });
        },
    });

    const handleDeleteCategory = async (categoryId: string) => {
        try {
            await deleteCategory(categoryId);
            toast({
                title: 'Category deleted successfully',
                description: 'The category has been removed.',
                variant: 'default',
            });
            // Invalidate the appropriate query based on user role
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-categories'] });
            }
        } catch (error) {
            toast({
                title: 'Failed to delete category',
                description: 'An error occurred while deleting the category.',
                variant: 'destructive',
            });
        }
    };

    // Generate skeleton cards for loading state
    const skeletonCards = Array(6).fill(0).map((_, index) => (
        <Card key={`skeleton-${index}`} className="shadow-xs animate-pulse py-0">
            <div className="w-full h-[200px] bg-muted rounded-t-md"></div>
            <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-16 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
            </CardContent>
        </Card>
    ));

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Folder className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Tour Categories</h1>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search categories..."
                            className="pl-8! w-full sm:w-[250px] bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full aspect-square rounded-l-none"
                                onClick={() => setSearchQuery("")}
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Clear search</span>
                            </Button>
                        )}
                    </div>
                    <ViewToggle view={view} onViewChange={handleViewChange} />
                    <Button
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                        className="gap-1.5"
                    >
                        {isAddingCategory ? (
                            <>
                                <X className="h-4 w-4" />
                                Cancel
                            </>
                        ) : (
                            <>
                                <FolderPlus className="h-4 w-4" />
                                Add Category
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {isAddingCategory && (
                <>
                    <Separator className="my-4" />
                    <AddCategory
                        onCategoryAdded={() => {
                            setIsAddingCategory(false);
                            // Invalidate the appropriate query based on user role
                            if (isAdmin) {
                                queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
                            } else {
                                queryClient.invalidateQueries({ queryKey: ['user-categories'] });
                            }
                        }}
                    />
                </>
            )}

            <Separator className="my-4" />

            {/* Admin: Pending Categories Section */}
            {isAdmin && pendingCategories && pendingCategories.length > 0 && (
                <>
                    <div className="flex items-center gap-2 mb-6">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <h2 className="text-xl font-semibold">Pending Categories for Approval</h2>
                        <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-300">
                            {pendingCategories.length} pending
                        </Badge>
                    </div>

                    <div className="space-y-4 mb-8">
                        {pendingCategories.map((category) => (
                            <Card key={category._id} className="overflow-hidden py-0 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 hover:shadow-lg transition-all duration-200">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Folder className="h-5 w-5 text-orange-600" />
                                                <CardTitle className="text-lg">{category.name}</CardTitle>
                                                <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                                                    Pending
                                                </Badge>
                                            </div>
                                            <CardDescription className="text-sm text-muted-foreground">
                                                {category.description || 'No description provided'}
                                            </CardDescription>
                                        </div>
                                        {category.imageUrl && (
                                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted ml-4">
                                                <img
                                                    src={category.imageUrl}
                                                    alt={category.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => approveMutation.mutate(category._id)}
                                            disabled={approveMutation.isPending}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <Check className="h-4 w-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedCategory(category);
                                                setRejectDialogOpen(true);
                                            }}
                                            disabled={rejectMutation.isPending}
                                            className="border-red-300 text-red-700 hover:bg-red-50"
                                        >
                                            <XIcon className="h-4 w-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Separator className="my-6" />
                </>
            )}

            {isLoading ? (
                view === 'list' ? (
                    // Loading state - List view
                    <Card className="py-0">
                        <CardContent className="p-0">
                            <div className="p-6 space-y-4">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded bg-muted animate-pulse" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-[200px] bg-muted rounded animate-pulse" />
                                            <div className="h-3 w-[150px] bg-muted rounded animate-pulse" />
                                        </div>
                                        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    // Loading state - Grid view
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {skeletonCards}
                    </div>
                )
            ) : isError ? (
                <Card className="border-destructive/50 py-0 bg-destructive/5 shadow-xs">
                    <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-3">
                            <CameraIcon className="h-8 w-8 text-destructive" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load categories</h3>
                        <p className="text-sm text-muted-foreground">There was an error loading your categories. Please try refreshing the page.</p>
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => {
                                // Invalidate the appropriate query based on user role
                                if (isAdmin) {
                                    queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
                                } else {
                                    queryClient.invalidateQueries({ queryKey: ['user-categories'] });
                                }
                            }}
                        >
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            ) : filteredCategories && filteredCategories.length > 0 ? (
                view === 'list' ? (
                    // List/Table view
                    <Card className="py-0">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="text-left p-4 font-semibold text-sm">Category</th>
                                            <th className="text-left p-4 font-semibold text-sm">Description</th>
                                            <th className="text-left p-4 font-semibold text-sm">Status</th>
                                            <th className="text-left p-4 font-semibold text-sm">Approval</th>
                                            <th className="text-right p-4 font-semibold text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCategories.map((category) => (
                                            <CategoryTableRow
                                                key={category.id}
                                                category={category}
                                                onUpdate={() => {
                                                    if (isAdminView) {
                                                        queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
                                                    } else {
                                                        queryClient.invalidateQueries({ queryKey: ['user-categories'] });
                                                    }
                                                }}
                                                onDelete={() => {
                                                    if (isAdminView) {
                                                        queryClient.refetchQueries({ queryKey: ['seller-categories'], exact: false });
                                                    } else {
                                                        queryClient.refetchQueries({ queryKey: ['user-categories'], exact: false });
                                                    }
                                                }}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    // Grid view
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCategories.map((category) => (
                            <SingleCategory
                                key={category.id}
                                category={category}
                                onUpdate={() => {
                                    // Invalidate the appropriate query based on user role
                                    if (isAdminView) {
                                        queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
                                    } else {
                                        queryClient.invalidateQueries({ queryKey: ['user-categories'] });
                                    }
                                }}
                                onDelete={() => {
                                    // Invalidate and refetch the appropriate query based on user role
                                    if (isAdminView) {
                                        queryClient.refetchQueries({ queryKey: ['seller-categories'], exact: false });
                                    } else {
                                        queryClient.refetchQueries({ queryKey: ['user-categories'], exact: false });
                                    }
                                }}

                            />
                        ))}
                    </div>
                )
            ) : categories && categories.length > 0 ? (
                <Card className="border-muted/50 py-0 shadow-xs">
                    <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-3">
                            <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No matching categories</h3>
                        <p className="text-sm text-muted-foreground">
                            No categories match your search for "<span className="font-medium">{searchQuery}</span>".
                        </p>
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => setSearchQuery("")}
                        >
                            Clear Search
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-muted/50 py-0 shadow-xs">
                    <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-3">
                            <FolderPlus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
                        <p className="text-sm text-muted-foreground">You haven't created any categories yet. Get started by adding your first category.</p>
                        <Button
                            className="mt-4"
                            onClick={() => setIsAddingCategory(true)}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create First Category
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Category</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting "{selectedCategory?.name}". This will help the seller understand why their category was not approved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Enter rejection reason..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRejectDialogOpen(false);
                                setRejectReason("");
                                setSelectedCategory(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (selectedCategory && rejectReason.trim()) {
                                    rejectMutation.mutate({
                                        categoryId: selectedCategory._id,
                                        reason: rejectReason.trim()
                                    });
                                }
                            }}
                            disabled={!rejectReason.trim() || rejectMutation.isPending}
                        >
                            {rejectMutation.isPending ? "Rejecting..." : "Reject Category"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TourCategory;
