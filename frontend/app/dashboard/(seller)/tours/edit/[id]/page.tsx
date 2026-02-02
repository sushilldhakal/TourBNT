'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager } from '@/lib/queries/cacheUtils';
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
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                <Card>
                    <CardContent className="p-4 space-y-2">
                        {[...Array(7)].map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </CardContent>
                </Card>
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

function TourForm() {
    const router = useRouter();
    const { invalidateTours } = useCacheManager();
    const { form, onSubmit, isLoading, isSaving, tourId } = useTourContext();
    const { handleSubmit, formState: { errors }, watch } = form;
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

    const tourTitle = watch('title');

    const deleteMutation = useMutation({
        mutationFn: () => deleteTour(tourId!),
        onSuccess: () => {
            toast({
                title: 'Success!',
                description: 'Tour deleted successfully',
            });
            invalidateTours();
            router.push('/dashboard/tours');
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error deleting tour',
                description: error.message || 'Failed to delete tour. Please try again.',
            });
        },
    });

    const handleSave = async () => {
        try {
            await handleSubmit(onSubmit)();
        } catch (error: any) {
            console.error('Failed to create tour:', error);
        }
    };

    const handleDelete = () => {
        deleteMutation.mutate();
        setShowDeleteDialog(false);
    };

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    const { isSubmitted, touchedFields } = form.formState;
    const hasErrors = Object.keys(errors).length > 0 && (isSubmitted || Object.keys(touchedFields).length > 0);

    return (
        <div className="space-y-6">
            <DashboardCardHeader
                variant="split"
                title={tourTitle || 'Edit Tour'}
                description="Update tour details and settings"
                backButton={{
                    onClick: () => router.push('/dashboard/tours'),
                    icon: ArrowLeft
                }}
                actions={
                    <>
                        <Button variant="destructive">Delete</Button>
                        <Button>Update Tour</Button>
                    </>
                }
            />

            {submitError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            )}

            {hasErrors && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                        Please fix the errors in the form before submitting.
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
                <TourEditorLayout onSave={handleSave} saveLabel="Update Tour">
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
        </div>
    );
}

export default function EditTourPage() {
    return (
        <TourProvider isEditing={true}>
            <TourForm />
        </TourProvider>
    );
}
