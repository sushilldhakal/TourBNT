/**
 * FormSwitch Component
 * Switch toggle field integrated with react-hook-form
 */

import React from 'react';
import { get, useFormContext, Controller, type FieldError } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormSwitchProps {
    name: string;
    label?: string;
    description?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * FormSwitch component
 * Switch toggle with automatic registration and error handling
 */
export function FormSwitch({
    name,
    label,
    description,
    disabled = false,
    className,
}: FormSwitchProps) {
    const { control, formState: { errors } } = useFormContext();

    // Nested error by path (e.g. "pricing.price")
    const error = get(errors, name) as FieldError | undefined;
    const errorMessage = error?.message;

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex items-center space-x-2">
                <Controller
                    name={name}
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id={name}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={disabled}
                        />
                    )}
                />
                {label && (
                    <Label htmlFor={name} className="text-sm font-medium cursor-pointer">
                        {label}
                    </Label>
                )}
            </div>
            {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
            )}
        </div>
    );
}
