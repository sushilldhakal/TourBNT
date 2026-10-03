'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Banknote, Loader2, Percent } from 'lucide-react';
import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
    createPayout, deletePayout, getAllPayouts, getDefaultCommission, getSellerBalances, markPayoutPaid,
    setDefaultCommission, setSellerCommission, type Payout, type SellerBalance,
} from '@/lib/api/payouts';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminPayoutsPage() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const refresh = () => ['payout-balances', 'payouts-all', 'commission-default'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    const fail = (title: string) => (e: Error) => toast({ title, description: e.message, variant: 'destructive' });

    const { data: balances = [] } = useQuery({ queryKey: ['payout-balances'], queryFn: getSellerBalances });
    const { data: payouts = [] } = useQuery({ queryKey: ['payouts-all'], queryFn: getAllPayouts });
    const { data: commission } = useQuery({ queryKey: ['commission-default'], queryFn: getDefaultCommission });

    const [rate, setRate] = useState('');
    const [rateSeller, setRateSeller] = useState<SellerBalance | null>(null);
    const [sellerRate, setSellerRate] = useState('');
    const [payTarget, setPayTarget] = useState<Payout | null>(null);
    const [reference, setReference] = useState('');

    const saveDefault = useMutation({
        mutationFn: () => setDefaultCommission(Number(rate)),
        onSuccess: (r) => { toast({ title: 'Default commission saved', description: `New bookings now use ${r.defaultRate}%. Existing bookings keep the rate they were made with.` }); setRate(''); refresh(); },
        onError: fail('Could not save'),
    });
    const saveSeller = useMutation({
        mutationFn: ({ id, value }: { id: string; value: number | null }) => setSellerCommission(id, value),
        onSuccess: () => { toast({ title: 'Seller commission saved' }); setRateSeller(null); refresh(); },
        onError: fail('Could not save'),
    });
    const create = useMutation({
        mutationFn: (b: SellerBalance) => createPayout(b.sellerId),
        onSuccess: (p) => { toast({ title: 'Payout created', description: `${usd(p.amount)} for ${p.bookingCount} booking(s). Transfer the money, then mark it paid.` }); refresh(); },
        onError: fail('Could not create the payout'),
    });
    const pay = useMutation({
        mutationFn: () => markPayoutPaid(payTarget!.id, reference),
        onSuccess: () => { toast({ title: 'Marked as paid', description: 'The seller has been emailed.' }); setPayTarget(null); setReference(''); refresh(); },
        onError: fail('Could not mark as paid'),
    });
    const remove = useMutation({
        mutationFn: (id: string) => deletePayout(id),
        onSuccess: () => { toast({ title: 'Payout deleted', description: 'Its bookings are payable again.' }); refresh(); },
        onError: fail('Could not delete'),
    });

    return (
        <AdminGuard>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
                <DashboardCardHeader variant="compact" icon={Banknote} badge="Payouts" title="Seller payouts and commission" description="Gather what each seller is owed into a payout, transfer the money from your bank, then record the reference." />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><Percent className="h-4 w-4" />Commission</CardTitle>
                        <CardDescription>TourBNT keeps this share of every booking. A seller can have their own rate (see the table below). Changing a rate only affects new bookings.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-end gap-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Default rate</p>
                            <p className="text-3xl font-semibold">{commission ? `${commission.defaultRate}%` : '…'}</p>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="rate">New default (%)</Label>
                            <Input id="rate" type="number" min="0" max="100" step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} className="w-32" placeholder="10" />
                        </div>
                        <Button onClick={() => saveDefault.mutate()} disabled={!rate || saveDefault.isPending}>{saveDefault.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                    </CardContent>
                </Card>

                <section>
                    <h2 className="text-lg font-semibold mb-3">Ready to pay out</h2>
                    {balances.length === 0 ? (
                        <EmptyState icon={<Banknote className="h-8 w-8" />} title="Nothing to pay out right now" description="A booking appears here once it is paid in full, confirmed, and its trip finished (a day after departure)." />
                    ) : (
                        <Card><CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Seller</TableHead><TableHead>Commission</TableHead><TableHead>Bookings</TableHead><TableHead className="text-right">Owed</TableHead><TableHead /></TableRow></TableHeader>
                                <TableBody>
                                    {balances.map((b) => (
                                        <TableRow key={b.sellerId}>
                                            <TableCell>{b.name}<div className="text-xs text-muted-foreground">{b.email}</div></TableCell>
                                            <TableCell>
                                                {b.commissionRate != null ? `${b.commissionRate}% (own)` : `${commission?.defaultRate ?? '…'}% (default)`}{' '}
                                                <button className="text-xs text-primary underline" onClick={() => { setRateSeller(b); setSellerRate(b.commissionRate != null ? String(b.commissionRate) : ''); }}>change</button>
                                            </TableCell>
                                            <TableCell>{b.bookings}</TableCell>
                                            <TableCell className="text-right font-semibold">{usd(b.amount)}</TableCell>
                                            <TableCell className="text-right"><Button size="sm" onClick={() => create.mutate(b)} disabled={create.isPending}>Create payout</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent></Card>
                    )}
                </section>

                <section>
                    <h2 className="text-lg font-semibold mb-3">Payouts</h2>
                    {payouts.length === 0 ? <p className="text-sm text-muted-foreground">No payouts created yet.</p> : (
                        <Card><CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Seller</TableHead><TableHead>Bookings</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Reference</TableHead><TableHead /></TableRow></TableHeader>
                                <TableBody>
                                    {payouts.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>{format(new Date(p.createdAt), 'd MMM yyyy')}</TableCell>
                                            <TableCell>{p.sellerName}</TableCell>
                                            <TableCell>{p.bookingCount}</TableCell>
                                            <TableCell className="text-right font-medium">{usd(p.amount)}</TableCell>
                                            <TableCell><Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status === 'paid' ? 'Paid' : 'Awaiting transfer'}</Badge></TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{p.reference ?? '—'}</TableCell>
                                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                <Link className="text-primary hover:underline text-sm" href={`/dashboard/earnings/${p.id}`}>Statement</Link>
                                                {p.status === 'pending' && <Button size="sm" variant="outline" onClick={() => setPayTarget(p)}>Mark paid</Button>}
                                                {p.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this payout? Its bookings become payable again.')) remove.mutate(p.id); }}>Delete</Button>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent></Card>
                    )}
                </section>

                <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Mark payout as paid</DialogTitle>
                            <DialogDescription>{payTarget && `${usd(payTarget.amount)} to ${payTarget.sellerName}. Do this after the transfer has been made; the seller is emailed the reference.`}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <Label htmlFor="ref">Transfer reference</Label>
                            <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank transaction ID" />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
                            <Button onClick={() => pay.mutate()} disabled={!reference.trim() || pay.isPending}>{pay.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Mark paid</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!rateSeller} onOpenChange={(o) => !o && setRateSeller(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Commission for {rateSeller?.name}</DialogTitle>
                            <DialogDescription>Leave empty to use the default ({commission?.defaultRate ?? '…'}%). Applies to this seller&apos;s new bookings.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <Label htmlFor="srate">Rate (%)</Label>
                            <Input id="srate" type="number" min="0" max="100" step="0.5" value={sellerRate} onChange={(e) => setSellerRate(e.target.value)} placeholder="Default" />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRateSeller(null)}>Cancel</Button>
                            <Button onClick={() => rateSeller && saveSeller.mutate({ id: rateSeller.sellerId, value: sellerRate === '' ? null : Number(sellerRate) })} disabled={saveSeller.isPending}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminGuard>
    );
}
