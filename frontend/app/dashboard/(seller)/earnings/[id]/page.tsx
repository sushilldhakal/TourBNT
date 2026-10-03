'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { SellerGuard } from '@/components/dashboard/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPayoutStatement } from '@/lib/api/payouts';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One payout, itemised: every booking in it with the commission taken. Printable (Print / Save as PDF). */
export default function PayoutStatementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: p, isLoading, error } = useQuery({ queryKey: ['payout-statement', id], queryFn: () => getPayoutStatement(id) });

    return (
        <SellerGuard>
            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <div className="flex items-center justify-between print:hidden">
                    <Link href="/dashboard/earnings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Earnings</Link>
                    <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print / save as PDF</Button>
                </div>

                {isLoading ? <p className="text-muted-foreground">Loading…</p> : error || !p ? (
                    <p className="text-destructive">{(error as Error)?.message ?? 'Statement not found.'}</p>
                ) : (
                    <Card>
                        <CardContent className="p-6 sm:p-8 space-y-6">
                            <div className="flex flex-wrap justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">TourBNT</p>
                                    <h1 className="text-2xl font-bold">Payout statement</h1>
                                    <p className="text-sm text-muted-foreground mt-1">Statement ID {p.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <div className="text-sm text-right space-y-0.5">
                                    <p><span className="text-muted-foreground">Seller:</span> <strong>{p.sellerName}</strong></p>
                                    <p className="text-muted-foreground">{p.sellerEmail}</p>
                                    <p><span className="text-muted-foreground">Created:</span> {format(new Date(p.createdAt), 'd MMM yyyy')}</p>
                                    <p><span className="text-muted-foreground">Status:</span> <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status === 'paid' ? `Paid ${p.paidAt ? format(new Date(p.paidAt), 'd MMM yyyy') : ''}` : 'Awaiting transfer'}</Badge></p>
                                    {p.reference && <p><span className="text-muted-foreground">Transfer reference:</span> {p.reference}</p>}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Booking</TableHead><TableHead>Tour</TableHead><TableHead>Departure</TableHead>
                                            <TableHead className="text-right">Booking total</TableHead><TableHead className="text-right">Commission</TableHead><TableHead className="text-right">You earn</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {p.items.map((i) => (
                                            <TableRow key={i.id}>
                                                <TableCell className="font-mono text-xs">{i.bookingReference}<div className="font-sans text-muted-foreground">{i.contactName}</div></TableCell>
                                                <TableCell>{i.tourTitle}</TableCell>
                                                <TableCell className="whitespace-nowrap">{format(new Date(i.departureDate), 'd MMM yyyy')}</TableCell>
                                                <TableCell className="text-right">{usd(i.total)}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">−{usd(i.commissionAmount)}{i.commissionRate != null ? ` (${i.commissionRate}%)` : ''}</TableCell>
                                                <TableCell className="text-right font-medium">{usd(i.sellerEarning)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={3} className="font-semibold">{p.items.length} booking{p.items.length === 1 ? '' : 's'}</TableCell>
                                            <TableCell className="text-right">{usd(p.items.reduce((n, i) => n + i.total, 0))}</TableCell>
                                            <TableCell className="text-right">−{usd(p.items.reduce((n, i) => n + i.commissionAmount, 0))}</TableCell>
                                            <TableCell className="text-right text-base font-bold">{usd(p.amount)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                            {p.notes && <p className="text-sm text-muted-foreground">Note: {p.notes}</p>}
                            <p className="text-xs text-muted-foreground">Amounts are in US dollars. Commission is the platform fee on each booking at the rate that applied when it was made.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </SellerGuard>
    );
}
