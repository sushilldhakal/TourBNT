import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Edit, Trash2, Eye, EyeOff, MapPin, Clock, Check, X as XIcon } from "lucide-react";
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

interface DestinationGridCardProps {
    destinationId: string;
    onUpdate: () => void;
    onDelete?: () => void;
    onEdit?: (destinationId: string) => void;
}

const DestinationGridCard = ({ destinationId, onUpdate, onDelete, onEdit }: DestinationGridCardProps) => {
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
            <Card className="overflow-hidden py-0 hover:shadow-lg transition-all duration-200 group">
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden bg-muted">
                    {destination.coverImage ? (
                        <img
                            src={destination.coverImage}
                            alt={destination.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                            <MapPin className="h-12 w-12 text-muted-foreground" />
                        </div>
                    )}

                    {/* Approval Status Badge */}
                    {destination.approvalStatus && (
                        <div className="absolute top-3 left-3">
                            <Badge
                                variant="outline"
                                className={
                                    destination.approvalStatus === 'approved'
                                        ? "bg-green-600 text-white border-green-700 shadow-md"
                                        : destination.approvalStatus === 'pending'
                                            ? "bg-orange-600 text-white border-orange-700 shadow-md"
                                            : "bg-red-600 text-white border-red-700 shadow-md"
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
                        </div>
                    )}
                </div>

                {/* Content */}
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <h3 className="font-semibold text-lg line-clamp-1">{destination.name}</h3>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {getLocationString()}
                    </p>

                    <div className="text-sm text-muted-foreground line-clamp-2">
                        <RichTextRenderer
                            content={destination.description || 'No description'}
                            className="prose-sm"
                        />
                    </div>

                    {/* Active/Inactive Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-muted-foreground">
                            Visibility
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                {destination.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <Switch
                                checked={destination.isActive}
                                onCheckedChange={() => toggleActiveMutation.mutate()}
                                disabled={toggleActiveMutation.isPending}
                                className="data-[state=checked]:bg-green-500"
                            />
                        </div>
                    </div>
                </CardContent>

                {/* Actions */}
                <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditDialogOpen(true)}
                        className="gap-1.5"
                    >
                        <Edit className="h-4 w-4" />
                        Edit
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialogOpen(true)}
                        className="gap-1.5 text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </Button>
                </CardFooter>
            </Card>

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

export default DestinationGridCard;
