import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Edit, Trash2, Eye, EyeOff, Check, X, Clock, Folder } from "lucide-react";
import {
    toggleCategoryActiveStatus,
    removeExistingCategoryFromSeller,
    deleteCategory
} from "@/lib/api/categoryApi";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryData } from "@/lib/types";
import { useAuth } from "@/lib/hooks/useAuth";

interface CategoryTableRowProps {
    category: CategoryData;
    onUpdate: () => void;
    onDelete: (id: string) => void;
}

const CategoryTableRow = ({ category, onUpdate, onDelete }: CategoryTableRowProps) => {
    const queryClient = useQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Check user role
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';

    // Toggle active status mutation
    const toggleActiveMutation = useMutation({
        mutationFn: () => toggleCategoryActiveStatus(category._id),
        onSuccess: (data) => {
            toast({
                title: "Status updated",
                description: data.message || "Category status has been updated successfully.",
            });
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-categories'] });
            }
            onUpdate();
        },
        onError: (error) => {
            toast({
                title: "Failed to update status",
                description: `There was an error updating the category status: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    // Remove/Delete category mutation
    const removeMutation = useMutation({
        mutationFn: () => {
            if (isAdmin) {
                return deleteCategory(category._id);
            } else {
                return removeExistingCategoryFromSeller(category._id);
            }
        },
        onSuccess: () => {
            toast({
                title: isAdmin ? "Category deleted" : "Category removed",
                description: isAdmin
                    ? "The category has been deleted successfully."
                    : "The category has been removed from your list successfully.",
            });
            setDeleteDialogOpen(false);
            onUpdate();
            onDelete(category._id);
        },
        onError: (error) => {
            toast({
                title: isAdmin ? "Failed to delete" : "Failed to remove",
                description: `There was an error: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const truncateText = (text: string, maxLength: number) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const getApprovalBadge = () => {
        if (category.approvalStatus === 'approved') {
            return (
                <Badge className="bg-green-600 text-white">
                    <Check className="h-3 w-3 mr-1" />
                    Approved
                </Badge>
            );
        } else if (category.approvalStatus === 'rejected') {
            return (
                <Badge className="bg-red-600 text-white">
                    <X className="h-3 w-3 mr-1" />
                    Rejected
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-orange-600 text-white">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                </Badge>
            );
        }
    };

    return (
        <>
            <tr className="border-b hover:bg-muted/50 transition-colors">
                {/* Image Column */}
                <td className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            {category.imageUrl ? (
                                <img
                                    src={category.imageUrl}
                                    alt={category.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                                    <Folder className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{category.name}</p>
                        </div>
                    </div>
                </td>

                {/* Description Column */}
                <td className="p-4 max-w-xs">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {truncateText(category.description || 'No description', 100)}
                    </p>
                </td>

                {/* Status Column */}
                <td className="p-4">
                    <Badge
                        variant={category.isActive ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActiveMutation.mutate()}
                    >
                        {category.isActive ? (
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
                </td>

                {/* Approval Status Column */}
                <td className="p-4">
                    {getApprovalBadge()}
                </td>

                {/* Actions Column */}
                <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                // Trigger edit mode - this would need to be handled by parent
                                // For now, we'll just show a toast
                                toast({
                                    title: "Edit functionality",
                                    description: "Edit mode will be implemented in the parent component",
                                });
                            }}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </td>
            </tr>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isAdmin ? "Delete" : "Remove"} Category</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {isAdmin ? "delete" : "remove"} "{category.name}"?
                            {isAdmin && " This action cannot be undone."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => removeMutation.mutate()}
                            disabled={removeMutation.isPending}
                        >
                            {removeMutation.isPending ? "Processing..." : (isAdmin ? "Delete" : "Remove")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CategoryTableRow;
