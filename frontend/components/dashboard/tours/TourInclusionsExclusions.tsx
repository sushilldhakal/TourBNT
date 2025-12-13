'use client';

import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { CheckCircle, XCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import NovelEditor from '@/components/dashboard/editor/NovelEditor';
import { useTourContext } from '@/providers/TourProvider';
import { safeParseJSONContent, createEmptyDocument } from '@/components/dashboard/editor/content-parser';
import type { JSONContent } from 'novel';

/**
 * TourInclusionsExclusions Component
 * Handles tour inclusions and exclusions with Novel rich text editors
 * 
 * Features:
 * - Two NovelEditor instances for inclusions and exclusions
 * - Integrates with react-hook-form via useFormContext
 * - Parses existing JSON content when loading
 * - Handles content changes and updates form fields
 * - Styled with Card components for consistency
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5
 */
export function TourInclusionsExclusions() {
    const { setValue, watch, formState: { errors } } = useFormContext();
    const { inclusionsContent, setInclusionsContent, exclusionsContent, setExclusionsContent } = useTourContext();

    // Watch form values for inclusions and exclusions
    const includeValue = watch('include');
    const excludeValue = watch('exclude');

    /**
     * Parse existing JSON content when loading
     * This handles the case when editing an existing tour
     * Includes comprehensive error handling for malformed JSON
     * 
     * Requirements: 20.2
     */
    useEffect(() => {
        if (includeValue && !inclusionsContent) {
            const parseResult = safeParseJSONContent(includeValue, 'inclusions');

            if (parseResult.success && parseResult.data) {
                setInclusionsContent(parseResult.data);
            } else {
                console.error('Failed to parse inclusions:', parseResult.error);

                // Show user-friendly error message
                toast({
                    title: 'Content Loading Error',
                    description: 'Failed to load inclusions content. Starting with empty editor.',
                    variant: 'destructive',
                    duration: 5000,
                });

                // Fall back to empty content
                setInclusionsContent(createEmptyDocument());
            }
        }
    }, [includeValue, inclusionsContent, setInclusionsContent]);

    useEffect(() => {
        if (excludeValue && !exclusionsContent) {
            const parseResult = safeParseJSONContent(excludeValue, 'exclusions');

            if (parseResult.success && parseResult.data) {
                setExclusionsContent(parseResult.data);
            } else {
                console.error('Failed to parse exclusions:', parseResult.error);

                // Show user-friendly error message
                toast({
                    title: 'Content Loading Error',
                    description: 'Failed to load exclusions content. Starting with empty editor.',
                    variant: 'destructive',
                    duration: 5000,
                });

                // Fall back to empty content
                setExclusionsContent(createEmptyDocument());
            }
        }
    }, [excludeValue, exclusionsContent, setExclusionsContent]);

    /**
     * Handle inclusions content changes
     * Updates both the context state and the form field
     */
    const handleInclusionsChange = (content: JSONContent) => {
        setInclusionsContent(content);
        setValue('include', JSON.stringify(content), { shouldDirty: true });
    };

    /**
     * Handle exclusions content changes
     * Updates both the context state and the form field
     */
    const handleExclusionsChange = (content: JSONContent) => {
        setExclusionsContent(content);
        setValue('exclude', JSON.stringify(content), { shouldDirty: true });
    };

    return (
        <div className="space-y-8">
            {/* Inclusions Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <CardTitle>What's Included</CardTitle>
                    </div>
                    <CardDescription>
                        List everything that's included in the tour package
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="include">Inclusions</Label>
                        <NovelEditor
                            initialValue={inclusionsContent}
                            onContentChange={handleInclusionsChange}
                            placeholder="List what's included in the tour (e.g., accommodation, meals, transportation, activities)..."
                            minHeight="250px"
                            enableAI={false}
                            enableGallery={true}
                        />
                        {(errors.include as any) && (
                            <p className="text-sm text-destructive mt-2">
                                {(errors.include as any)?.message as string}
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                            Tip: Use bullet points to make the list easy to read. Press '/' for formatting options.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Exclusions Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <CardTitle>What's Not Included</CardTitle>
                    </div>
                    <CardDescription>
                        List everything that's not included in the tour package
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="exclude">Exclusions</Label>
                        <NovelEditor
                            initialValue={exclusionsContent}
                            onContentChange={handleExclusionsChange}
                            placeholder="List what's not included in the tour (e.g., flights, visa fees, personal expenses, tips)..."
                            minHeight="250px"
                            enableAI={false}
                            enableGallery={true}
                        />
                        {(errors.exclude as any) && (
                            <p className="text-sm text-destructive mt-2">
                                {(errors.exclude as any)?.message as string}
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                            Tip: Be clear about additional costs customers should expect. Press '/' for formatting options.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
