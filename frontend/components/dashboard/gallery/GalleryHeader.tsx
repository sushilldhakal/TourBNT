/**
 * GalleryHeader Component
 * 
 * Header section for the gallery with title, item count, and upload button.
 * Displays media type icon and description text.
 * 
 * Requirements: 1.1, 1.2
 */

'use client';

import React from 'react';
import { GalleryHeaderProps } from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * GalleryHeader Component
 * 
 * Features:
 * - Title with media type icon
 * - Item count badge
 * - Upload button
 * - Optional description text
 * - Responsive layout
 */
export function GalleryHeader({
    title,
    itemCount,
    onUploadClick,
    description,
}: GalleryHeaderProps) {
    return (
        <div className="w-full border-b bg-background">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left section: Title and description */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            {/* Media icon */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                                <Icon
                                    name="lu:LuImages"
                                    size={20}
                                    className="text-primary"
                                />
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl font-bold tracking-tight">
                                {title}
                            </h1>

                            {/* Item count badge */}
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'px-2.5 py-0.5 text-sm font-semibold',
                                    'bg-muted text-muted-foreground'
                                )}
                                aria-label={`${itemCount} total items`}
                            >
                                {itemCount.toLocaleString()}
                            </Badge>
                        </div>

                        {/* Description */}
                        {description && (
                            <p className="text-sm text-muted-foreground max-w-2xl">
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Right section: Upload button */}
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={onUploadClick}
                            size="default"
                            className="gap-2"
                            aria-label="Upload new media files"
                        >
                            <Icon name="lu:LuUpload" size={18} aria-hidden="true" />
                            <span className="hidden sm:inline">Upload Media</span>
                            <span className="sm:hidden">Upload</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
