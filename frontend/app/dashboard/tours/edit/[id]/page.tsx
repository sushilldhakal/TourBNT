'use client';

import React from 'react';
import { FormProvider } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { TourProvider, useTourContext } from '@/providers/TourProvider';
import { TourEditorLayout } from '@/components/dashboard/tours/TourEditorLayout';
import {
    TourBasicInfo,
    TourPricingDates,
    TourItinerary,
    TourInclusionsExclusions,
    TourFacts,
    TourGallery,
    TourFAQs,
} from '@/components/dashboard/tours';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { deleteTour } from '@/lib/api/tours';
import { toast } from '@/components/ui/use-toast';

/**
 * Edit Tour Page
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * Features:
 * - Page header with back navigation and delete action (Req 10.1, 11.2)
 * - Fetch and populate existing tour data (Req 11.1)
 * - Tab-based form navigation with URL hash support (Req 10.1, 10.2)
 * - Form validation with clear error messages (Req 10.1, 10.2, 11.3)
 * - Update submission with FormData processing (Req 10.3, 10.4)
 * - Delete functionality with confirmation dialog (Req 10.1)
 * - Loading states during operations (Req 11.1, 11.2)
 * - Error handling with user-friendly messages (Req 11.3)
 * - Success notifications (Req 11.4)
 * - Responsive design (Req 12.1, 12.2, 12.3)
 */

/**
 * Loading Skeleton Component
 * Requirement 11.1: Display loading skeleton while fetching tour data
 * 
 * Provides visual feedback during data loading with skeleton placeholders
 * that match the layout of the actual content.
 */
function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48 sm:w-64" />
                        <Skeleton className="h-4 w-64 sm:w-96" />
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Skeleton className="h-10 flex-1 sm:flex-none sm:w-24" />
                    <Skeleton className="h-10 flex-1 sm:flex-none sm:w-32" />
                </div>
            </div>

            {/* Content Skeleton - Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                {/* Sidebar Skeleton */}
                <Card>
                    <CardContent className="p-4 space-y-2">
                        {[...Array(7)].map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </CardContent>
                </Card>
                {/* Main Content Skeleton */}
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * Tour Form Component
 * Main form component that handles tour editing logic
 */
function TourForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { form, onSubmit, isLoading, isSaving, tourId } = useTourContext();
    const { handleSubmit, formState: { errors } } = form;
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

    /**
     * Delete Mutation
     * Requirement 10.1: Implement delete functionality
     * Requirement 11.2: Show loading indicator during deletion
     * Requirement 11.3: Display error messages on failure
     * Requirement 11.4: Show success notification on completion
     */
    const deleteMutation = useMutation({
        mutationFn: () => deleteTour(tourId!),
        onSuccess: () => {
            // Requirement 11.4: Show success notification
            toast({
                title: 'Success!',
                description: 'Tour deleted successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['tours'] });
            router.push('/dashboard/tours');
        },
        onError: (error: any) => {
            // Requirement 11.3: Display user-friendly error messages
            toast({
                variant: 'destructive',
                title: 'Error deleting tour',
                description: error.message || 'Failed to delete tour. Please try again.',
            });
        },
    });

    /**
     * Handle Save
     * Requirements: 10.3, 10.4, 11.2, 11.3, 11.4
     * - Validates all required fields (10.1)
     * - Sends form data to API (10.3, 10.4)
     * - Shows loading indicator (11.2)
     * - Handles errors gracefully (11.3)
     * - Shows success message on completion (11.4)
     */
    const handleSave = async () => {
        setSubmitError(null);
        try {
            await handleSubmit(onSubmit)();
        } catch (error: any) {
            // Requirement 11.3: Display user-friendly error messages
            setSubmitError(error.message || 'Failed to update tour. Please try again.');
        }
    };

    /**
     * Handle Delete
     * Requirement 10.1: Delete functionality with confirmation
     */
    const handleDelete = () => {
        deleteMutation.mutate();
        setShowDeleteDialog(false);
    };

    /**
     * Requirement 11.1: Display loading skeleton while fetching tour data
     */
    if (isLoading) {
        return <LoadingSkeleton />;
    }

    /**
     * Requirement 10.2: Track validation errors
     */
    const hasErrors = Object.keys(errors).length > 0;

    return (
        <div className="space-y-6">
            {/* Page Header - Requirements: 10.1, 11.2, 12.1, 12.2, 12.3 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Requirement 10.1: Back navigation */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard/tours')}
                        disabled={isSaving || deleteMutation.isPending}
                        aria-label="Back to tours"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edit Tour</h1>
                        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                            Update tour details and settings
                        </p>
                    </div>
                </div>
                {/* Action Buttons - Requirements: 10.1, 11.2 */}
                <div className="flex gap-2 w-full sm:w-auto">
                    {/* Delete Dialog - Requirement 10.1: Delete functionality with confirmation */}
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogTrigger asChild>
                            <Button
                                variant="destructive"
                                disabled={isSaving || deleteMutation.isPending}
                                className="flex-1 sm:flex-none"
                                aria-label="Delete tour"
                            >
                                {/* Requirement 11.2: Show loading indicator during deletion */}
                                {deleteMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Delete Tour
                                </DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete this tour? This action cannot be undone.
                                    All tour data, including bookings and reviews, will be permanently removed.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteDialog(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete Tour'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    {/* Update Button - Requirement 11.2: Disable button and show loading indicator */}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || deleteMutation.isPending}
                        size="lg"
                        className="flex-1 sm:flex-none"
                        aria-label={isSaving ? 'Updating tour...' : 'Update tour'}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Update Tour
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Requirement 11.3: Display error messages when submission fails */}
            {submitError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            )}

            {/* Requirement 10.2: Display validation errors */}
            {hasErrors && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                        Please fix the errors in the form before submitting.
                    </AlertDescription>
                </Alert>
            )}

            {/* Form with Tab Navigation - Requirements: 10.1, 10.2, 10.3, 10.4 */}
            <FormProvider {...form}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* 
                        TourEditorLayout provides:
                        - Tab-based navigation (Req 10.1)
                        - URL hash support for deep linking (Req 10.1)
                        - Responsive design (Req 12.1, 12.2, 12.3)
                        - Save button in sidebar (Req 11.2)
                    */}
                    <TourEditorLayout onSave={handleSave} saveLabel="Update Tour">
                        {/* Requirement 10.1: Tab content sections */}
                        <TabsContent value="overview" className="mt-0">
                            <TourBasicInfo />
                        </TabsContent>
                        <TabsContent value="pricing" className="mt-0">
                            <TourPricingDates />
                        </TabsContent>
                        <TabsContent value="itinerary" className="mt-0">
                            <TourItinerary />
                        </TabsContent>
                        <TabsContent value="inc-exc" className="mt-0">
                            <TourInclusionsExclusions />
                        </TabsContent>
                        <TabsContent value="facts" className="mt-0">
                            <TourFacts />
                        </TabsContent>
                        <TabsContent value="gallery" className="mt-0">
                            <TourGallery />
                        </TabsContent>
                        <TabsContent value="faqs" className="mt-0">
                            <TourFAQs />
                        </TabsContent>
                    </TourEditorLayout>
                </form>
            </FormProvider>
        </div>
    );
}

/**
 * Edit Tour Page Component
 * Wraps the form in TourProvider with isEditing=true
 * 
 * Requirements: 10.1, 10.3, 11.1
 * - Fetches existing tour data (11.1)
 * - Populates form with tour data (10.1)
 * - Enables update mode (10.3, 10.4)
 */
export default function EditTourPage() {
    return (
        <TourProvider isEditing={true}>
            <TourForm />
        </TourProvider>
    );
}
