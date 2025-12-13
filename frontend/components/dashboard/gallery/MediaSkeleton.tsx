/**
 * MediaSkeleton Component
 * 
 * Loading skeleton matching MediaCard layout.
 * Displays animated loading placeholders while media items are being fetched.
 */

'use client';

import { MediaSkeletonProps } from './types';
import { cn } from '@/lib/utils';

/**
 * Single skeleton card matching MediaCard layout
 */
function SkeletonCard() {
    return (
        <div
            className={cn(
                'relative aspect-square rounded-lg overflow-hidden',
                'border-2 border-border bg-muted'
            )}
        >
            {/* Main content area with shimmer */}
            <div className="relative w-full h-full animate-pulse">
                {/* Shimmer effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent animate-shimmer" />
            </div>

            {/* Checkbox skeleton (top-left) */}
            <div className="absolute top-2 left-2 z-10">
                <div className="w-5 h-5 rounded border-2 border-border bg-muted-foreground/20 animate-pulse" />
            </div>

            {/* Bottom info overlay skeleton */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-muted-foreground/20 to-transparent p-2">
                <div className="space-y-1">
                    {/* Filename skeleton */}
                    <div className="h-3 bg-muted-foreground/30 rounded w-3/4 animate-pulse" />
                    {/* File size skeleton */}
                    <div className="h-2 bg-muted-foreground/20 rounded w-1/2 animate-pulse" />
                </div>
            </div>
        </div>
    );
}

/**
 * MediaSkeleton Component
 * Renders multiple skeleton cards to match the expected grid layout
 */
export function MediaSkeleton({ count = 12 }: MediaSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} />
            ))}
        </>
    );
}
