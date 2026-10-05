'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { getTourOpenSlots, selectOpenSlotApplication } from '@/lib/api/tours';
import { queryKeys } from '@/lib/queries/queryKeys';

const ROLE_LABEL: Record<string, string> = {
    accommodation: 'Hotel or guesthouse',
    meals: 'Restaurant',
    guide: 'Guide',
    transport: 'Transport',
    other: 'Partner',
};

/**
 * Dates the seller left open. Each date lists who applied; the seller picks one.
 * Assigning a specific business in the day editor is the other path.
 */
export function OpenSlotApplications({ tourId }: { tourId: string }) {
    const queryClient = useQueryClient();
    const { data: slots, isLoading } = useQuery({
        queryKey: ['tours', tourId, 'open-slots'],
        queryFn: () => getTourOpenSlots(tourId),
        enabled: !!tourId,
    });

    const selectMutation = useMutation({
        mutationFn: (applicationId: string) => selectOpenSlotApplication(tourId, applicationId),
        onSuccess: (result) => {
            toast({ title: `${result.businessName} chosen for ${result.serviceDate}` });
            queryClient.invalidateQueries({ queryKey: ['tours', tourId, 'open-slots'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.businessPartners.tourLogisticsStatus(tourId) });
        },
        onError: (error: Error) => toast({ title: 'Could not choose that business', description: error.message, variant: 'destructive' }),
    });

    if (isLoading || !slots || slots.length === 0) return null;

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Open for applications
                </CardTitle>
                <CardDescription>
                    These days were left open. A hotel, guesthouse, restaurant, guide or transport provider who is free can apply, and you choose one for that date.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {slots.map((slot) => (
                    <div key={`${slot.linkId}-${slot.serviceDate ?? 'undated'}`} className="rounded-md border px-3 py-2 text-sm space-y-2">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <p className="font-medium">
                                {ROLE_LABEL[slot.role] || slot.role}
                                {slot.dayLabel ? ` · ${slot.dayLabel}` : ''}
                                {slot.serviceDate ? ` · ${slot.serviceDate}` : ''}
                                {slot.unitsRequested ? ` · ${slot.unitsRequested} ${slot.unitType || 'units'}` : ''}
                            </p>
                            {slot.filled && (
                                <Badge variant="outline">{slot.selectedPartnerName} chosen</Badge>
                            )}
                        </div>
                        {!slot.serviceDate && (
                            <p className="text-xs text-muted-foreground">This day is open. Applications show here once the tour has a fixed or multiple departure date.</p>
                        )}
                        {slot.serviceDate && slot.applications.filter((a) => a.status === 'applied').length === 0 && !slot.filled && (
                            <p className="text-xs text-muted-foreground">Waiting for a free business to apply. You can still assign one directly on the day.</p>
                        )}
                        {slot.applications.filter((a) => a.status === 'applied').map((application) => (
                            <div key={application.id} className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-2">
                                <div className="min-w-0">
                                    <p className="font-medium">{application.businessName}</p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                        {application.businessType}
                                        {application.unitsOffered != null ? ` · offering ${application.unitsOffered}` : ''}
                                        {application.message ? ` · ${application.message}` : ''}
                                    </p>
                                </div>
                                {!slot.filled && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={selectMutation.isPending}
                                        onClick={() => selectMutation.mutate(application.id)}
                                    >
                                        Choose
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
