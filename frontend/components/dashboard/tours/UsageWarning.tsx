'use client';

import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { EntityUsage } from '@/lib/api/categories';

interface UsageWarningProps {
    usage: EntityUsage | undefined;
    isLoading: boolean;
    /** "category" or "destination" — used in the copy. */
    entityLabel: string;
}

/**
 * Shown in the admin delete-confirmation dialog for a global category/
 * destination, before the irreversible delete — sellerCount/tourCount on
 * the row itself aren't trustworthy (see getCategoryUsage/getDestinationUsage
 * on the server), so this always queries live usage instead.
 */
export function UsageWarning({ usage, isLoading, entityLabel }: UsageWarningProps) {
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking who&apos;s using this {entityLabel}...
            </div>
        );
    }

    if (!usage) return null;

    const inUse = usage.sellerCount > 0 || usage.tourCount > 0;

    if (!inUse) {
        return (
            <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Not in use</AlertTitle>
                <AlertDescription>No seller has this {entityLabel} in their profile, and no tour references it. Safe to delete.</AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Can&apos;t delete — this {entityLabel} is in use</AlertTitle>
            <AlertDescription>
                <div className="space-y-2 mt-1">
                    {usage.sellerCount > 0 && (
                        <div>
                            <p className="font-medium">{usage.sellerCount} seller{usage.sellerCount === 1 ? '' : 's'} have this in their profile:</p>
                            <p className="text-sm">{usage.sellers.map((s) => s.name || s.email).join(', ')}</p>
                        </div>
                    )}
                    {usage.tourCount > 0 && (
                        <div>
                            <p className="font-medium">{usage.tourCount} tour{usage.tourCount === 1 ? '' : 's'} reference it:</p>
                            <ul className="text-sm list-disc list-inside">
                                {usage.tours.map((t) => (
                                    <li key={t.id}>
                                        {t.title} ({t.code}){t.sellerNames.length > 0 && ` — ${t.sellerNames.join(', ')}`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="text-sm font-medium pt-1">Remove it from every profile and tour listed above before it can be deleted.</p>
                </div>
            </AlertDescription>
        </Alert>
    );
}
