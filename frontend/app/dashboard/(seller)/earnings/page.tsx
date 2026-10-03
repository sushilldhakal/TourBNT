'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Banknote, Clock, Hourglass, Wallet } from 'lucide-react';
import { SellerGuard } from '@/components/dashboard/RoleGuard';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getEarningsSummary, getMyPayouts } from '@/lib/api/payouts';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Tile({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint: string }) {
    return (
        <Card>
            <CardContent className="py-5 flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
                <div className="min-w-0">
                    <p className="text-2xl font-semibold leading-none">{value}</p>
                    <p className="text-sm font-medium mt-1">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function EarningsPage() {
    const { data: s, isLoading } = useQuery({ queryKey: ['earnings-summary'], queryFn: getEarningsSummary });
    const { data: payouts = [] } = useQuery({ queryKey: ['my-payouts'], queryFn: getMyPayouts });

    return (
        <SellerGuard>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <DashboardCardHeader
                    variant="compact"
                    icon={Banknote}
                    badge="Earnings"
                    title="Earnings and payouts"
                    description={s ? `Your earnings are each paid booking minus TourBNT's ${s.commissionRate}% commission. A booking becomes payable the day after the trip.` : 'What you have earned and what has been paid out.'}
                />

                {isLoading || !s ? (
                    <p className="text-muted-foreground">Loading…</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Tile icon={Wallet} label="Ready for payout" value={usd(s.payable.amount)} hint={`${s.payable.bookings} finished trip${s.payable.bookings === 1 ? '' : 's'}, paid in full`} />
                        <Tile icon={Hourglass} label="Upcoming" value={usd(s.upcoming.amount)} hint={`${s.upcoming.bookings} paid booking${s.upcoming.bookings === 1 ? '' : 's'}, trip not finished`} />
                        <Tile icon={Clock} label="Being paid" value={usd(s.inPendingPayouts)} hint="In a payout awaiting transfer" />
                        <Tile icon={Banknote} label="Paid out" value={usd(s.paidOut)} hint="Transferred to you so far" />
                    </div>
                )}

                <div>
                    <h2 className="text-lg font-semibold mb-3">Payouts</h2>
                    {payouts.length === 0 ? (
                        <EmptyState icon={<Banknote className="h-8 w-8" />} title="No payouts yet" description="When a trip is over and paid for, TourBNT gathers your earnings into a payout and transfers it to your bank account. It will appear here with a statement." />
                    ) : (
                        <Card>
                            <CardContent className="p-0 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>Date</TableHead><TableHead>Bookings</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Reference</TableHead><TableHead /></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payouts.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell>{format(new Date(p.paidAt ?? p.createdAt), 'd MMM yyyy')}</TableCell>
                                                <TableCell>{p.bookingCount}</TableCell>
                                                <TableCell className="text-right font-medium">{usd(p.amount)}</TableCell>
                                                <TableCell><Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status === 'paid' ? 'Paid' : 'Awaiting transfer'}</Badge></TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{p.reference ?? '—'}</TableCell>
                                                <TableCell className="text-right"><Link className="text-primary hover:underline text-sm" href={`/dashboard/earnings/${p.id}`}>Statement</Link></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </SellerGuard>
    );
}
