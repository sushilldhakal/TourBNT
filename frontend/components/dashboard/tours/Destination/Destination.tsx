import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, MapPin, Plus, X } from "lucide-react";
import { useDestinationsRoleBased, usePendingDestinations } from "./useDestination";
import { useState, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { approveDestination, rejectDestination } from "@/lib/api/destinations";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddDestination from "./AddDestination";
import DestinationGridView from "./DestinationGridView";
import DestinationTableView from "./DestinationTableView";
import { DestinationTypes } from "@/lib/types";
import { ViewToggle, ViewMode } from "../ViewToggle";
import { getViewPreference, setViewPreference } from "@/lib/utils/viewPreferences";
import { useAuth } from "@/lib/hooks/useAuth";
import { isAdminOrSeller } from "@/lib/utils/roles";
import Image from "next/image";

const Destination = () => {
    const queryClient = useQueryClient();
    const [isAddingDestination, setIsAddingDestination] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedDestination, setSelectedDestination] = useState<DestinationTypes | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [view, setView] = useState<ViewMode>(() => getViewPreference('destinations'));

    // Load view preference on mount and save when it changes
    // Remove the effect that synchronously sets state from a value already accessible at initialization
    // Save view preference when it changes
    const handleViewChange = (newView: ViewMode) => {
        setView(newView);
        setViewPreference('destinations', newView);
    };

    // Check user role for admin access
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const canAccessDestinations = isAdminOrSeller(userRole);
    const isAdminView = useMemo(() => {
        return userRole === 'admin';
    }, [userRole]);

    // Fetch destinations based on user role (admin sees all, users see their personal destinations)
    const { data: destinations, isLoading, isError } = useDestinationsRoleBased();

    // Fetch pending destinations for admin users
    const { data: pendingDestinations, isError: pendingError } = usePendingDestinations();

    // Mutations for approving and rejecting destinations
    const approveMutation = useMutation({
        mutationFn: (destinationId: string) => approveDestination(destinationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-destinations'] });
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
            queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ destinationId, reason }: { destinationId: string; reason: string }) =>
            rejectDestination(destinationId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-destinations'] });
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
            queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
            setRejectDialogOpen(false);
            setRejectReason("");
            setSelectedDestination(null);
        },
    });


    // This function will be called when a destination is successfully added
    const handleDestinationAdded = () => {
        setIsAddingDestination(false);
        // Invalidate the appropriate query based on user role
        if (isAdmin) {
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
        } else {
            queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
        }
        queryClient.invalidateQueries({ queryKey: ['pending-destinations'] });
    };

    // Remove the debug console.logs that reference .data and .count
    // destinations is already an array, not { data: [], count: number }
    console.log("destinations response:", destinations);
    console.log("isLoading:", isLoading);
    console.log("isError:", isError);
    console.log("isAdmin:", isAdmin);
    console.log("isAdminView:", isAdminView);

    // Check if user has access to destinations (admin or seller only)
    if (!canAccessDestinations) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col items-center justify-center text-center space-y-3 p-12">
                    <MapPin className="h-12 w-12 text-muted-foreground" />
                    <div className="space-y-1">
                        <p className="text-lg font-medium">Access Restricted</p>
                        <p className="text-sm text-muted-foreground">
                            You need admin or seller privileges to access destinations.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Tour Destinations</h1>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <ViewToggle view={view} onViewChange={handleViewChange} />

                    <Button
                        onClick={() => setIsAddingDestination(!isAddingDestination)}
                        className="gap-1.5"
                    >
                        {isAddingDestination ? (
                            <>
                                <X className="h-4 w-4" />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                Add Destination
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {isAddingDestination && (
                <>
                    <Separator className="my-4" />
                    <AddDestination onDestinationAdded={handleDestinationAdded} />
                </>
            )}

            <Separator className="my-4" />

            {/* Destinations list */}
            <div className="container mx-auto p-6 space-y-6">
                {isAdminView ? (
                    // Admin View: Show both pending and approved destinations
                    <>
                        {/* Pending Destinations Section */}
                        {pendingDestinations && pendingDestinations.length >= 1 && (
                            <>
                                <div className="flex items-center gap-2 mb-6">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                    <h2 className="text-xl font-semibold">Pending Destinations for Approval</h2>
                                    <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-300">
                                        {pendingDestinations?.length || 0} pending
                                    </Badge>
                                </div>

                                <div className="space-y-6 mb-8">
                                    {pendingDestinations.map((destination) => (
                                        <Card key={destination._id} className="overflow-hidden py-0 border-orange-200  from-orange-50 to-amber-50 hover:shadow-lg transition-all duration-200">
                                            <div className="flex flex-col lg:flex-row">
                                                {/* Image Section */}
                                                <div className="lg:w-80 h-48 lg:h-auto relative overflow-hidden bg-muted">
                                                    {destination.coverImage ? (
                                                        <Image
                                                            src={destination.coverImage}
                                                            alt={destination.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                                                            <MapPin className="h-12 w-12 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <Badge className="absolute top-3 right-3 bg-orange-500 hover:bg-orange-600 text-white shadow-md">
                                                        Pending
                                                    </Badge>
                                                </div>

                                                {/* Content Section */}
                                                <div className="flex-1 p-6">
                                                    <div className="flex flex-col h-full">
                                                        {/* Header */}
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <MapPin className="h-5 w-5 text-orange-600" />
                                                                    <h3 className="font-bold text-xl text-foreground">{destination.name}</h3>
                                                                </div>

                                                                {/* Location Details Grid */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                                                    {destination.country && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</span>
                                                                            <span className="text-sm font-medium text-foreground">{destination.country}</span>
                                                                        </div>
                                                                    )}
                                                                    {destination.region && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Region</span>
                                                                            <span className="text-sm font-medium text-foreground">{destination.region}</span>
                                                                        </div>
                                                                    )}
                                                                    {destination.city && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">City</span>
                                                                            <span className="text-sm font-medium text-foreground">{destination.city}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Description */}
                                                        <div className="flex-1 mb-4">
                                                            <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                                                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                                                {destination.description || 'No description provided'}
                                                            </p>
                                                        </div>

                                                        {/* Reason for Adding */}
                                                        {destination.reason && (
                                                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                                                                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                                                    Reason for Adding
                                                                </h4>
                                                                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                                                                    {destination.reason}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Footer */}
                                                        <div className="flex items-center justify-between pt-4 border-t border-border">
                                                            {/* Metadata */}
                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                                                                    Submitted: {destination.submittedAt ? new Date(destination.submittedAt).toLocaleDateString() : 'N/A'}
                                                                </span>
                                                                {destination.createdBy && (
                                                                    <span>
                                                                        By: {typeof destination.createdBy === 'string' ? destination.createdBy : destination.createdBy.name || 'Unknown'}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex gap-3">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive transition-colors"
                                                                    onClick={() => {
                                                                        setSelectedDestination(destination);
                                                                        setRejectDialogOpen(true);
                                                                    }}
                                                                    disabled={rejectMutation.isPending}
                                                                >
                                                                    <X className="h-4 w-4 mr-1" />
                                                                    Reject
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
                                                                    onClick={() => approveMutation.mutate(destination._id)}
                                                                    disabled={approveMutation.isPending}
                                                                >
                                                                    <Check className="h-4 w-4 mr-1" />
                                                                    Approve
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Error state for pending destinations */}
                        {pendingError && (
                            <Card className="col-span-full py-0 shadow-xs border-destructive/50 bg-destructive/5">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <X className="h-8 w-8 text-destructive" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium text-destructive">Failed to load pending destinations</p>
                                            <p className="text-sm text-muted-foreground">There was an error loading pending destinations.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                queryClient.invalidateQueries({
                                                    queryKey: ['pending-destinations']
                                                });
                                            }}
                                            className="mt-2"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Approved Destinations Section */}
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="h-5 w-5 text-green-500" />
                            <h2 className="text-xl font-semibold">All Destinations</h2>
                            <Badge variant="outline" className="ml-2">
                                {destinations?.length || 0} total
                            </Badge>
                        </div>

                        {isError ? (
                            // Error state
                            <Card className="py-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <X className="h-8 w-8 text-destructive" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium text-destructive">Failed to load destinations</p>
                                            <p className="text-sm text-muted-foreground">There was an error loading your destinations.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                queryClient.invalidateQueries({
                                                    queryKey: ['destinations']
                                                });
                                            }}
                                            className="mt-2"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : destinations && destinations.length > 0 ? (
                            view === 'list' ? (
                                <DestinationTableView
                                    destinations={destinations}
                                    isLoading={isLoading}
                                    onRefresh={handleDestinationAdded}
                                />
                            ) : (
                                <DestinationGridView
                                    destinations={destinations}
                                    isLoading={isLoading}
                                    onRefresh={handleDestinationAdded}
                                />
                            )
                        ) : (
                            // Empty state
                            <Card className="py-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <MapPin className="h-8 w-8 text-muted-foreground" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium">No destinations found</p>
                                            <p className="text-sm text-muted-foreground">Get started by adding your first destination.</p>
                                        </div>
                                        <Button
                                            onClick={() => setIsAddingDestination(true)}
                                            className="mt-2"
                                        >
                                            Add Destination
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : (
                    // Seller View: Regular Destinations
                    <>
                        {isError ? (
                            // Error state
                            <Card className="py-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <X className="h-8 w-8 text-destructive" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium text-destructive">Failed to load destinations</p>
                                            <p className="text-sm text-muted-foreground">There was an error loading destinations.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                queryClient.invalidateQueries({
                                                    queryKey: ['seller-destinations']
                                                });
                                            }}
                                            className="mt-2"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : destinations && destinations.length > 0 ? (
                            view === 'list' ? (
                                <DestinationTableView
                                    destinations={destinations}
                                    isLoading={isLoading}
                                    onRefresh={handleDestinationAdded}
                                />
                            ) : (
                                <DestinationGridView
                                    destinations={destinations}
                                    isLoading={isLoading}
                                    onRefresh={handleDestinationAdded}
                                />
                            )
                        ) : (
                            // Empty state
                            <Card className="py-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <MapPin className="h-8 w-8 text-muted-foreground" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium">No destinations found</p>
                                            <p className="text-sm text-muted-foreground">
                                                No destinations have been created yet.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setIsAddingDestination(true)}
                                            className="mt-2"
                                        >
                                            Add Destination
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Destination</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this destination. This will help the seller understand what needs to be improved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Rejection Reason</label>
                            <Textarea
                                placeholder="Explain why this destination is being rejected..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setRejectDialogOpen(false);
                                    setRejectReason("");
                                    setSelectedDestination(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (selectedDestination && rejectReason.trim()) {
                                        rejectMutation.mutate({
                                            destinationId: selectedDestination._id,
                                            reason: rejectReason.trim()
                                        });
                                    }
                                }}
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                            >
                                Reject Destination
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Destination;
