import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, MapPin, Plus, X } from "lucide-react";
import { DashboardCardHeader } from "@/components/dashboard/layout/CardHeader";
import { useDestinationsRoleBased, usePendingDestinations, useChangeRequests, useApproveChangeRequest, useRejectChangeRequest } from '@/lib/queries/useDestinations';
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCacheManager } from '@/lib/queries/cacheUtils';
import { approveDestination, rejectDestination } from '@/lib/api/destinations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddDestination from "./AddDestination";
import DestinationGridView from "./DestinationGridView";
import DestinationTableView from "./DestinationTableView";
import { DestinationTypes } from "@/types/types";
import { ViewToggle, ViewMode } from "../ViewToggle";
import { getViewPreference, setViewPreference } from "@/lib/utils/viewPreferences";
import { useAuth } from "@/lib/hooks/useAuth";
import { isAdminOrSeller } from "@/lib/utils/roles";
import Image from "next/image";
import { GoogleMapsProvider } from "@/providers/GoogleMapsProvider";
import RichTextRenderer from "@/components/RichTextRenderer";

const Destination = () => {
    const { invalidateDestinations } = useCacheManager();
    const [isAddingDestination, setIsAddingDestination] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedDestination, setSelectedDestination] = useState<DestinationTypes | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [view, setView] = useState<ViewMode>(() => getViewPreference('destinations'));

    const handleViewChange = (newView: ViewMode) => {
        setView(newView);
        setViewPreference('destinations', newView);
    };

    // Check user role for admin access
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const canAccessDestinations = isAdminOrSeller(userRole);

    // Fetch destinations based on user role (admin sees all, users see their personal destinations)
    const { data: destinations, isLoading, isError } = useDestinationsRoleBased();


    // Fetch pending destinations for admin users
    const { data: pendingDestinations, isError: pendingError } = usePendingDestinations();

    // Fetch change requests for admin users
    const { data: changeRequests } = useChangeRequests();

    // Mutations for approving and rejecting destinations
    const approveMutation = useMutation({
        mutationFn: (destinationId: string) => approveDestination(destinationId),
        onSuccess: () => {
            invalidateDestinations({ my: true, admin: true, pending: true, approved: true });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ destinationId, reason }: { destinationId: string; reason: string }) =>
            rejectDestination(destinationId, reason),
        onSuccess: () => {
            invalidateDestinations({ my: true, admin: true, pending: true, approved: true });
            setRejectDialogOpen(false);
            setRejectReason("");
            setSelectedDestination(null);
        },
    });

    // Change request mutations
    const approveChangeRequestMutation = useApproveChangeRequest();
    const rejectChangeRequestMutation = useRejectChangeRequest();

    const [changeRequestRejectDialogOpen, setChangeRequestRejectDialogOpen] = useState(false);
    const [selectedChangeRequest, setSelectedChangeRequest] = useState<{ _id?: string; id?: string } | null>(null);
    const [changeRequestRejectReason, setChangeRequestRejectReason] = useState("");


    // This function will be called when a destination is successfully added
    const handleDestinationAdded = () => {
        setIsAddingDestination(false);
        invalidateDestinations({ my: true, admin: true, pending: true, approved: true });
    };

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
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={MapPin}
                badge="Destinations"
                title="Tour Destinations"
                description="Manage destinations for your tours"
                actions={
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <ViewToggle view={view} onViewChange={handleViewChange} />
                        <Button
                            onClick={() => setIsAddingDestination(!isAddingDestination)}
                            className="gap-1.5"
                        >
                            {isAddingDestination ? (
                                <><X className="h-4 w-4" />Cancel</>
                            ) : (
                                <><Plus className="h-4 w-4" />Add Destination</>
                            )}
                        </Button>
                    </div>
                }
            />

            {isAddingDestination && (
                <>
                    <Separator className="my-4" />
                    <GoogleMapsProvider>
                        <AddDestination onDestinationAdded={handleDestinationAdded} />
                    </GoogleMapsProvider>
                </>
            )}

            <Separator className="my-4" />

            {/* Destinations list */}
            <div className="container mx-auto p-6 space-y-6">
                {isAdmin ? (
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
                                                <div className="lg:w-80 h-48 lg:h-auto min-h-[192px] relative overflow-hidden bg-muted">
                                                    {destination.coverImage ? (
                                                        <Image
                                                            src={destination.coverImage}
                                                            alt={destination.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="(max-width: 1024px) 100vw, 320px"
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
                                                            <div className="max-h-[200px] overflow-y-auto">
                                                                <RichTextRenderer
                                                                    content={destination.description || 'No description'}
                                                                    className="prose-sm"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Reason for Adding - always show */}
                                                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                                                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                                                Reason for Adding
                                                            </h4>
                                                            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                                                                {destination.reason && destination.reason.trim() ? destination.reason : 'No reason provided'}
                                                            </p>
                                                        </div>

                                                        {/* Footer */}
                                                        <div className="flex items-center justify-between pt-4 border-t border-border">
                                                            {/* Metadata */}
                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                                                                    Submitted: {destination.submittedAt ? new Date(destination.submittedAt).toLocaleDateString() : 'N/A'}
                                                                </span>
                                                                {destination.createdBy && (() => {
                                                                    const createdBy = destination.createdBy as { _id?: string; id?: string; name?: string; email?: string } | string;
                                                                    const creatorId = typeof createdBy === 'string' ? createdBy : (createdBy?._id ?? createdBy?.id ?? '');
                                                                    const creatorName = typeof createdBy === 'string' ? null : (createdBy?.name || createdBy?.email || null);
                                                                    const displayName = creatorName || (creatorId ? 'View user' : 'Unknown');
                                                                    return (
                                                                        <span>
                                                                            By: {creatorId ? (
                                                                                <Link href={`/dashboard/users/edit/${creatorId}`} className="text-primary hover:underline font-medium">
                                                                                    {displayName}
                                                                                </Link>
                                                                            ) : (
                                                                                displayName
                                                                            )}
                                                                        </span>
                                                                    );
                                                                })()}
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
                                                                    onClick={() => approveMutation.mutate(destination._id || '')}
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
                                                invalidateDestinations({ pending: true });
                                            }}
                                            className="mt-2"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Change Requests Section */}
                        {Array.isArray(changeRequests) && changeRequests.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 mb-6 mt-8">
                                    <AlertTriangle className="h-5 w-5 text-blue-500" />
                                    <h2 className="text-xl font-semibold">Pending Change Requests</h2>
                                    <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-300">
                                        {changeRequests.length} requests
                                    </Badge>
                                </div>

                                <div className="space-y-6 mb-8">
                                    {(changeRequests as Array<Record<string, unknown>>).map((request: Record<string, unknown>) => {
                                        const destination = request.destination as Record<string, unknown> | undefined;
                                        const requestedBy = request.requestedBy as Record<string, unknown> | undefined;
                                        const proposed = (request.proposed || {}) as Record<string, unknown>;

                                        if (!destination) return null;

                                        const destinationName = typeof destination.name === 'string' ? destination.name : 'Unknown';
                                        const destinationCoverImage = typeof destination.coverImage === 'string' ? destination.coverImage : undefined;

                                        return (
                                            <Card key={String(request._id || request.id)} className="overflow-hidden py-0 border-blue-200 hover:shadow-lg transition-all duration-200">
                                                <div className="flex flex-col lg:flex-row">
                                                    {/* Image Section */}
                                                    <div className="lg:w-80 h-48 lg:h-auto min-h-[192px] relative overflow-hidden bg-muted">
                                                        {destinationCoverImage ? (
                                                            <Image
                                                                src={destinationCoverImage}
                                                                alt={destinationName}
                                                                fill
                                                                className="object-cover"
                                                                sizes="(max-width: 1024px) 100vw, 320px"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                                                                <MapPin className="h-12 w-12 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <Badge className="absolute top-3 right-3 bg-blue-500 hover:bg-blue-600 text-white shadow-md">
                                                            Change Request
                                                        </Badge>
                                                    </div>

                                                    {/* Content Section */}
                                                    <div className="flex-1 p-6">
                                                        <div className="flex flex-col h-full">
                                                            {/* Header */}
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <MapPin className="h-5 w-5 text-blue-600" />
                                                                        <h3 className="font-bold text-xl text-foreground">{destinationName}</h3>
                                                                    </div>

                                                                    <div className="mb-3 text-sm text-muted-foreground">
                                                                        Requested by: {typeof requestedBy?.name === 'string' ? requestedBy.name : typeof requestedBy?.email === 'string' ? requestedBy.email : 'Unknown'} • {new Date((request.createdAt || request.created_at) as string | number).toLocaleDateString()}
                                                                    </div>

                                                                    {/* Reason for Change Request */}
                                                                    {typeof proposed.reason === 'string' && proposed.reason.trim() && (
                                                                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                                                                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                                                Reason for Change Request
                                                                            </h4>
                                                                            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                                                                {proposed.reason}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* Current vs Proposed Changes */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                                        {/* Current Values */}
                                                                        <div className="p-3 bg-muted/50 rounded-md">
                                                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Current</h4>
                                                                            <div className="space-y-2 text-sm">
                                                                                <p><span className="font-medium">Name:</span> {destinationName}</p>
                                                                                {typeof destination.country === 'string' && <p><span className="font-medium">Country:</span> {destination.country}</p>}
                                                                                {typeof destination.region === 'string' && <p><span className="font-medium">Region:</span> {destination.region}</p>}
                                                                                {typeof destination.city === 'string' && <p><span className="font-medium">City:</span> {destination.city}</p>}
                                                                                {typeof destination.description === 'string' && destination.description.trim() && (
                                                                                    <div>
                                                                                        <p className="font-medium mb-1">Description:</p>
                                                                                        <div className="text-xs text-muted-foreground max-h-[200px] overflow-y-auto">
                                                                                            <RichTextRenderer content={destination.description} />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Proposed Values */}
                                                                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                                                                            <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase mb-2">Proposed</h4>
                                                                            <div className="space-y-2 text-sm">
                                                                                {typeof proposed.name === 'string' && <p><span className="font-medium">Name:</span> <span className="text-blue-700 dark:text-blue-300">{proposed.name}</span></p>}
                                                                                {typeof proposed.country === 'string' && <p><span className="font-medium">Country:</span> <span className="text-blue-700 dark:text-blue-300">{proposed.country}</span></p>}
                                                                                {typeof proposed.region === 'string' && <p><span className="font-medium">Region:</span> <span className="text-blue-700 dark:text-blue-300">{proposed.region}</span></p>}
                                                                                {typeof proposed.city === 'string' && <p><span className="font-medium">City:</span> <span className="text-blue-700 dark:text-blue-300">{proposed.city}</span></p>}
                                                                                {typeof proposed.description === 'string' && proposed.description.trim() && (
                                                                                    <div>
                                                                                        <p className="font-medium mb-1 text-blue-700 dark:text-blue-300">Description:</p>
                                                                                        <div className="text-xs text-blue-800 dark:text-blue-200 max-h-[200px] overflow-y-auto">
                                                                                            <RichTextRenderer content={proposed.description} />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                                {!proposed.name && !proposed.country && !proposed.region && !proposed.city && !proposed.description && (
                                                                                    <p className="text-muted-foreground italic">No changes</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex gap-2 mt-auto">
                                                                <Button
                                                                    onClick={() => {
                                                                        const requestId = String(request._id || request.id || '');
                                                                        if (requestId) approveChangeRequestMutation.mutate(requestId);
                                                                    }}
                                                                    disabled={approveChangeRequestMutation.isPending}
                                                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                                                >
                                                                    <Check className="h-4 w-4 mr-2" />
                                                                    {approveChangeRequestMutation.isPending ? 'Approving...' : 'Approve Changes'}
                                                                </Button>
                                                                <Button
                                                                    onClick={() => {
                                                                        setSelectedChangeRequest({ _id: String(request._id || request.id || '') });
                                                                        setChangeRequestRejectDialogOpen(true);
                                                                    }}
                                                                    variant="destructive"
                                                                    className="flex-1"
                                                                >
                                                                    <X className="h-4 w-4 mr-2" />
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Approved Destinations Section */}
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
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
                                                invalidateDestinations({ my: true, admin: true });
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
                                                invalidateDestinations({ my: true });
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
                                            destinationId: selectedDestination._id || '',
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

            {/* Reject Change Request Dialog */}
            <Dialog open={changeRequestRejectDialogOpen} onOpenChange={setChangeRequestRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Change Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this change request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Rejection Reason</label>
                            <Textarea
                                placeholder="Explain why this change request is being rejected..."
                                value={changeRequestRejectReason}
                                onChange={(e) => setChangeRequestRejectReason(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setChangeRequestRejectDialogOpen(false);
                                    setChangeRequestRejectReason("");
                                    setSelectedChangeRequest(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (selectedChangeRequest && changeRequestRejectReason.trim()) {
                                        const requestId = String(selectedChangeRequest._id || selectedChangeRequest.id || '');
                                        if (requestId) {
                                            rejectChangeRequestMutation.mutate({
                                                changeRequestId: requestId,
                                                reason: changeRequestRejectReason.trim()
                                            });
                                            setChangeRequestRejectDialogOpen(false);
                                            setChangeRequestRejectReason("");
                                            setSelectedChangeRequest(null);
                                        }
                                    }
                                }}
                                disabled={!changeRequestRejectReason.trim() || rejectChangeRequestMutation.isPending}
                            >
                                Reject Change Request
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Destination;
