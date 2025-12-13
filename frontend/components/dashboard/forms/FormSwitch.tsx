/**
 * FormSwitch Component
 * Switch toggle field integrated with react-hook-form
 */

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
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

    // Get nested error by path
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
