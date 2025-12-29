"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, X as XIcon, Edit, Trash2 } from "lucide-react";
import { DestinationTypes } from "@/lib/types";
import { EditDestinationDialog } from "./EditDestinationDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { deleteDestination, removeExistingDestinationFromSeller } from "@/lib/api/destinations";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import RichTextRenderer from "@/components/RichTextRenderer";

interface DestinationTableViewProps {
    destinations: DestinationTypes[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

const DestinationTableView = ({ destinations, isLoading, onRefresh }: DestinationTableViewProps) => {
    const queryClient = useQueryClient();
    const { userRole } = useAuth();
    const isAdminView = userRole === 'admin';
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);

    const handleUpdate = () => {
        if (isAdminView) {
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
        } else {
            queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
        }
        onRefresh?.();
    };

    const deleteMutation = useMutation({
        mutationFn: (destinationId: string) => {
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
            setSelectedDestinationId(null);
            // Invalidate all destination-related queries
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
            queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
            queryClient.invalidateQueries({ queryKey: ['pending-destinations'] });
            onRefresh?.();
        },
        onError: (error: any) => {
            toast({
                title: "Failed to remove",
                description: `There was an error removing the destination: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const selectedDestination = selectedDestinationId
        ? destinations.find(d => d._id === selectedDestinationId)
        : null;

    const getLocationString = (destination: DestinationTypes) => {
        const parts = [destination.city, destination.region, destination.country].filter(Boolean);
        return parts.join(', ') || 'N/A';
    };

    const columns: ColumnDef<DestinationTypes>[] = useMemo(
        () => [
            {
                accessorKey: "name",
                header: "Destination",
                cell: ({ row }) => {
                    const destination = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                                {destination.coverImage ? (
                                    <Image
                                        src={destination.coverImage}
                                        alt={destination.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-muted to-muted/80" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{destination.name}</p>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: "location",
                header: "Location",
                cell: ({ row }) => {
                    const destination = row.original;
                    return (
                        <p className="text-sm text-muted-foreground">
                            {getLocationString(destination)}
                        </p>
                    );
                },
            },
            {
                accessorKey: "description",
                header: "Description",
                cell: ({ row }) => {
                    const destination = row.original;
                    return (
                        <div className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                            <RichTextRenderer
                                content={destination.description || 'No description'}
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
                    const destination = row.original;
                    return (
                        <div className="flex flex-col gap-2">
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
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    {destination.isActive ? 'Active' : 'Inactive'}
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
                    const destination = row.original;
                    return (
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedDestinationId(destination._id);
                                    setEditDialogOpen(true);
                                }}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedDestinationId(destination._id);
                                    setDeleteDialogOpen(true);
                                }}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    );
                },
            },
        ],
        []
    );

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
                data={destinations || []}
                columns={columns}
                place="Search destinations..."
                colum="name"
            />

            {/* Edit Dialog */}
            {selectedDestinationId && (
                <EditDestinationDialog
                    destinationId={selectedDestinationId}
                    open={editDialogOpen}
                    onOpenChange={(open) => {
                        setEditDialogOpen(open);
                        if (!open) setSelectedDestinationId(null);
                    }}
                    onSuccess={() => {
                        setEditDialogOpen(false);
                        setSelectedDestinationId(null);
                        handleUpdate();
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Destination</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedDestination?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setSelectedDestinationId(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (selectedDestinationId) {
                                    deleteMutation.mutate(selectedDestinationId);
                                }
                            }}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default DestinationTableView;

