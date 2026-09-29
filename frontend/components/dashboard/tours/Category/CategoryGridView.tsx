'use client';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Edit, Trash2, Power, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryData, TourTitle } from "@/types/types";
import type { CategoryGridViewProps } from "@/types/category";
import { useCacheManager, useTourTitlesByIds } from '@/lib/queries';
import { useAuth } from "@/lib/hooks/useAuth";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteCategory, removeExistingCategoryFromSeller, getCategoryUsage } from '@/lib/api/categories';
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import RichTextRenderer from "@/components/RichTextRenderer";
import { useToggleCategoryActive } from '@/lib/queries/useCategories';
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { UsageWarning } from '../UsageWarning';

// Component for toggle active button
const ToggleActiveButton = ({
    categoryId,
    isActive,
    onSuccess
}: {
    categoryId: string;
    isActive: boolean;
    onSuccess: () => void;
}) => {
    const toggleMutation = useToggleCategoryActive();

    const handleToggle = () => {
        toggleMutation.mutate(categoryId);
    };

    // Use useEffect to call onSuccess when mutation succeeds
    useEffect(() => {
        if (toggleMutation.isSuccess) {
            onSuccess();
        }
    }, [toggleMutation.isSuccess, onSuccess]);

    return (
        <Button
            variant="outline"
            size="sm"
            className="w-full bg-background/60 hover:bg-accent/50"
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            aria-label={`${isActive ? 'Deactivate' : 'Activate'} category`}
        >
            <Power className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {toggleMutation.isPending ? 'Updating...' : (isActive ? 'Deactivate' : 'Activate')}
        </Button>
    );
};

const CategoryGridView = ({ categories, isLoading, onRefresh }: CategoryGridViewProps) => {
    const { invalidateCategories } = useCacheManager();
    const { userRole } = useAuth();
    const isAdminView = userRole === 'admin';
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    const featuredTourIds = useMemo(() => {
        const ids = (categories || []).flatMap((c) => (Array.isArray(c.featuredTours) ? c.featuredTours : []));
        return Array.from(new Set(ids.filter(Boolean).map((id) => String(id)))).sort();
    }, [categories]);

    const { data: featuredTourTitlesRaw } = useTourTitlesByIds(featuredTourIds, featuredTourIds.length > 0);

    const featuredTitleMap = useMemo(() => {
        const list = Array.isArray(featuredTourTitlesRaw)
            ? featuredTourTitlesRaw
            : (featuredTourTitlesRaw as { data?: unknown[] })?.data ?? [];
        const m = new Map<string, string>();
        for (const t of list) {
            const id = (t as { _id?: string; id?: string })?._id ?? (t as { id?: string })?.id;
            const title = (t as { title?: string })?.title;
            if (id && title) m.set(String(id), title);
        }
        return m;
    }, [featuredTourTitlesRaw]);

    const handleUpdate = () => {
        invalidateCategories({ my: true, admin: true, pending: true });
        onRefresh?.();
    };

    const deleteMutation = useMutation({
        mutationFn: (categoryId: string) => {
            if (userRole === 'admin') {
                return deleteCategory(categoryId);
            } else {
                return removeExistingCategoryFromSeller(categoryId);
            }
        },
        onSuccess: () => {
            toast({
                title: "Category removed",
                description: "The category has been removed successfully.",
            });
            setDeleteDialogOpen(false);
            setSelectedCategoryId(null);
            handleUpdate();
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to remove",
                description: `There was an error removing the category: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const selectedCategory = selectedCategoryId
        ? categories.find(c => c._id === selectedCategoryId || (c as any).categoryId === selectedCategoryId)
        : null;

    const { data: usage, isLoading: usageLoading } = useQuery({
        queryKey: ['category-usage', selectedCategoryId],
        queryFn: () => getCategoryUsage(selectedCategoryId!),
        enabled: deleteDialogOpen && isAdminView && !!selectedCategoryId,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6" role="status" aria-label="Loading categories">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                        <Skeleton className="h-48 w-full" />
                        <CardContent className="p-6 space-y-4">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!categories || categories.length === 0) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                        <FolderOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-lg font-semibold">No categories found</p>
                        <p className="text-sm text-muted-foreground">
                            Get started by adding your first category.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {categories.map((category) => {
                    // Use _id for the card key and edit/delete operations (UserCategory ID)
                    const userCategoryId = category._id;
                    // Use categoryId for toggle-active API (GlobalCategory ID)
                    const globalCategoryId = (category as any).categoryId || category._id;

                    if (!userCategoryId) {
                        console.warn('[CategoryGridView] Category missing _id:', category);
                        return null;
                    }

                    if (!globalCategoryId) {
                        console.warn('[CategoryGridView] Category missing categoryId (GlobalCategory ID):', category);
                        return null;
                    }

                    return (
                        <Card
                            key={userCategoryId}
                            className="group overflow-hidden flex flex-col h-full border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            {/* Image Section */}
                            <div className="relative h-48 w-full overflow-hidden bg-muted flex-shrink-0">
                                {category.imageUrl ? (
                                    <Image
                                        src={category.imageUrl}
                                        alt={`${category.name} category cover`}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                                        <FolderOpen className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                                    </div>
                                )}
                                {/* Status Badge */}
                                <div className="absolute top-2 right-2">
                                    <Badge
                                        variant="outline"
                                        className={`status-pill shadow-sm ${category.approvalStatus === 'approved'
                                            ? 'status-pill--approved'
                                            : category.approvalStatus === 'pending'
                                                ? 'status-pill--pending'
                                                : 'status-pill--rejected'
                                            }`}
                                    >
                                        {category.approvalStatus === 'approved' ? 'Approved' :
                                            category.approvalStatus === 'pending' ? 'Pending' : 'Rejected'}
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                                <div>
                                    <h3 className="font-semibold text-lg truncate" title={category.name}>{category.name}</h3>
                                </div>

                                {Array.isArray(category.featuredTours) && category.featuredTours.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="status-pill status-pill--featured">
                                            <Star className="h-3 w-3" aria-hidden="true" />
                                            Featured ({category.featuredTours.length})
                                        </Badge>
                                        {category.featuredTours
                                            .map((id) => {
                                                const sid = String(id);
                                                return { id: sid, title: featuredTitleMap.get(sid) };
                                            })
                                            .filter((x): x is { id: string; title: string } => typeof x.title === 'string' && x.title.length > 0)
                                            .slice(0, 10)
                                            .map(({ id, title }) => (
                                                <Badge key={id} variant="secondary" className="text-xs">
                                                    <Link href={`/dashboard/tours/edit/${id}`}>{title}</Link>
                                                </Badge>
                                            ))}
                                    </div>
                                )}

                                <div className="text-sm text-muted-foreground max-h-[150px] overflow-y-auto flex-1">
                                    <RichTextRenderer
                                        content={category.description || 'No description'}
                                        className="prose-sm"
                                    />
                                </div>

                                {category.approvalStatus === 'rejected' && 'rejectionReason' in category && category.rejectionReason && (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
                                        <div className="flex items-start gap-2">
                                            <X className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                                                    Rejection Reason
                                                </p>
                                                <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                                                    {category.rejectionReason}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <Badge variant={category.isActive ? "default" : "secondary"}>
                                        {category.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </CardContent>

                            {/* Actions Footer */}
                            <CardFooter className="p-6 pt-4 border-t bg-muted/15 flex flex-col gap-3 flex-shrink-0">
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 bg-background/60 hover:bg-accent/50"
                                        onClick={() => {
                                            setSelectedCategoryId(globalCategoryId);
                                            setEditDialogOpen(true);
                                        }}
                                        aria-label={`Edit ${category.name} category`}
                                    >
                                        <Edit className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-destructive border-destructive/30 bg-background/60 hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => {
                                            // Use globalCategoryId for removal (API expects GlobalCategory ID)
                                            setSelectedCategoryId(globalCategoryId);
                                            setDeleteDialogOpen(true);
                                        }}
                                        aria-label={`${isAdminView ? 'Delete' : 'Remove'} ${category.name} category`}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                        {isAdminView ? 'Delete' : 'Remove'}
                                    </Button>
                                </div>
                                <ToggleActiveButton
                                    categoryId={globalCategoryId}
                                    isActive={category.isActive ?? false}
                                    onSuccess={handleUpdate}
                                />
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* Edit Dialog */}
            {selectedCategoryId && (
                <EditCategoryDialog
                    categoryId={selectedCategoryId}
                    open={editDialogOpen}
                    onOpenChange={(open) => {
                        setEditDialogOpen(open);
                        if (!open) setSelectedCategoryId(null);
                    }}
                    onSuccess={() => {
                        setEditDialogOpen(false);
                        setSelectedCategoryId(null);
                        handleUpdate();
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent role="alertdialog">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                            {isAdminView ? 'Delete' : 'Remove'} Category
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Are you sure you want to {isAdminView ? 'delete' : 'remove'} &quot;{selectedCategory?.name}&quot;? {isAdminView && 'This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>
                    {isAdminView && <UsageWarning usage={usage} isLoading={usageLoading} entityLabel="category" />}
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setSelectedCategoryId(null);
                            }}
                            aria-label="Cancel deletion"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (selectedCategoryId) {
                                    deleteMutation.mutate(selectedCategoryId);
                                }
                            }}
                            disabled={deleteMutation.isPending}
                            aria-label={`Confirm ${isAdminView ? 'delete' : 'remove'} category`}
                        >
                            {deleteMutation.isPending ? "Processing..." : (isAdminView ? "Delete" : "Remove")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CategoryGridView;
