/**
 * InputTags Component
 * 
 * Tag input component for adding/removing tags.
 * Used for media metadata and SEO tags.
 */

'use client';

import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from './input';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface InputTagsProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
    maxTags?: number;
    disabled?: boolean;
}

export function InputTags({
    value = [],
    onChange,
    placeholder = 'Add tags...',
    className,
    maxTags,
    disabled = false,
}: InputTagsProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            // Remove last tag on backspace if input is empty
            removeTag(value.length - 1);
        }
    };

    const addTag = () => {
        const trimmedValue = inputValue.trim();

        if (!trimmedValue) return;

        // Check if tag already exists
        if (value.includes(trimmedValue)) {
            setInputValue('');
            return;
        }

        // Check max tags limit
        if (maxTags && value.length >= maxTags) {
            return;
        }

        onChange([...value, trimmedValue]);
        setInputValue('');
    };

    const removeTag = (index: number) => {
        const newTags = value.filter((_, i) => i !== index);
        onChange(newTags);
    };

    const handleBlur = () => {
        // Add tag on blur if there's input
        if (inputValue.trim()) {
            addTag();
        }
    };

    return (
        <div
            className={cn(
                'flex flex-wrap gap-2 p-2 border rounded-md bg-background',
                'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
        >
            {/* Display existing tags */}
            {value.map((tag, index) => (
                <Badge
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className="gap-1 pr-1"
                >
                    <span>{tag}</span>
                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                            aria-label={`Remove ${tag} tag`}
                        >
                            <X size={12} />
                        </button>
                    )}
                </Badge>
            ))}

            {/* Input for new tags */}
            {(!maxTags || value.length < maxTags) && (
                <Input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder={value.length === 0 ? placeholder : ''}
                    disabled={disabled}
                    className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
                />
            )}
        </div>
    );
}
