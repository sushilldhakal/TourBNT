/**
 * FormInput Component
 * Text input field integrated with react-hook-form
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FormField } from './FormField';

interface FormInputProps {
    name: string;
    label?: string;
    description?: string;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

/**
 * FormInput component
 * Text input with automatic registration and error handling
 */
export function FormInput({
    name,
    label,
    description,
    placeholder,
    type = 'text',
    required = false,
    disabled = false,
    className,
}: FormInputProps) {
    const { register } = useFormContext();

    return (
        <FormField
            name={name}
            label={label}
            description={description}
            required={required}
            className={className}
        >
            <Input
                id={name}
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                {...register(name, {
                    valueAsNumber: type === 'number',
                })}
            />
        </FormField>
    );
}
