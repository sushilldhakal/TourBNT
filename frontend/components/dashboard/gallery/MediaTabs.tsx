/**
 * MediaTabs Component
 * 
 * Tab navigation for filtering media by type (Images, Videos, PDFs).
 * Implements responsive layout with icons and labels.
 * 
 * Requirements: 1.2, 1.3
 */

'use client';

import React from 'react';
import { MediaTabsProps, MediaTab } from './types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * Tab configuration with icons and labels
 */
const TAB_CONFIG: Record<MediaTab, { label: string; icon: string }> = {
    images: {
        label: 'Images',
        icon: 'lu:LuImage',
    },
    videos: {
        label: 'Videos',
        icon: 'lu:LuVideo',
    },
    pdfs: {
        label: 'PDFs',
        icon: 'lu:LuFileText',
    },
};

/**
 * MediaTabs Component
 * 
 * Provides tab navigation for switching between media types.
 * Features:
 * - Visual icons for each media type
 * - Active tab highlighting
 * - Optional item counts per tab
 * - Responsive layout (grid on mobile, inline on desktop)
 * - Keyboard navigation support
 */
export function MediaTabs({ activeTab, onTabChange, counts }: MediaTabsProps) {
    /**
     * Handle tab change
     * Validates tab value and calls parent handler
     */
    const handleTabChange = (value: string) => {
        // Validate that the value is a valid MediaTab
        if (value === 'images' || value === 'videos' || value === 'pdfs') {
            onTabChange(value);
        }
    };

    return (
        <div className="w-full border-b bg-background" role="navigation" aria-label="Media type navigation">
            <div className="container mx-auto px-4 py-3">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList
                        className={cn(
                            'w-full h-auto',
                            'grid grid-cols-3 gap-2', // Mobile: grid layout
                            'sm:inline-flex sm:w-auto', // Desktop: inline layout
                            'bg-muted/50'
                        )}
                        role="tablist"
                        aria-label="Media type tabs"
                    >
                        {(Object.keys(TAB_CONFIG) as MediaTab[]).map((tab) => {
                            const config = TAB_CONFIG[tab];
                            const count = counts?.[tab];

                            return (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className={cn(
                                        'flex items-center justify-center gap-2',
                                        'min-w-[100px] py-2.5',
                                        'data-[state=active]:bg-background',
                                        'data-[state=active]:shadow-sm',
                                        'transition-all duration-200'
                                    )}
                                    role="tab"
                                    aria-label={`View ${config.label}${count !== undefined ? `, ${count} items` : ''}`}
                                    aria-selected={activeTab === tab}
                                    aria-controls={`${tab}-panel`}
                                >
                                    {/* Icon */}
                                    <Icon
                                        name={config.icon}
                                        size={18}
                                        className="flex-shrink-0"
                                    />

                                    {/* Label */}
                                    <span className="font-medium text-sm">
                                        {config.label}
                                    </span>

                                    {/* Count badge (optional) */}
                                    {count !== undefined && (
                                        <span
                                            className={cn(
                                                'ml-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                                                'bg-muted text-muted-foreground',
                                                'data-[state=active]:bg-primary/10 data-[state=active]:text-primary'
                                            )}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
}
