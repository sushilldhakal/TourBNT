"use client";

import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, X as XIcon, Edit, Trash2, Power, Star } from "lucide-react";
import { DestinationTypes, type DestinationTableViewProps } from "@/types/types";
import { EditDestinationDialog } from "./EditDestinationDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCacheManager } from '@/lib/queries/cacheUtils';
import { useAuth } from "@/lib/hooks/useAuth";
import { deleteDestination, removeExistingDestinationFromSeller, getDestinationUsage } from '@/lib/api/destinations';
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import RichTextRenderer from "@/components/RichTextRenderer";
import { useToggleDestinationActive } from '@/lib/queries/useDestinations';
import { UsageWarning } from '../UsageWarning';

// Component for toggle active button
const ToggleActiveButton = ({
    destinationId,
    isActive,
    onSuccess
}: {
    destinationId: string;
    isActive: boolean;
    onSuccess: () => void;
}) => {
    const toggleMutation = useToggleDestinationActive();

    const handleToggle = () => {
        toggleMutation.mutate(destinationId);
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
            title={isActive ? 'Deactivate destination' : 'Activate destination'}
            aria-label={isActive ? 'Deactivate destination' : 'Activate destination'}
        >
            <Power className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} aria-hidden="true" />
        </Button>
    );
};

const DestinationTableView = ({ destinations, isLoading, onRefresh }: DestinationTableViewProps) => {
    const { invalidateDestinations } = useCacheManager();
    const { userRole } = useAuth();
    const isAdminView = userRole === 'admin';
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);

    const handleUpdate = () => {
        invalidateDestinations({ my: true, admin: true, pending: true });
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
            invalidateDestinations({ my: true, admin: true, pending: true });
            onRefresh?.();
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to remove",
                description: `There was an error removing the destination: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const selectedDestination = selectedDestinationId
        ? destinations.find(d => d._id === selectedDestinationId || (d as any).destinationId === selectedDestinationId || d.id === selectedDestinationId)
        : null;

    const { data: usage, isLoading: usageLoading } = useQuery({
        queryKey: ['destination-usage', selectedDestinationId],
        queryFn: () => getDestinationUsage(selectedDestinationId!),
        enabled: deleteDialogOpen && isAdminView && !!selectedDestinationId,
    });

    const getLocationString = (destination: DestinationTypes) => {
        const parts = [destination.city, destination.region, destination.country].filter(Boolean);
        return parts.join(', ') || 'N/A';
    };

    const columns: ColumnDef<DestinationTypes>[] = [
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
                                    alt={`${destination.name} destination cover`}
                                    fill
                                    className="object-cover rounded"
                                    sizes="48px"
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
                const featuredCount = Array.isArray(destination.featuredTours) ? destination.featuredTours.length : 0;
                return (
                    <div className="flex flex-col gap-2">
                        {destination.approvalStatus && (
                            <Badge
                                variant="outline"
                                className={`status-pill ${destination.approvalStatus === 'approved'
                                    ? 'status-pill--approved'
                                    : destination.approvalStatus === 'pending'
                                        ? 'status-pill--pending'
                                        : 'status-pill--rejected'
                                    }`}
                            >
                                {destination.approvalStatus === 'approved' ? (
                                    <>
                                        <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                                        Approved
                                    </>
                                ) : destination.approvalStatus === 'pending' ? (
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
                        {destination.approvalStatus === 'rejected' && 'rejectionReason' in destination && destination.rejectionReason && (
                            <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-md">
                                <p className="text-xs font-semibold text-rose-900 dark:text-rose-100 mb-1">
                                    Rejection Reason:
                                </p>
                                <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                                    {destination.rejectionReason}
                                </p>
                            </div>
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
                // Use _id for edit/delete operations (UserDestination ID)
                const userDestinationId = destination._id || destination.id;
                // Use destinationId for toggle-active API (GlobalDestination ID)
                const globalDestinationId = (destination as any).destinationId || destination._id || destination.id;

                if (!userDestinationId) return null;
                if (!globalDestinationId) return null;

                return (
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedDestinationId(globalDestinationId);
                                setEditDialogOpen(true);
                            }}
                            title="Edit destination"
                            aria-label="Edit destination"
                        >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <ToggleActiveButton
                            destinationId={globalDestinationId}
                            isActive={destination.isActive}
                            onSuccess={handleUpdate}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                // Use globalDestinationId for removal (API expects GlobalDestination ID)
                                setSelectedDestinationId(globalDestinationId);
                                setDeleteDialogOpen(true);
                            }}
                            title="Delete destination"
                            aria-label="Delete destination"
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
                data={destinations || []}
                columns={columns}
                place="Search destinations..."
                column="name"
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
                            Are you sure you want to delete &quot;{selectedDestination?.name}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {isAdminView && <UsageWarning usage={usage} isLoading={usageLoading} entityLabel="destination" />}
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

