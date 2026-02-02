'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, AlertCircle, MapPin } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';

function TourForm() {
    const router = useRouter();
    const { form, onSubmit, isSaving } = useTourContext();
    const { handleSubmit, formState: { errors } } = form;
    const [submitError] = React.useState<string | null>(null);


    const handleSave = async () => {
        try {
            await handleSubmit(onSubmit)();
        } catch (error: any) {
            console.error('Failed to create tour:', error);
        }
    };

    // Only show validation errors after user has attempted to submit or touched fields
    const { isSubmitted, touchedFields } = form.formState;
    const hasErrors = Object.keys(errors).length > 0 && (isSubmitted || Object.keys(touchedFields).length > 0);

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6">
            <DashboardCardHeader
                variant="split"
                icon={MapPin}
                badge="Tour"
                title="Create New Tour"
                description="Fill in the details below to create a new tour package"
                backButton={{
                    onClick: () => router.push('/dashboard/tours'),
                    icon: ArrowLeft,
                }}
                actions={
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        size="lg"
                        className="w-full sm:w-auto"
                        aria-label={isSaving ? 'Creating tour...' : 'Create tour'}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Create Tour
                            </>
                        )}
                    </Button>
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
                <TourEditorLayout onSave={handleSave} saveLabel="Create Tour">
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

export default function AddTourPage() {
    return (
        <TourProvider isEditing={false}>
            <TourForm />
        </TourProvider>
    );
}
