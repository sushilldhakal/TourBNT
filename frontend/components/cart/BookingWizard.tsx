'use client';

import { ShoppingCart, CreditCard, CheckCircle } from 'lucide-react';

interface BookingWizardProps {
    currentStep: number;
    itemCount?: number;
}

export function BookingWizard({ currentStep, itemCount = 0 }: BookingWizardProps) {
    const steps = [
        { id: 0, name: 'Cart', icon: ShoppingCart },
        { id: 1, name: 'Checkout', icon: CreditCard },
        { id: 2, name: 'Confirmation', icon: CheckCircle },
    ];

    return (
        <div className="bg-card border-b">
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between max-w-3xl mx-auto">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={`
                      w-12 h-12 rounded-full flex items-center justify-center relative
                      ${isActive ? 'bg-primary text-primary-foreground' : ''}
                      ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                      ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                    `}
                                    >
                                        <Icon className="w-6 h-6" />
                                        {step.id === 0 && itemCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                                {itemCount}
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={`
                      mt-2 text-sm font-medium
                      ${isActive ? 'text-foreground' : 'text-muted-foreground'}
                    `}
                                    >
                                        {step.name}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`
                      h-0.5 flex-1 mx-4
                      ${isCompleted ? 'bg-primary' : 'bg-muted'}
                    `}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
