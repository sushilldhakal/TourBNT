'use client';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Edit, Trash2, Power, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DestinationTypes, TourTitle, type DestinationGridViewProps } from "@/types/types";
import { useCacheManager, useTourTitlesByIds } from '@/lib/queries';
import { useAuth } from "@/lib/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { EditDestinationDialog } from "./EditDestinationDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteDestination, removeExistingDestinationFromSeller, getDestinationUsage } from '@/lib/api/destinations';
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import RichTextRenderer from "@/components/RichTextRenderer";
import { useToggleDestinationActive } from '@/lib/queries/useDestinations';
import Link from "next/link";
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
            aria-label={`${isActive ? 'Deactivate' : 'Activate'} destination`}
        >
            <Power className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {toggleMutation.isPending ? 'Updating...' : (isActive ? 'Deactivate' : 'Activate')}
        </Button>
    );
};

const DestinationGridView = ({ destinations, isLoading, onRefresh }: DestinationGridViewProps) => {
    const { invalidateDestinations } = useCacheManager();
    const { userRole } = useAuth();
    const isAdminView = userRole === 'admin';
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);

    const featuredTourIds = useMemo(() => {
        const ids = (destinations || []).flatMap((d) => (Array.isArray(d.featuredTours) ? d.featuredTours : []));
        return Array.from(new Set(ids.filter(Boolean).map((id) => String(id)))).sort();
    }, [destinations]);

    const { data: featuredTourTitlesRaw } = useTourTitlesByIds(featuredTourIds, featuredTourIds.length > 0);

    const featuredTitleMap = useMemo(() => {
        const list = Array.isArray(featuredTourTitlesRaw)
            ? featuredTourTitlesRaw
            : (featuredTourTitlesRaw as unknown as { data?: unknown[] })?.data ?? [];
        const m = new Map<string, string>();
        for (const t of list) {
            const id = (t as { _id?: string; id?: string })?._id ?? (t as { id?: string })?.id;
            const title = (t as { title?: string })?.title;
            if (id && title) m.set(String(id), title);
        }
        return m;
    }, [featuredTourTitlesRaw]);

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
            handleUpdate();
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
        ? destinations.find(d => d._id === selectedDestinationId || (d as any).destinationId === selectedDestinationId)
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

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="overflow-hidden py-0">
                        <Skeleton className="h-48 w-full" />
                        <CardContent className="p-4 space-y-3">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!destinations || destinations.length === 0) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                        <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-lg font-semibold">No destinations found</p>
                        <p className="text-sm text-muted-foreground">
                            Get started by adding your first destination.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {destinations.map((destination) => {
                    // Use _id for the card key and edit/delete operations (UserDestination ID)
                    const userDestinationId = destination._id;
                    // Use destinationId for toggle-active API (GlobalDestination ID)
                    const globalDestinationId = (destination as any).destinationId || destination._id;

                    if (!userDestinationId) {
                        console.warn('[DestinationGridView] Destination missing _id:', destination);
                        return null;
                    }

                    if (!globalDestinationId) {
                        console.warn('[DestinationGridView] Destination missing destinationId (GlobalDestination ID):', destination);
                        return null;
                    }

                    return (
                        <Card
                            key={userDestinationId}
                            className="group overflow-hidden flex flex-col h-full border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            {/* Image Section */}
                            <div className="relative h-48 w-full overflow-hidden bg-muted flex-shrink-0">
                                {destination.coverImage ? (
                                    <Image
                                        src={destination.coverImage}
                                        alt={`${destination.name} destination cover`}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                                        <MapPin className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                                    </div>
                                )}
                                {/* Status Badge */}
                                <div className="absolute top-2 right-2">
                                    <Badge
                                        variant="outline"
                                        className={`status-pill shadow-sm ${destination.approvalStatus === 'approved'
                                            ? 'status-pill--approved'
                                            : destination.approvalStatus === 'pending'
                                                ? 'status-pill--pending'
                                                : 'status-pill--rejected'
                                            }`}
                                    >
                                        {destination.approvalStatus === 'approved' ? 'Approved' :
                                            destination.approvalStatus === 'pending' ? 'Pending' : 'Rejected'}
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                                {/* Title */}
                                <div>
                                    <h3 className="font-semibold text-lg truncate" title={destination.name}>{destination.name}</h3>
                                    <p className="text-sm text-muted-foreground">{getLocationString(destination)}</p>
                                </div>

                                {Array.isArray(destination.featuredTours) && destination.featuredTours.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="status-pill status-pill--featured">
                                            <Star className="h-3 w-3" aria-hidden="true" />
                                            Featured ({destination.featuredTours.length})
                                        </Badge>
                                        {destination.featuredTours
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

                                {/* Description Preview */}
                                <div className="text-sm text-muted-foreground max-h-[150px] overflow-y-auto flex-1">
                                    <RichTextRenderer
                                        content={destination.description || 'No description'}
                                        className="prose-sm"
                                    />
                                </div>

                                {/* Rejection Reason - show if rejected */}
                                {destination.approvalStatus === 'rejected' && 'rejectionReason' in destination && destination.rejectionReason && (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
                                        <div className="flex items-start gap-2">
                                            <X className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                                                    Rejection Reason
                                                </p>
                                                <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                                                    {destination.rejectionReason}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Status */}
                                <div className="flex items-center justify-between">
                                    <Badge variant={destination.isActive ? "default" : "secondary"}>
                                        {destination.isActive ? 'Active' : 'Inactive'}
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
                                            setSelectedDestinationId(globalDestinationId);
                                            setEditDialogOpen(true);
                                        }}
                                        aria-label={`Edit ${destination.name} destination`}
                                    >
                                        <Edit className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-destructive border-destructive/30 bg-background/60 hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => {
                                            // Use globalDestinationId for removal (API expects GlobalDestination ID)
                                            setSelectedDestinationId(globalDestinationId);
                                            setDeleteDialogOpen(true);
                                        }}
                                        aria-label={`Delete ${destination.name} destination`}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                        Delete
                                    </Button>
                                </div>
                                <ToggleActiveButton
                                    destinationId={globalDestinationId}
                                    isActive={destination.isActive}
                                    onSuccess={handleUpdate}
                                />
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

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

export default DestinationGridView;
