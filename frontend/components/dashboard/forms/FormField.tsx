/**
 * FormField Component
 * Reusable form field wrapper with label, error display, and description
 * Integrates with react-hook-form for validation and state management
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
    name: string;
    label?: string;
    description?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

/**
 * FormField wrapper component
 * Provides consistent styling and error handling for form fields
 */
export function FormField({
    name,
    label,
    description,
    required = false,
    children,
    className,
}: FormFieldProps) {
    const { formState: { errors } } = useFormContext();

    // Get nested error by path (e.g., "pricing.price")
    const getError = (path: string) => {
        const keys = path.split('.');
        let error: any = errors;
        for (const key of keys) {
            if (error?.[key]) {
                error = error[key];
            } else {
                return null;
            }
        }
        return error;
    };

    const error = getError(name);
    const errorMessage = error?.message as string | undefined;

    return (
        <div className={cn('space-y-2', className)}>
            {label && (
                <Label htmlFor={name} className="text-sm font-medium">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}
            {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
            )}
            <div className="relative">
                {children}
            </div>
            {errorMessage && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
            )}
        </div>
    );
}
