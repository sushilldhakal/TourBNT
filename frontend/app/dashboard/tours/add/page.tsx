'use client';

import React from 'react';
import { FormProvider } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
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

/**
 * Add Tour Page
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * Features:
 * - Page header with back navigation and save action (Req 10.1, 11.2)
 * - Tab-based form navigation with URL hash support (Req 10.1, 10.2)
 * - Form validation with clear error messages (Req 10.1, 10.2, 11.3)
 * - Form submission with FormData processing (Req 10.3)
 * - Loading states during submission (Req 11.1, 11.2)
 * - Error handling with user-friendly messages (Req 11.3)
 * - Success notifications and redirect (Req 11.4)
 */

function TourForm() {
    const router = useRouter();
    const { form, onSubmit, isSaving } = useTourContext();
    const { handleSubmit, formState: { errors } } = form;
    const [submitError, setSubmitError] = React.useState<string | null>(null);

    /**
     * Handle form save
     * Requirements: 10.3, 10.4, 11.2, 11.3, 11.4
     * - Validates all required fields (10.1)
     * - Sends form data to API (10.3)
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
            setSubmitError(error.message || 'Failed to create tour. Please try again.');
        }
    };

    // Requirement 10.2: Show validation errors
    const hasErrors = Object.keys(errors).length > 0;

    return (
        <div className="space-y-6">
            {/* Page Header - Requirements: 10.1, 11.2 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard/tours')}
                        disabled={isSaving}
                        aria-label="Back to tours"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create New Tour</h1>
                        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                            Fill in the details below to create a new tour package
                        </p>
                    </div>
                </div>
                {/* Requirement 11.2: Disable button and show loading indicator during submission */}
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

            {/* Form with Tab Navigation - Requirements: 10.1, 10.2, 10.3 */}
            <FormProvider {...form}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* 
                        TourEditorLayout provides:
                        - Tab-based navigation (Req 10.1)
                        - URL hash support for deep linking (Req 10.1)
                        - Responsive design (Req 12.1, 12.2, 12.3)
                        - Save button in sidebar (Req 11.2)
                    */}
                    <TourEditorLayout onSave={handleSave} saveLabel="Create Tour">
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
 * Add Tour Page Component
 * Wraps the form in TourProvider with isEditing=false
 * Requirements: 10.1, 10.3
 */
export default function AddTourPage() {
    return (
        <TourProvider isEditing={false}>
            <TourForm />
        </TourProvider>
    );
}
