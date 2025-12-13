/**
 * FormMultiSelect Component
 * Multi-select field integrated with react-hook-form
 */

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import MultipleSelector, { Option } from '@/components/ui/multiple-selector';
import { FormField } from './FormField';

interface FormMultiSelectProps {
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    options: Option[];
    required?: boolean;
    disabled?: boolean;
    maxSelected?: number;
    className?: string;
}

/**
 * FormMultiSelect component
 * Multi-select dropdown with automatic registration and error handling
 */
export function FormMultiSelect({
    name,
    label,
    description,
    placeholder = 'Select options',
    options,
    required = false,
    disabled = false,
    maxSelected,
    className,
}: FormMultiSelectProps) {
    const { control } = useFormContext();

    return (
        <FormField
            name={name}
            label={label}
            description={description}
            required={required}
            className={className}
        >
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <MultipleSelector
                        value={field.value || []}
                        onChange={field.onChange}
                        options={options}
                        placeholder={placeholder}
                        disabled={disabled}
                        maxSelected={maxSelected}
                        emptyIndicator={
                            <p className="text-center text-sm text-muted-foreground">
                                No options available
                            </p>
                        }
                    />
                )}
            />
        </FormField>
    );
}
