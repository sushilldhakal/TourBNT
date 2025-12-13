'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Save, Loader2 } from 'lucide-react';
import { tourEditorTabs } from './tabs';
import { useTourContext } from '@/providers/TourProvider';

/**
 * TourEditorLayout Component
 * 
 * Provides the tab-based layout structure for the tour editor.
 * Features:
 * - Sidebar navigation with tabs
 * - Main content area for tab content
 * - Responsive design (stacked on mobile, side-by-side on desktop)
 * - URL hash-based tab navigation
 * - Sticky sidebar on desktop
 */

interface TourEditorLayoutProps {
    children: React.ReactNode;
    onSave?: () => void;
    saveLabel?: string;
}

export function TourEditorLayout({
    children,
    onSave,
    saveLabel = 'Save Tour'
}: TourEditorLayoutProps) {
    const { isSaving } = useTourContext();


    // Get initial tab from URL hash or default to first tab
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const hash = window.location.hash.substring(1);
            return hash || tourEditorTabs[0].id;
        }
        return tourEditorTabs[0].id;
    });

    // Update active tab when URL hash changes
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            if (hash && tourEditorTabs.some(tab => tab.id === hash)) {
                setActiveTab(hash);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Update URL hash when tab changes
    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        window.location.hash = tabId;
    };

    return (
        <div className="container mx-auto px-4 max-w-7xl">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 py-8">

                    {/* Sidebar Navigation */}
                    <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-2rem)] lg:overflow-y-auto">
                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <TabsList className="flex flex-col h-auto bg-transparent space-y-1 w-full">
                                    {tourEditorTabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <TabsTrigger
                                                key={tab.id}
                                                value={tab.id}
                                                className="w-full justify-start gap-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                            >
                                                <Icon className="h-4 w-4 flex-shrink-0" />
                                                <span className="flex-1 text-left">{tab.title}</span>
                                                {activeTab === tab.id && (
                                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                                                )}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            </CardContent>

                            {/* Save Button in Sidebar Footer */}
                            {onSave && (
                                <CardFooter className="px-4 py-4 border-t">
                                    <Button
                                        onClick={onSave}
                                        className="w-full"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                {saveLabel}
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>

                        {/* Tab Description (Desktop Only) */}
                        <Card className="hidden lg:block border shadow-sm">
                            <CardContent className="p-4">
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm">
                                        {tourEditorTabs.find(t => t.id === activeTab)?.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {tourEditorTabs.find(t => t.id === activeTab)?.description}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* Main Content Area */}
                    <main className="space-y-6 min-w-0">
                        {/* Render tab content - children should be TabsContent components */}
                        {children}
                    </main>
                </div>
            </Tabs>
        </div>
    );
}
