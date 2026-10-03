'use client';
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, Folder, Plus, X } from "lucide-react";
import { DashboardCardHeader } from "@/components/dashboard/layout/CardHeader";
import { useCategoriesRoleBased, usePendingCategories, useChangeRequests, useApproveChangeRequest, useRejectChangeRequest } from '@/lib/queries/useCategories';
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCacheManager } from '@/lib/queries/cacheUtils';
import { approveCategory, rejectCategory } from '@/lib/api/categories';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddCategory from "./AddCategory";
import CategoryGridView from "./CategoryGridView";
import CategoryTableView from "./CategoryTableView";
import { CategoryData } from "@/types/types";
import { ViewToggle, ViewMode } from "../ViewToggle";
import { getViewPreference, setViewPreference } from "@/lib/utils/viewPreferences";
import { useAuth } from "@/lib/hooks/useAuth";
import { isAdminOrSeller } from "@/lib/utils/roles";
import Image from "next/image";
import RichTextRenderer from "@/components/RichTextRenderer";

const TourCategory = () => {
    const { invalidateCategories } = useCacheManager();
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [view, setView] = useState<ViewMode>(() => getViewPreference('categories'));

    // Save view preference when it changes
    const handleViewChange = (newView: ViewMode) => {
        setView(newView);
        setViewPreference('categories', newView);
    };

    // Check user role for admin access
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const canAccessCategories = isAdminOrSeller(userRole);
    const isAdminView = userRole === 'admin';

    // Fetch categories based on user role (admin sees all, users see their personal categories)
    const { data: categories, isLoading, isError } = useCategoriesRoleBased();

    // Fetch pending categories for admin users
    const { data: pendingCategories, isError: pendingError } = usePendingCategories();

    // Fetch change requests for admin users
    const { data: changeRequests } = useChangeRequests();

    // Mutations for approving and rejecting categories
    const approveMutation = useMutation({
        mutationFn: (categoryId: string) => approveCategory(categoryId),
        onSuccess: () => {
            invalidateCategories({ my: true, admin: true, pending: true, approved: true });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ categoryId, reason }: { categoryId: string; reason: string }) =>
            rejectCategory(categoryId, reason),
        onSuccess: () => {
            invalidateCategories({ my: true, admin: true, pending: true, approved: true });
            setRejectDialogOpen(false);
            setRejectReason("");
            setSelectedCategory(null);
        },
    });

    // Change request mutations
    const approveChangeRequestMutation = useApproveChangeRequest();
    const rejectChangeRequestMutation = useRejectChangeRequest();

    const [changeRequestRejectDialogOpen, setChangeRequestRejectDialogOpen] = useState(false);
    const [selectedChangeRequest, setSelectedChangeRequest] = useState<{ _id?: string; id?: string } | null>(null);
    const [changeRequestRejectReason, setChangeRequestRejectReason] = useState("");

    // This function will be called when a category is successfully added
    const handleCategoryAdded = () => {
        setIsAddingCategory(false);
        invalidateCategories({ my: true, admin: true, pending: true, approved: true });
    };

    // Check if user has access to categories (admin or seller only)
    if (!canAccessCategories) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col items-center justify-center text-center space-y-3 p-12">
                    <Folder className="h-12 w-12 text-muted-foreground" />
                    <div className="space-y-1">
                        <p className="text-lg font-medium">Access Restricted</p>
                        <p className="text-sm text-muted-foreground">
                            You need admin or seller privileges to access categories.
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
                icon={Folder}
                badge="Catalog"
                title="Tour Categories"
                description="Shape how tours are grouped, discovered, and managed."
                actions={
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <ViewToggle view={view} onViewChange={handleViewChange} />
                        <Button
                            onClick={() => setIsAddingCategory(!isAddingCategory)}
                            className="gap-1.5"
                        >
                            {isAddingCategory ? (
                                <><X className="h-4 w-4" />Cancel</>
                            ) : (
                                <><Plus className="h-4 w-4" />Add Category</>
                            )}
                        </Button>
                    </div>
                }
            />

            {isAddingCategory && (
                <>
                    <Separator className="my-4" />
                    <AddCategory onCategoryAdded={handleCategoryAdded} />
                </>
            )}

            <Separator className="my-4" />

            {/* Categories list */}
            <div className="container mx-auto p-6 space-y-6">
                {isAdmin ? (
                    // Admin View: Show both pending and approved categories
                    <>
                        {/* Pending Categories Section */}
                        {pendingCategories && pendingCategories.length >= 1 && (
                            <>
                                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-200 ring-1 ring-amber-500/20">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="section-kicker">Needs review</p>
                                            <h2 className="text-2xl font-semibold tracking-tight">Pending Categories</h2>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="status-pill status-pill--pending">
                                        {pendingCategories?.length || 0} pending
                                    </Badge>
                                </div>

                                <div className="space-y-6 mb-8">
                                    {pendingCategories.map((category) => (
                                        <Card key={category._id} className="overflow-hidden py-0 border-amber-500/20 bg-card/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                                            <div className="flex flex-col lg:flex-row">
                                                {/* Image Section */}
                                                <div className="lg:w-80 h-48 lg:h-auto min-h-[192px] relative overflow-hidden bg-muted">
                                                    {category.imageUrl ? (
                                                        <Image
                                                            src={category.imageUrl}
                                                            alt={category.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="(max-width: 1024px) 100vw, 320px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                                                            <Folder className="h-12 w-12 text-muted-foreground" />
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
                                                                    <Folder className="h-5 w-5 text-orange-600" />
                                                                    <h3 className="font-bold text-xl text-foreground">{category.name}</h3>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Description */}
                                                        <div className="flex-1 mb-4">
                                                            <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                                                            <div className="max-h-[200px] overflow-y-auto">
                                                                <RichTextRenderer
                                                                    content={category.description || 'No description'}
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
                                                                {(category as any).reason && (category as any).reason.trim() ? (category as any).reason : 'No reason provided'}
                                                            </p>
                                                        </div>

                                                        {/* Footer */}
                                                        <div className="flex items-center justify-between pt-4 border-t border-border">
                                                            {/* Metadata */}
                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                                                                    Submitted: {(category as any).submittedAt ? new Date((category as any).submittedAt).toLocaleDateString() : 'N/A'}
                                                                </span>
                                                                {category.createdBy && (() => {
                                                                    const createdBy = category.createdBy as { _id?: string; id?: string; name?: string; email?: string } | string;
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
                                                                        setSelectedCategory(category);
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
                                                                    onClick={() => approveMutation.mutate(category._id || '')}
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

                        {/* Error state for pending categories */}
                        {pendingError && (
                            <Card className="col-span-full py-0 shadow-xs border-destructive/50 bg-destructive/5">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <X className="h-8 w-8 text-destructive" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium text-destructive">Failed to load pending categories</p>
                                            <p className="text-sm text-muted-foreground">There was an error loading pending categories.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                invalidateCategories({ pending: true });
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
                                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 mt-10">
                                    <div className="flex items-start gap-3">
                                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="section-kicker">Proposed updates</p>
                                            <h2 className="text-2xl font-semibold tracking-tight">Pending Change Requests</h2>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="status-pill status-pill--info">
                                        {changeRequests.length} requests
                                    </Badge>
                                </div>

                                <div className="space-y-6 mb-8">
                                    {(changeRequests as Array<Record<string, unknown>>).map((request: Record<string, unknown>) => {
                                        const category = request.category as Record<string, unknown> | undefined;
                                        const requestedBy = request.requestedBy as Record<string, unknown> | undefined;
                                        const proposed = (request.proposed || {}) as Record<string, unknown>;

                                        if (!category) return null;

                                        const categoryName = typeof category.name === 'string' ? category.name : 'Unknown';
                                        const categoryImageUrl = typeof category.imageUrl === 'string' ? category.imageUrl : undefined;

                                        return (
                                            <Card key={String(request._id || request.id)} className="overflow-hidden py-0 border-primary/20 bg-card/70 shadow-sm hover:shadow-lg transition-all duration-200">
                                                <div className="flex flex-col lg:flex-row">
                                                    {/* Image Section */}
                                                    <div className="lg:w-80 h-48 lg:h-auto min-h-[192px] relative overflow-hidden bg-muted">
                                                        {categoryImageUrl ? (
                                                            <Image
                                                                src={categoryImageUrl}
                                                                alt={categoryName}
                                                                fill
                                                                className="object-cover"
                                                                sizes="(max-width: 1024px) 100vw, 320px"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                                                                <Folder className="h-12 w-12 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <Badge className="absolute top-3 right-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
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
                                                                        <Folder className="h-5 w-5 text-primary" />
                                                                        <h3 className="font-bold text-xl text-foreground">{categoryName}</h3>
                                                                    </div>

                                                                    <div className="mb-3 text-sm text-muted-foreground">
                                                                        Requested by: {typeof requestedBy?.name === 'string' ? requestedBy.name : typeof requestedBy?.email === 'string' ? requestedBy.email : 'Unknown'} • {new Date((request.createdAt || request.created_at) as string | number).toLocaleDateString()}
                                                                    </div>

                                                                    {/* Reason for Change Request */}
                                                                    {typeof proposed.reason === 'string' && proposed.reason.trim() && (
                                                                        <div className="mb-4 p-3 bg-primary/5 border border-primary/15 rounded-md">
                                                                            <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                                                                                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                                                                                Reason for Change Request
                                                                            </h4>
                                                                            <p className="text-sm text-foreground/80 leading-relaxed">
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
                                                                                <p><span className="font-medium">Name:</span> {categoryName}</p>
                                                                                {typeof category.description === 'string' && category.description.trim() && (
                                                                                    <div>
                                                                                        <p className="font-medium mb-1">Description:</p>
                                                                                        <div className="text-xs text-muted-foreground max-h-[200px] overflow-y-auto">
                                                                                            <RichTextRenderer content={category.description} />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Proposed Values */}
                                                                        <div className="p-3 bg-primary/5 rounded-md border border-primary/15">
                                                                            <h4 className="text-xs font-semibold text-primary uppercase mb-2">Proposed</h4>
                                                                            <div className="space-y-2 text-sm">
                                                                                {typeof proposed.name === 'string' && <p><span className="font-medium">Name:</span> <span className="text-primary">{proposed.name}</span></p>}
                                                                                {typeof proposed.description === 'string' && proposed.description.trim() && (
                                                                                    <div>
                                                                                        <p className="font-medium mb-1 text-primary">Description:</p>
                                                                                        <div className="text-xs text-foreground/80 max-h-[200px] overflow-y-auto">
                                                                                            <RichTextRenderer content={proposed.description} />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                                {!proposed.name && !proposed.description && (
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

                        {/* Approved Categories Section */}
                        <div className="flex items-center gap-2 mb-4">
                            <Folder className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-xl font-semibold">All Categories</h2>
                            <Badge variant="outline" className="ml-2">
                                {categories?.length || 0} total
                            </Badge>
                        </div>

                        {isError ? (
                            // Error state
                            <Card className="py-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <X className="h-8 w-8 text-destructive" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium text-destructive">Failed to load categories</p>
                                            <p className="text-sm text-muted-foreground">There was an error loading your categories.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                invalidateCategories({ my: true, admin: true, pending: true, approved: true });
                                            }}
                                            className="mt-2"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : categories && categories.length > 0 ? (
                            view === 'list' ? (
                                <CategoryTableView
                                    categories={categories}
                                    isLoading={isLoading}
                                    onRefresh={handleCategoryAdded}
                                />
                            ) : (
                                <CategoryGridView
                                    categories={categories}
                                    isLoading={isLoading}
                                    onRefresh={handleCategoryAdded}
                                />
                            )
                        ) : (
                            // Empty state
                            <Card className="py-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <Folder className="h-8 w-8 text-muted-foreground" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium">No categories found</p>
                                            <p className="text-sm text-muted-foreground">Get started by adding your first category.</p>
                                        </div>
                                        <Button
                                            onClick={() => setIsAddingCategory(true)}
                                            className="mt-2"
                                        >
                                            Add Category
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : (
                    // Seller View: Regular Categories
                    <>
                        {isError ? (
                            // Error state
                            <Card className="py-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <X className="h-8 w-8 text-destructive" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium text-destructive">Failed to load categories</p>
                                            <p className="text-sm text-muted-foreground">There was an error loading categories.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                invalidateCategories({ my: true });
                                            }}
                                            className="mt-2"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : categories && categories.length > 0 ? (
                            view === 'list' ? (
                                <CategoryTableView
                                    categories={categories}
                                    isLoading={isLoading}
                                    onRefresh={handleCategoryAdded}
                                />
                            ) : (
                                <CategoryGridView
                                    categories={categories}
                                    isLoading={isLoading}
                                    onRefresh={handleCategoryAdded}
                                />
                            )
                        ) : (
                            // Empty state
                            <Card className="py-0">
                                <CardContent className="p-6">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <Folder className="h-8 w-8 text-muted-foreground" />
                                        <div className="space-y-1">
                                            <p className="text-lg font-medium">No categories found</p>
                                            <p className="text-sm text-muted-foreground">
                                                No categories have been created yet.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setIsAddingCategory(true)}
                                            className="mt-2"
                                        >
                                            Add Category
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
                        <DialogTitle>Reject Category</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this category. This will help the seller understand what needs to be improved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Rejection Reason</label>
                            <Textarea
                                placeholder="Explain why this category is being rejected..."
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
                                    setSelectedCategory(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (selectedCategory && rejectReason.trim()) {
                                        rejectMutation.mutate({
                                            categoryId: selectedCategory._id || '',
                                            reason: rejectReason.trim()
                                        });
                                    }
                                }}
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                            >
                                Reject Category
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

export default TourCategory;
