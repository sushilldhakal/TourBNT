'use client';

import { FieldError } from 'react-hook-form';
import { CheckCircle, XCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTourContext } from '@/providers/TourProvider';
import type { JSONContent } from 'novel';
import dynamic from 'next/dynamic';

// Dynamically import NovelEditor at module level to keep a stable component identity
const NovelEditor = dynamic(() => import('@/components/dashboard/editor/NovelEditor'), {
    ssr: false,
    loading: () => <p>Loading Editor...</p>, // Optional loading state
});


export function TourInclusionsExclusions() {
    const { inclusionsContent, exclusionsContent, form } = useTourContext();
    const { setValue, watch, formState: { errors } } = form;

    // Get current form values to use as fallback if memoized content is null
    const currentInclude = watch('include');
    const currentExclude = watch('exclude');

    // Use form value if memoized content is null (for new tours)
    const includeInitialValue = inclusionsContent || (currentInclude && typeof currentInclude === 'object' && 'type' in currentInclude ? currentInclude as JSONContent : null);
    const excludeInitialValue = exclusionsContent || (currentExclude && typeof currentExclude === 'object' && 'type' in currentExclude ? currentExclude as JSONContent : null);

    const handleInclusionsChange = (content: JSONContent) => {
        setValue('include', content, { shouldDirty: true });
    };

    const handleExclusionsChange = (content: JSONContent) => {
        setValue('exclude', content, { shouldDirty: true });
    };



    return (
        <div className="space-y-8">
            {/* Inclusions Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <CardTitle>What&apos;s Included</CardTitle>
                    </div>
                    <CardDescription>
                        List everything that&apos;s included in the tour package
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="include">Inclusions</Label>
                        <NovelEditor
                            initialValue={includeInitialValue}
                            onContentChange={handleInclusionsChange}
                            placeholder="List what's included in the tour (e.g., accommodation, meals, transportation, activities)..."
                            minHeight="250px"
                            enableAI={false}
                            enableGallery={true}
                        />
                        {(errors.include as string | undefined) && (
                            <p className="text-sm text-destructive mt-2">
                                {(errors.include as FieldError)?.message as string}
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                            Tip: Use bullet points to make the list easy to read. Press &apos;/&apos; for formatting options.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Exclusions Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <CardTitle>What&apos;s Not Included</CardTitle>
                    </div>
                    <CardDescription>
                        List everything that&apos;s not included in the tour package
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="exclude">Exclusions</Label>
                        <NovelEditor
                            initialValue={excludeInitialValue}
                            onContentChange={handleExclusionsChange}
                            placeholder="List what's not included in the tour (e.g., flights, visa fees, personal expenses, tips)..."
                            minHeight="250px"
                            enableAI={false}
                            enableGallery={true}
                        />
                        {(errors.exclude as string | undefined) && (
                            <p className="text-sm text-destructive mt-2">
                                {(errors.exclude as FieldError)?.message as string}
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                            Tip: Be clear about additional costs customers should expect. Press &apos;/&apos; for formatting options.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
