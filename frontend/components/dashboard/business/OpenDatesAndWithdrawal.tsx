'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
    applyToOpenSlot,
    getPartnerOpenSlots,
    getWithdrawalStatus,
    submitWithdrawalEvidence,
} from '@/lib/api/businessPartners';
import { queryKeys } from '@/lib/queries/queryKeys';

const ROLE_LABEL: Record<string, string> = {
    accommodation: 'Hotel or guesthouse',
    meals: 'Restaurant',
    guide: 'Guide',
    transport: 'Transport',
    other: 'Partner',
};

/** Warning after cancelling an already approved deal, plus the form that lifts a pending hold. */
export function WithdrawalNotice({ businessPartnerId }: { businessPartnerId: string }) {
    const queryClient = useQueryClient();
    const { data } = useQuery({
        queryKey: ['business-partners', businessPartnerId, 'withdrawal-status'],
        queryFn: () => getWithdrawalStatus(businessPartnerId),
    });
    const [explanation, setExplanation] = useState('');
    const onHold = data?.holdReason === 'insufficient_withdrawal_evidence';

    const submit = useMutation({
        mutationFn: () => submitWithdrawalEvidence(businessPartnerId, explanation),
        onSuccess: (result) => {
            toast({ title: result.restored ? 'Account approved again' : 'Still not enough detail', description: result.warning });
            setExplanation('');
            queryClient.invalidateQueries({ queryKey: ['business-partners', businessPartnerId, 'withdrawal-status'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.businessPartners.mine() });
        },
        onError: (error: Error) => toast({ title: 'Could not save the explanation', description: error.message, variant: 'destructive' }),
    });

    if (!data?.warning) return null;

    return (
        <Alert variant={onHold ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{onHold ? 'Account pending approval' : 'Approved deal cancelled'}</AlertTitle>
            <AlertDescription className="space-y-3">
                <p>{data.warning}</p>
                {onHold && (
                    <div className="space-y-2">
                        <Label htmlFor="withdrawal-evidence">Why the already approved deal was cancelled</Label>
                        <Textarea
                            id="withdrawal-evidence"
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            placeholder="Write what happened, on which date, and why the booking could not be kept. A short note is not enough."
                            rows={4}
                        />
                        <Button type="button" size="sm" disabled={submit.isPending || explanation.trim().length < 80} onClick={() => submit.mutate()}>
                            Submit explanation
                        </Button>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}

/** Published itinerary days left open, limited to dates this business is free. */
export function OpenDatesTab({ businessPartnerId }: { businessPartnerId: string }) {
    const queryClient = useQueryClient();
    const { data: slots, isLoading } = useQuery({
        queryKey: ['business-partners', businessPartnerId, 'open-slots'],
        queryFn: () => getPartnerOpenSlots(businessPartnerId),
    });
    const [message, setMessage] = useState<Record<string, string>>({});

    const apply = useMutation({
        mutationFn: (slot: { linkId: string; serviceDate: string }) => applyToOpenSlot(businessPartnerId, slot.linkId, {
            serviceDate: slot.serviceDate,
            message: message[`${slot.linkId}|${slot.serviceDate}`],
        }),
        onSuccess: () => {
            toast({ title: 'Application sent. The seller will choose one business for that date.' });
            queryClient.invalidateQueries({ queryKey: ['business-partners', businessPartnerId, 'open-slots'] });
        },
        onError: (error: Error) => toast({ title: 'Could not apply', description: error.message, variant: 'destructive' }),
    });

    if (isLoading) return <p className="text-sm text-muted-foreground">Loading open dates...</p>;
    if (!slots || slots.length === 0) {
        return <Card><CardContent className="py-8 text-center text-muted-foreground">No open dates you are free for right now.</CardContent></Card>;
    }

    return (
        <div className="space-y-3">
            {slots.map((slot) => {
                const key = `${slot.linkId}|${slot.serviceDate}`;
                return (
                    <Card key={key}>
                        <CardContent className="py-4 space-y-2">
                            <p className="font-medium">{slot.tourTitle}</p>
                            <p className="text-sm text-muted-foreground">
                                {slot.serviceDate} · {ROLE_LABEL[slot.role] || slot.role}
                                {slot.dayLabel ? ` · ${slot.dayLabel}` : ''}
                                {slot.serviceTime ? ` · ${slot.serviceTime}${slot.serviceEndTime ? `–${slot.serviceEndTime}` : ''}` : ''}
                                {slot.unitsRequested ? ` · ${slot.unitsRequested} ${slot.unitType || 'units'} asked` : ''}
                            </p>
                            <Textarea
                                rows={2}
                                placeholder="Optional note for the seller"
                                value={message[key] ?? ''}
                                onChange={(e) => setMessage({ ...message, [key]: e.target.value })}
                            />
                            <Button type="button" size="sm" disabled={apply.isPending} onClick={() => apply.mutate(slot)}>
                                Apply for this date
                            </Button>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
