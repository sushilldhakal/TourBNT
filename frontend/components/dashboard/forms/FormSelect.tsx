/**
 * FormSelect Component
 * Select dropdown field integrated with react-hook-form
 */

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormField } from './FormField';

interface SelectOption {
    label: string;
    value: string;
}

interface FormSelectProps {
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    options: SelectOption[];
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

/**
 * FormSelect component
 * Select dropdown with automatic registration and error handling
 */
export function FormSelect({
    name,
    label,
    description,
    placeholder = 'Select an option',
    options,
    required = false,
    disabled = false,
    className,
}: FormSelectProps) {
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
                    <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={disabled}
                    >
                        <SelectTrigger id={name}>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
        </FormField>
    );
}
