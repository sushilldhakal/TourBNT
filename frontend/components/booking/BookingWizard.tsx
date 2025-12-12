'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingWizardProps {
    tourId: string;
    onComplete: (bookingId: string) => void;
}

interface WizardStep {
    id: number;
    title: string;
    description: string;
}

const STEPS: WizardStep[] = [
    { id: 1, title: 'Date & Pricing', description: 'Select your travel date and pricing option' },
    { id: 2, title: 'Travelers', description: 'Enter traveler information' },
    { id: 3, title: 'Payment', description: 'Complete payment details' },
    { id: 4, title: 'Review', description: 'Review and confirm your booking' },
];

export function BookingWizard({ tourId, onComplete }: BookingWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [bookingData, setBookingData] = useState<any>({});

    const progress = (currentStep / STEPS.length) * 100;

    const handleNext = () => {
        if (currentStep < STEPS.length) {
            // Mark current step as completed
            if (!completedSteps.includes(currentStep)) {
                setCompletedSteps([...completedSteps, currentStep]);
            }
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleStepClick = (stepId: number) => {
        // Only allow navigation to completed steps or the next step
        if (completedSteps.includes(stepId) || stepId === currentStep) {
            setCurrentStep(stepId);
        }
    };

    const handleStepComplete = (stepData: any) => {
        setBookingData({ ...bookingData, ...stepData });
        handleNext();
    };

    const isStepAccessible = (stepId: number) => {
        return completedSteps.includes(stepId) || stepId === currentStep;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Step {currentStep} of {STEPS.length}</span>
                    <span>{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between">
                {STEPS.map((step, index) => (
                    <div
                        key={step.id}
                        className="flex flex-col items-center flex-1"
                    >
                        <button
                            onClick={() => handleStepClick(step.id)}
                            disabled={!isStepAccessible(step.id)}
                            className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                currentStep === step.id && 'bg-primary text-primary-foreground',
                                completedSteps.includes(step.id) && currentStep !== step.id && 'bg-green-500 text-white',
                                !isStepAccessible(step.id) && 'bg-muted text-muted-foreground cursor-not-allowed',
                                isStepAccessible(step.id) && currentStep !== step.id && !completedSteps.includes(step.id) && 'bg-muted hover:bg-muted/80'
                            )}
                        >
                            {completedSteps.includes(step.id) && currentStep !== step.id ? (
                                <Check className="h-5 w-5" />
                            ) : (
                                step.id
                            )}
                        </button>
                        <div className="mt-2 text-center">
                            <p className={cn(
                                'text-sm font-medium',
                                currentStep === step.id && 'text-primary',
                                completedSteps.includes(step.id) && 'text-green-600',
                                !isStepAccessible(step.id) && 'text-muted-foreground'
                            )}>
                                {step.title}
                            </p>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                {step.description}
                            </p>
                        </div>
                        {index < STEPS.length - 1 && (
                            <div className={cn(
                                'h-0.5 w-full mt-5 -mx-2',
                                completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-muted'
                            )} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <Card>
                <CardHeader>
                    <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                    <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Step content will be rendered here based on currentStep */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Date & Pricing selection component will be rendered here
                            </p>
                            <Button onClick={() => handleStepComplete({ date: new Date(), pricing: {} })}>
                                Continue
                            </Button>
                        </div>
                    )}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Traveler form component will be rendered here
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleBack}>
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                                <Button onClick={() => handleStepComplete({ travelers: [] })}>
                                    Continue
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Payment details component will be rendered here
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleBack}>
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                                <Button onClick={() => handleStepComplete({ payment: {} })}>
                                    Continue
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Booking summary and confirmation component will be rendered here
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleBack}>
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                                <Button onClick={() => onComplete('booking-123')}>
                                    Confirm Booking
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={currentStep === STEPS.length}
                >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
