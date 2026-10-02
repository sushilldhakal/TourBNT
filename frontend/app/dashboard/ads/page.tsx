'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { AdStatsPanel, AdStatusBadges, describePlan } from '@/components/dashboard/ads/AdStatsPanel';
import {
    approveAd,
    formatPrice,
    getAdminAds,
    getAdPricing,
    markAdPaid,
    rejectAd,
    updateAdPricing,
    type AdminAdFilter,
    type Advertisement,
} from '@/lib/api/ads';

const FILTERS: { value: AdminAdFilter; label: string }[] = [
    { value: 'pending', label: 'To review' },
    { value: 'unpaid', label: 'Awaiting payment' },
    { value: 'active', label: 'Live' },
    { value: 'ended', label: 'Ended' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
];

export default function AdsAdminPage() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<AdminAdFilter>('pending');
    const [page, setPage] = useState(1);
    const [rejectTarget, setRejectTarget] = useState<Advertisement | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [statsTarget, setStatsTarget] = useState<Advertisement | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['ads', 'admin', filter, page],
        queryFn: () => getAdminAds(filter, page, 20),
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['ads', 'admin'] });

    const approveMutation = useMutation({
        mutationFn: (id: string) => approveAd(id),
        onSuccess: (ad) => {
            toast({ title: ad?.isPaid ? 'Approved — campaign is live' : 'Approved — goes live once marked paid' });
            refresh();
        },
        onError: (error: Error) => toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' }),
    });

    const paidMutation = useMutation({
        mutationFn: (id: string) => markAdPaid(id),
        onSuccess: (ad) => {
            toast({ title: ad?.approvalStatus === 'approved' ? 'Payment recorded — campaign is live' : 'Payment recorded' });
            refresh();
        },
        onError: (error: Error) => toast({ title: 'Failed to record payment', description: error.message, variant: 'destructive' }),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAd(id, reason),
        onSuccess: () => {
            toast({ title: 'Ad campaign rejected' });
            setRejectTarget(null);
            setRejectReason('');
            refresh();
        },
        onError: (error: Error) => toast({ title: 'Failed to reject', description: error.message, variant: 'destructive' }),
    });

    const ads = data?.data ?? [];
    const totalPages = data?.pagination?.totalPages ?? 1;

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                icon={Megaphone}
                title="Ad campaigns"
                description="Review business ads, confirm payments and check how each campaign is delivering."
            />

            <PricingCard />

            <Tabs value={filter} onValueChange={(v) => { setFilter(v as AdminAdFilter); setPage(1); }}>
                <TabsList className="flex-wrap h-auto">
                    {FILTERS.map((f) => <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>)}
                </TabsList>
            </Tabs>

            {isLoading && <p className="text-muted-foreground">Loading…</p>}
            {!isLoading && ads.length === 0 && (
                <Card><CardContent className="py-10 text-center text-muted-foreground">No campaigns here.</CardContent></Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {ads.map((ad) => (
                    <Card key={ad.id}>
                        <CardHeader className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <CardTitle className="text-lg">{ad.title}</CardTitle>
                                    {ad.business && <p className="text-sm text-muted-foreground">{ad.business.name} · {ad.business.type}</p>}
                                </div>
                                <AdStatusBadges ad={ad} />
                            </div>
                            <p className="text-xs text-muted-foreground">{describePlan(ad)}</p>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {ad.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={ad.imageUrl} alt={ad.title} className="w-full h-32 object-cover rounded-md border border-border" />
                            )}
                            {ad.description && <p className="text-muted-foreground">{ad.description}</p>}
                            <p>
                                <span className="text-muted-foreground">Link:</span> {ad.ctaLabel || 'Learn more'} →{' '}
                                <a href={ad.ctaUrl} target="_blank" rel="noreferrer" className="underline text-primary break-all">{ad.ctaUrl}</a>
                            </p>
                            <p className="text-muted-foreground">
                                <span className="text-foreground font-medium">Places:</span>{' '}
                                {ad.targets?.destinations.length ? ad.targets.destinations.map((d) => d.name).join(', ') : 'business location only'}
                                {' · '}
                                <span className="text-foreground font-medium">Tour types:</span>{' '}
                                {ad.targets?.categories.length ? ad.targets.categories.map((c) => c.name).join(', ') : 'any'}
                            </p>
                            <p className="text-muted-foreground tabular-nums">
                                {ad.impressionCount.toLocaleString('en-IN')} views · {ad.clickCount.toLocaleString('en-IN')} clicks
                                {ad.billingModel === 'per_view' && ad.viewQuota ? ` · ${ad.viewQuota.toLocaleString('en-IN')} bought` : ''}
                            </p>
                            {ad.rejectionReason && <p className="text-destructive">Rejected: {ad.rejectionReason}</p>}

                            <div className="flex flex-wrap gap-2 pt-1">
                                {ad.approvalStatus !== 'approved' && (
                                    <Button size="sm" onClick={() => approveMutation.mutate(ad.id)} disabled={approveMutation.isPending}>Approve</Button>
                                )}
                                {!ad.isPaid && ad.approvalStatus !== 'rejected' && (
                                    <Button size="sm" variant="outline" onClick={() => paidMutation.mutate(ad.id)} disabled={paidMutation.isPending}>
                                        Mark paid ({formatPrice(ad.priceAmount, ad.currency)})
                                    </Button>
                                )}
                                {ad.approvalStatus !== 'rejected' && (
                                    <Button size="sm" variant="destructive" onClick={() => setRejectTarget(ad)}>Reject</Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => setStatsTarget(ad)}>View stats</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
            )}

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
                            Reject ad
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!statsTarget} onOpenChange={(open) => !open && setStatsTarget(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>{statsTarget?.title}</DialogTitle></DialogHeader>
                    {statsTarget && <AdStatsPanel adId={statsTarget.id} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/** Admin-editable price list. New campaigns are priced from it; existing ones keep their price. */
function PricingCard() {
    const queryClient = useQueryClient();
    const { data: pricing } = useQuery({ queryKey: ['ad-pricing'], queryFn: getAdPricing });
    const [monthly, setMonthly] = useState('');
    const [per100, setPer100] = useState('');

    useEffect(() => {
        if (pricing) {
            setMonthly(String(pricing.monthlyPrice));
            setPer100(String(pricing.pricePer100Views));
        }
    }, [pricing]);

    const mutation = useMutation({
        mutationFn: () => updateAdPricing({ monthlyPrice: parseInt(monthly, 10), pricePer100Views: parseInt(per100, 10) }),
        onSuccess: () => {
            toast({ title: 'Prices updated', description: 'New campaigns use these prices. Existing campaigns keep theirs.' });
            queryClient.invalidateQueries({ queryKey: ['ad-pricing'] });
        },
        onError: (error: Error) => toast({ title: 'Failed to update prices', description: error.message, variant: 'destructive' }),
    });

    const valid = /^\d+$/.test(monthly) && /^\d+$/.test(per100);
    const example = valid ? (10000 / 100) * parseInt(per100, 10) : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Prices</CardTitle>
            </CardHeader>
            <CardContent>
                <form
                    className="flex flex-col sm:flex-row sm:items-end gap-4"
                    onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(); }}
                >
                    <div className="space-y-2">
                        <Label htmlFor="price-monthly">Monthly plan (Rs per month)</Label>
                        <Input id="price-monthly" inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value.trim())} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price-views">Pay per views (Rs per 100 views)</Label>
                        <Input id="price-views" inputMode="numeric" value={per100} onChange={(e) => setPer100(e.target.value.trim())} />
                    </div>
                    <Button type="submit" disabled={!valid || mutation.isPending}>Save prices</Button>
                </form>
                {example != null && (
                    <p className="text-xs text-muted-foreground mt-3">
                        At these prices 10,000 views cost {formatPrice(example)}.
                        {pricing?.updatedAt && <> Last changed {new Date(pricing.updatedAt).toLocaleDateString()}.</>}
                        {' '}<Badge variant="outline" className="ml-1">Applies to new campaigns only</Badge>
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
