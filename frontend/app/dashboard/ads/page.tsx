'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { getPendingAds, approveAd, rejectAd, Advertisement } from '@/lib/api/ads';

export default function AdsAdminPage() {
    const queryClient = useQueryClient();
    const [rejectTarget, setRejectTarget] = useState<Advertisement | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['ads', 'pending'],
        queryFn: () => getPendingAds(1, 50),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => approveAd(id),
        onSuccess: () => {
            toast({ title: 'Ad campaign approved' });
            queryClient.invalidateQueries({ queryKey: ['ads', 'pending'] });
        },
        onError: (error: Error) => toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' }),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAd(id, reason),
        onSuccess: () => {
            toast({ title: 'Ad campaign rejected' });
            setRejectTarget(null);
            setRejectReason('');
            queryClient.invalidateQueries({ queryKey: ['ads', 'pending'] });
        },
        onError: (error: Error) => toast({ title: 'Failed to reject', description: error.message, variant: 'destructive' }),
    });

    const ads = data?.data ?? [];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Ad Campaign Moderation</h1>
                <p className="text-muted-foreground">Review ad creatives before they can go live on relevant pages.</p>
            </div>

            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && ads.length === 0 && (
                <Card><CardContent className="py-10 text-center text-muted-foreground">No pending ad campaigns.</CardContent></Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {ads.map((ad) => (
                    <Card key={ad.id}>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0">
                            <div>
                                <CardTitle className="text-lg">{ad.title}</CardTitle>
                                <div className="flex gap-2 mt-1">
                                    <Badge variant="secondary" className="capitalize">{ad.placementSlot.replace('_', ' ')}</Badge>
                                    {ad.business && <Badge variant="outline">{ad.business.name}</Badge>}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {ad.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={ad.imageUrl} alt={ad.title} className="w-full h-32 object-cover rounded-md border border-border" />
                            )}
                            <p className="text-sm text-muted-foreground">{ad.description}</p>
                            <div className="text-sm">
                                <span className="text-muted-foreground">CTA:</span> {ad.ctaLabel || 'Learn more'} → <a href={ad.ctaUrl} target="_blank" rel="noreferrer" className="underline text-primary">{ad.ctaUrl}</a>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" onClick={() => approveMutation.mutate(ad.id)} disabled={approveMutation.isPending}>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => setRejectTarget(ad)}>Reject</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reject &quot;{rejectTarget?.title}&quot;</DialogTitle></DialogHeader>
                    <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            disabled={!rejectReason.trim() || rejectMutation.isPending}
                            onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
                        >
                            Reject Ad
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
