'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Plus, Tag, Trash2 } from 'lucide-react';
import { SellerGuard } from '@/components/dashboard/RoleGuard';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { getMyTours } from '@/lib/api/tours';
import { createPromoCode, deletePromoCode, listPromoCodes, updatePromoCode, type PromoCode } from '@/lib/api/promoCodes';

const KEY = ['promo-codes'];

function statusOf(p: PromoCode): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
    const now = Date.now();
    if (!p.isActive) return { label: 'Off', variant: 'secondary' };
    if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return { label: 'Expired', variant: 'destructive' };
    if (p.startsAt && new Date(p.startsAt).getTime() > now) return { label: 'Scheduled', variant: 'outline' };
    if (p.maxUses != null && p.usedCount >= p.maxUses) return { label: 'Used up', variant: 'destructive' };
    return { label: 'Live', variant: 'default' };
}

const describe = (p: PromoCode) => (p.discountType === 'percentage' ? `${p.discountValue}% off` : `$${p.discountValue} off`) + (p.maxDiscountAmount ? ` (max $${p.maxDiscountAmount})` : '');

export default function PromoCodesPage() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const { data: codes = [], isLoading } = useQuery({ queryKey: KEY, queryFn: listPromoCodes });

    const toggle = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updatePromoCode(id, { isActive }),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
        onError: (e: Error) => toast({ title: 'Could not update', description: e.message, variant: 'destructive' }),
    });
    const remove = useMutation({
        mutationFn: (id: string) => deletePromoCode(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast({ title: 'Promo code deleted' }); },
        onError: (e: Error) => toast({ title: 'Could not delete', description: e.message, variant: 'destructive' }),
    });

    return (
        <SellerGuard>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <DashboardCardHeader
                    variant="split"
                    icon={Tag}
                    title="Promo codes"
                    description="Codes travellers enter at checkout. A code you create works on your own tours; one an admin creates can work site-wide."
                    actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New code</Button>}
                />

                {isLoading ? (
                    <p className="text-muted-foreground">Loading…</p>
                ) : codes.length === 0 ? (
                    <EmptyState icon={<Tag className="h-8 w-8" />} title="No promo codes yet" description="Create a code to offer a discount, for example EARLYBIRD for 10% off, or give it to a partner or a past traveller." />
                ) : (
                    <Card>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Used</TableHead>
                                        <TableHead>Valid</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Active</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {codes.map((p) => {
                                        const st = statusOf(p);
                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <div className="font-mono font-semibold">{p.code}</div>
                                                    {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    {describe(p)}
                                                    {p.minBookingAmount ? <div className="text-xs text-muted-foreground">min booking ${p.minBookingAmount}</div> : null}
                                                    {p.tourIds?.length ? <div className="text-xs text-muted-foreground">{p.tourIds.length} selected tour{p.tourIds.length === 1 ? '' : 's'} only</div> : null}
                                                </TableCell>
                                                <TableCell>{p.usedCount}{p.maxUses != null ? ` / ${p.maxUses}` : ''}</TableCell>
                                                <TableCell className="text-sm">
                                                    {p.startsAt ? format(new Date(p.startsAt), 'd MMM yyyy') : 'Now'} → {p.expiresAt ? format(new Date(p.expiresAt), 'd MMM yyyy') : 'No end'}
                                                </TableCell>
                                                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                                                <TableCell className="text-center">
                                                    <Switch checked={p.isActive} onCheckedChange={(v) => toggle.mutate({ id: p.id, isActive: v })} aria-label={`Turn ${p.code} on or off`} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" aria-label={`Delete ${p.code}`} onClick={() => { if (confirm(`Delete ${p.code}? Bookings that already used it keep their discount.`)) remove.mutate(p.id); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                <NewCodeDialog open={open} onOpenChange={setOpen} onCreated={() => qc.invalidateQueries({ queryKey: KEY })} />
            </div>
        </SellerGuard>
    );
}

function NewCodeDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
    const { toast } = useToast();
    const [tourIds, setTourIds] = useState<string[]>([]);
    // Admins get every tour here, sellers only their own (the server enforces the same rule).
    const { data: tourOptions = [] } = useQuery({
        queryKey: ['promo-codes', 'tour-options'],
        queryFn: async () => (await getMyTours({ limit: 100 })).data.map((t) => ({ value: String(t.id), label: t.code ? `${t.title} (${t.code})` : t.title })),
        enabled: open,
        staleTime: 5 * 60_000,
    });
    const [f, setF] = useState({ code: '', description: '', discountType: 'percentage' as 'percentage' | 'fixed', discountValue: '10', maxDiscountAmount: '', minBookingAmount: '', maxUses: '', startsAt: '', expiresAt: '' });
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

    const create = useMutation({
        mutationFn: () => createPromoCode({
            code: f.code,
            description: f.description || undefined,
            discountType: f.discountType,
            discountValue: Number(f.discountValue),
            maxDiscountAmount: f.maxDiscountAmount ? Number(f.maxDiscountAmount) : null,
            minBookingAmount: f.minBookingAmount ? Number(f.minBookingAmount) : null,
            maxUses: f.maxUses ? Number(f.maxUses) : null,
            startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
            expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59`).toISOString() : null,
            tourIds: tourIds.length ? tourIds : null,
        }),
        onSuccess: (p) => {
            toast({ title: 'Promo code created', description: `${p.code} is live.` });
            onCreated();
            onOpenChange(false);
            setF({ code: '', description: '', discountType: 'percentage', discountValue: '10', maxDiscountAmount: '', minBookingAmount: '', maxUses: '', startsAt: '', expiresAt: '' });
            setTourIds([]);
        },
        onError: (e: Error) => toast({ title: 'Could not create the code', description: e.message, variant: 'destructive' }),
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>New promo code</DialogTitle>
                    <DialogDescription>Travellers enter the code at checkout. You can switch it off or delete it at any time.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="pc-code">Code</Label>
                        <Input id="pc-code" value={f.code} onChange={(e) => setF((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="EARLYBIRD" maxLength={32} className="font-mono uppercase" />
                        <p className="text-xs text-muted-foreground">3–32 characters: letters, numbers, - or _.</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="pc-desc">Note (only you see this)</Label>
                        <Input id="pc-desc" value={f.description} onChange={set('description')} placeholder="Newsletter offer, October" maxLength={300} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="pc-type">Discount type</Label>
                            <select id="pc-type" value={f.discountType} onChange={set('discountType')} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed amount ($)</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pc-value">{f.discountType === 'percentage' ? 'Percent off' : 'Dollars off'}</Label>
                            <Input id="pc-value" type="number" min="0.01" step="0.01" value={f.discountValue} onChange={set('discountValue')} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="pc-min">Minimum booking ($)</Label>
                            <Input id="pc-min" type="number" min="0" step="1" value={f.minBookingAmount} onChange={set('minBookingAmount')} placeholder="None" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pc-cap">Maximum discount ($)</Label>
                            <Input id="pc-cap" type="number" min="0.01" step="1" value={f.maxDiscountAmount} onChange={set('maxDiscountAmount')} placeholder="No cap" />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Works on</Label>
                        <MultiSelect
                            key={open ? 'open' : 'closed'}
                            options={tourOptions}
                            defaultValue={tourIds}
                            onValueChange={setTourIds}
                            placeholder="All eligible tours"
                            modalPopover
                            maxCount={2}
                            className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">Leave empty for every tour the code can apply to, or pick specific tours.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="pc-uses">Total uses</Label>
                            <Input id="pc-uses" type="number" min="1" step="1" value={f.maxUses} onChange={set('maxUses')} placeholder="Unlimited" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pc-start">Starts</Label>
                            <Input id="pc-start" type="date" value={f.startsAt} onChange={set('startsAt')} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pc-end">Ends</Label>
                            <Input id="pc-end" type="date" value={f.expiresAt} onChange={set('expiresAt')} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => create.mutate()} disabled={create.isPending || !f.code.trim() || !f.discountValue}>
                        {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create code
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
