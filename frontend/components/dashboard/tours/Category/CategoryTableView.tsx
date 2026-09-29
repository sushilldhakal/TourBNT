"use client";

import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, X as XIcon, Edit, Trash2, Power, Star } from "lucide-react";
import { CategoryData } from "@/types/types";
import type { CategoryTableViewProps } from "@/types/category";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCacheManager } from '@/lib/queries/cacheUtils';
import { useAuth } from "@/lib/hooks/useAuth";
import { deleteCategory, removeExistingCategoryFromSeller, getCategoryUsage } from '@/lib/api/categories';
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import RichTextRenderer from "@/components/RichTextRenderer";
import { useToggleCategoryActive } from '@/lib/queries/useCategories';
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
        // Call onSuccess after the mutation completes successfully
        if (toggleMutation.isSuccess) {
            onSuccess();
        }
    };

    // Use useEffect to call onSuccess when mutation succeeds
    React.useEffect(() => {
        if (toggleMutation.isSuccess) {
            onSuccess();
        }
    }, [toggleMutation.isSuccess, onSuccess]);

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            title={isActive ? 'Deactivate category' : 'Activate category'}
            aria-label={isActive ? 'Deactivate category' : 'Activate category'}
        >
            <Power className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} aria-hidden="true" />
        </Button>
    );
};

const CategoryTableView = ({ categories, isLoading, onRefresh }: CategoryTableViewProps) => {
    const { invalidateCategories } = useCacheManager();
    const { userRole } = useAuth();
    const isAdminView = userRole === 'admin';
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
            invalidateCategories({ my: true, admin: true, pending: true });
            onRefresh?.();
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
        ? categories.find(c => c._id === selectedCategoryId || (c as any).categoryId === selectedCategoryId || c.id === selectedCategoryId)
        : null;

    const { data: usage, isLoading: usageLoading } = useQuery({
        queryKey: ['category-usage', selectedCategoryId],
        queryFn: () => getCategoryUsage(selectedCategoryId!),
        enabled: deleteDialogOpen && isAdminView && !!selectedCategoryId,
    });
    const isDeleteBlocked = isAdminView && !!usage && (usage.sellerCount > 0 || usage.tourCount > 0);

    const columns: ColumnDef<CategoryData>[] = [
        {
            accessorKey: "name",
            header: "Category",
            cell: ({ row }) => {
                const category = row.original;
                return (
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                            {category.imageUrl ? (
                                <Image
                                    src={category.imageUrl}
                                    alt={`${category.name} category cover`}
                                    fill
                                    className="object-cover rounded"
                                    sizes="48px"
                                />
                            ) : (
                                <div className="h-full w-full bg-gradient-to-br from-muted to-muted/80" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{category.name}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => {
                const category = row.original;
                return (
                    <div className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                        <RichTextRenderer
                            content={category.description || 'No description'}
                            className="prose-sm"
                        />
                    </div>
                );
            },
        },
        {
            accessorKey: "approvalStatus",
            header: "Status",
            cell: ({ row }) => {
                const category = row.original;
                const featuredCount = Array.isArray(category.featuredTours) ? category.featuredTours.length : 0;
                return (
                    <div className="flex flex-col gap-2">
                        {category.approvalStatus && (
                            <Badge
                                variant="outline"
                                className={`status-pill ${category.approvalStatus === 'approved'
                                    ? 'status-pill--approved'
                                    : category.approvalStatus === 'pending'
                                        ? 'status-pill--pending'
                                        : 'status-pill--rejected'
                                    }`}
                            >
                                {category.approvalStatus === 'approved' ? (
                                    <>
                                        <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                                        Approved
                                    </>
                                ) : category.approvalStatus === 'pending' ? (
                                    <>
                                        <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                                        Pending
                                    </>
                                ) : (
                                    <>
                                        <XIcon className="h-3 w-3 mr-1" aria-hidden="true" />
                                        Rejected
                                    </>
                                )}
                            </Badge>
                        )}
                        {featuredCount > 0 && (
                            <Badge variant="outline" className="status-pill status-pill--featured w-fit">
                                <Star className="h-3 w-3 mr-1" aria-hidden="true" />
                                Featured ({featuredCount})
                            </Badge>
                        )}
                        {/* Rejection Reason - show if rejected */}
                        {category.approvalStatus === 'rejected' && 'rejectionReason' in category && category.rejectionReason && (
                            <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-md">
                                <p className="text-xs font-semibold text-rose-900 dark:text-rose-100 mb-1">
                                    Rejection Reason:
                                </p>
                                <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                                    {category.rejectionReason}
                                </p>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                {category.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const category = row.original;
                // Use _id for edit/delete operations (UserCategory ID)
                const userCategoryId = category._id || category.id;
                // Use categoryId for toggle-active API (GlobalCategory ID)
                const globalCategoryId = (category as any).categoryId || category._id || category.id;

                if (!userCategoryId) return null;
                if (!globalCategoryId) return null;

                return (
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedCategoryId(globalCategoryId);
                                setEditDialogOpen(true);
                            }}
                            title="Edit category"
                            aria-label="Edit category"
                        >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        {!isAdminView && (
                            <ToggleActiveButton
                                categoryId={globalCategoryId}
                                isActive={category.isActive ?? false}
                                onSuccess={handleUpdate}
                            />
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                // Use globalCategoryId for removal (API expects GlobalCategory ID)
                                setSelectedCategoryId(globalCategoryId);
                                setDeleteDialogOpen(true);
                            }}
                            title={isAdminView ? "Delete category" : "Remove category"}
                            aria-label={isAdminView ? "Delete category" : "Remove category"}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-[200px] bg-muted animate-pulse rounded" />
                            <div className="h-3 w-[150px] bg-muted animate-pulse rounded" />
                        </div>
                        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <DataTable
                data={categories || []}
                columns={columns}
                place="Search categories..."
                column="name"
            />

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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isAdminView ? 'Delete' : 'Remove'} Category</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {isAdminView ? 'delete' : 'remove'} &quot;{selectedCategory?.name}&quot;? {isAdminView && 'This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>
                    {isAdminView && <UsageWarning usage={usage} isLoading={usageLoading} entityLabel="category" />}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setSelectedCategoryId(null);
                            }}
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
                            disabled={deleteMutation.isPending || (isAdminView && usageLoading) || isDeleteBlocked}
                            title={isDeleteBlocked ? 'Remove this category from every seller/tour listed above first' : undefined}
                        >
                            {deleteMutation.isPending ? "Processing..." : (isAdminView ? "Delete" : "Remove")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CategoryTableView;
