/**
 * FormTextarea Component
 * Textarea field integrated with react-hook-form
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from './FormField';

interface FormTextareaProps {
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    rows?: number;
    className?: string;
}

/**
 * FormTextarea component
 * Textarea with automatic registration and error handling
 */
export function FormTextarea({
    name,
    label,
    description,
    placeholder,
    required = false,
    disabled = false,
    rows = 4,
    className,
}: FormTextareaProps) {
    const { register } = useFormContext();

    return (
        <FormField
            name={name}
            label={label}
            description={description}
            required={required}
            className={className}
        >
            <Textarea
                id={name}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                {...register(name)}
            />
        </FormField>
    );
}
