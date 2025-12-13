import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Edit, Trash2, Eye, EyeOff, Clock, Check, X as XIcon } from "lucide-react";
import {
    toggleDestinationActiveStatus,
    removeExistingDestinationFromSeller,
    deleteDestination,
    getSellerDestinations,
    getUserDestinations
} from "@/lib/api/destinationApi";
import { getUserRole } from "@/lib/auth/authUtils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDestinationDialog } from "./EditDestinationDialog";
import RichTextRenderer from "@/components/RichTextRenderer";

interface DestinationTableRowProps {
    destinationId: string;
    onUpdate: () => void;
    onDelete?: () => void;
    onEdit?: (destinationId: string) => void;
}

const DestinationTableRow = ({ destinationId, onUpdate, onDelete, onEdit }: DestinationTableRowProps) => {
    const queryClient = useQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

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

    // Toggle active status mutation
    const toggleActiveMutation = useMutation({
        mutationFn: () => toggleDestinationActiveStatus(destinationId),
        onSuccess: (data) => {
            toast({
                title: "Status updated",
                description: data.message || "Destination status has been updated successfully.",
            });
            if (isAdmin) {
                queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['user-destinations'] });
            }
            onUpdate();
        },
        onError: (error) => {
            toast({
                title: "Failed to update status",
                description: `There was an error updating the destination status: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    // Remove destination mutation
    const removeMutation = useMutation({
        mutationFn: () => {
            if (userRole === 'admin') {
                return deleteDestination(destinationId);
            } else {
                return removeExistingDestinationFromSeller(destinationId);
            }
        },
        onSuccess: () => {
            toast({
                title: "Destination removed",
                description: "The destination has been removed successfully.",
            });
            setDeleteDialogOpen(false);
            onUpdate();
            if (onDelete) onDelete();
        },
        onError: (error) => {
            toast({
                title: "Failed to remove",
                description: `There was an error removing the destination: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    if (!destination) return null;

    const truncateText = (text: string, maxLength: number) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const getLocationString = () => {
        const parts = [destination.city, destination.region, destination.country].filter(Boolean);
        return parts.join(', ') || 'N/A';
    };

    return (
        <>
            <tr className="border-b hover:bg-muted/50 transition-colors">
                {/* Destination Column */}
                <td className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            {destination.coverImage ? (
                                <img
                                    src={destination.coverImage}
                                    alt={destination.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full bg-gradient-to-br from-muted to-muted/80" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{destination.name}</p>
                        </div>
                    </div>
                </td>

                {/* Location Column */}
                <td className="p-4">
                    <p className="text-sm text-muted-foreground">{getLocationString()}</p>
                </td>

                {/* Description Column */}
                <td className="p-4 max-w-xs">
                    <div className="text-sm text-muted-foreground line-clamp-2">
                        <RichTextRenderer
                            content={destination.description || 'No description'}
                            className="prose-sm"
                        />
                    </div>
                </td>

                {/* Status Column */}
                <td className="p-4">
                    <div className="flex flex-col gap-2">
                        {/* Approval Status Badge */}
                        {destination.approvalStatus && (
                            <Badge
                                variant="outline"
                                className={
                                    destination.approvalStatus === 'approved'
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : destination.approvalStatus === 'pending'
                                            ? "bg-orange-50 text-orange-700 border-orange-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                }
                            >
                                {destination.approvalStatus === 'approved' ? (
                                    <>
                                        <Check className="h-3 w-3 mr-1" />
                                        Approved
                                    </>
                                ) : destination.approvalStatus === 'pending' ? (
                                    <>
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending
                                    </>
                                ) : (
                                    <>
                                        <XIcon className="h-3 w-3 mr-1" />
                                        Rejected
                                    </>
                                )}
                            </Badge>
                        )}

                        {/* Active/Inactive Toggle */}
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={destination.isActive}
                                onCheckedChange={() => toggleActiveMutation.mutate()}
                                disabled={toggleActiveMutation.isPending}
                                className="data-[state=checked]:bg-green-500"
                            />
                            <span className="text-xs text-muted-foreground">
                                {destination.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </td>

                {/* Actions Column */}
                <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditDialogOpen(true)}
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

            {/* Edit Dialog */}
            <EditDestinationDialog
                destinationId={destinationId}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={onUpdate}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Destination</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{destination.name}"? This action cannot be undone.
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
                            {removeMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default DestinationTableRow;
