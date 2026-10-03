'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getBookingInvoice, type BookingInvoice } from '@/lib/api/bookings';

const money = (n: number, currency: string) =>
    n.toLocaleString('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d: string | null | undefined) => (d ? format(new Date(d), 'd MMM yyyy') : '');

const PAYMENT_TERMS: Record<BookingInvoice['paymentType'], string> = {
    full_payment: 'Full payment',
    deposit_percentage: 'Deposit now, balance later',
    pay_on_arrival: 'Pay on arrival',
};

function paymentBadge(inv: BookingInvoice): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
    if (inv.status === 'cancelled') return { label: inv.paymentStatus === 'refunded' ? 'Cancelled · refunded' : 'Cancelled', variant: 'destructive' };
    if (inv.paymentStatus === 'paid') return { label: 'Paid', variant: 'default' };
    if (inv.paymentStatus === 'partial') return { label: 'Part paid', variant: 'outline' };
    if (inv.paymentStatus === 'refunded') return { label: 'Refunded', variant: 'secondary' };
    return { label: 'Unpaid', variant: 'secondary' };
}

/** A booking's invoice for the traveller. Printable (Print / Save as PDF). */
export default function InvoicePage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = use(params);
    const { data: inv, isLoading, error } = useQuery({ queryKey: ['booking-invoice', bookingId], queryFn: () => getBookingInvoice(bookingId) });

    return (
        <div className="container mx-auto py-12 px-4 max-w-4xl space-y-6">
            <div className="flex items-center justify-between print:hidden">
                <Link href={`/booking/${bookingId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />Booking details
                </Link>
                <Button variant="outline" onClick={() => window.print()} disabled={!inv}><Printer className="h-4 w-4 mr-2" />Print / save as PDF</Button>
            </div>

            {isLoading ? <p className="text-muted-foreground">Loading…</p> : error || !inv ? (
                <p className="text-destructive">{(error as Error)?.message ?? 'Invoice not found.'}</p>
            ) : (
                <Card data-print-root>
                    <CardContent className="p-6 sm:p-8 space-y-8">
                        <div className="flex flex-wrap justify-between gap-6">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">TourBNT</p>
                                <h1 className="text-2xl font-bold">Invoice</h1>
                                <p className="text-sm text-muted-foreground mt-1 font-mono">{inv.invoiceNumber}</p>
                            </div>
                            <div className="text-sm sm:text-right space-y-0.5">
                                <p><span className="text-muted-foreground">Issued:</span> {day(inv.issuedAt)}</p>
                                <p><span className="text-muted-foreground">Booking:</span> <span className="font-mono">{inv.bookingReference}</span></p>
                                <p><Badge variant={paymentBadge(inv).variant}>{paymentBadge(inv).label}</Badge></p>
                            </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 text-sm">
                            <div className="space-y-0.5">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Billed to</p>
                                <p className="font-medium">{inv.billTo.name}</p>
                                <p>{inv.billTo.email}</p>
                                {inv.billTo.phone && <p>{inv.billTo.phone}</p>}
                                {inv.billTo.country && <p>{inv.billTo.country}</p>}
                            </div>
                            {inv.seller && (
                                <div className="space-y-0.5">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Tour operator</p>
                                    <p className="font-medium">{inv.seller.name}</p>
                                    {inv.seller.address && <p>{inv.seller.address}</p>}
                                    <p>{inv.seller.email}</p>
                                    {inv.seller.phone && <p>{inv.seller.phone}</p>}
                                    {inv.seller.registrationNumber && <p className="text-muted-foreground">Registration no. {inv.seller.registrationNumber}</p>}
                                    {inv.seller.taxId && <p className="text-muted-foreground">Tax ID {inv.seller.taxId}</p>}
                                </div>
                            )}
                        </div>

                        <div className="text-sm rounded-lg border border-border p-4 grid gap-3 sm:grid-cols-3">
                            <div><p className="text-xs text-muted-foreground">Tour</p><p className="font-medium">{inv.tour.title}</p>{inv.tour.code && <p className="text-xs text-muted-foreground font-mono">{inv.tour.code}</p>}</div>
                            <div><p className="text-xs text-muted-foreground">Departure</p><p className="font-medium">{day(inv.departureDate)}</p></div>
                            <div><p className="text-xs text-muted-foreground">Payment terms</p><p className="font-medium">{PAYMENT_TERMS[inv.paymentType] ?? inv.paymentType}</p></div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Unit price</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inv.lines.map((l, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{l.description}</TableCell>
                                            <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                                            <TableCell className="text-right tabular-nums">{money(l.unitPrice, inv.currency)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{money(l.amount, inv.currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {inv.promo && (
                                        <TableRow>
                                            <TableCell colSpan={3}>Promo code <span className="font-mono">{inv.promo.code}</span></TableCell>
                                            <TableCell className="text-right tabular-nums">−{money(inv.promo.amount, inv.currency)}</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                                        <TableCell className="text-right text-base font-bold tabular-nums">{money(inv.total, inv.currency)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={3}>
                                            Paid{inv.paidAt ? ` on ${day(inv.paidAt)}` : ''}{inv.paymentMethod ? ` by ${inv.paymentMethod.replace(/_/g, ' ')}` : ''}
                                            {inv.transactionId && <span className="block text-xs text-muted-foreground font-normal">Transaction {inv.transactionId}</span>}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{money(inv.amountPaid, inv.currency)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={3} className="font-semibold">Balance due</TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums">{money(inv.balanceDue, inv.currency)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                            {inv.status === 'cancelled' && <p>This booking was cancelled{inv.cancelledAt ? ` on ${day(inv.cancelledAt)}` : ''}. Any refund follows the cancellation and refund policy.</p>}
                            {inv.status !== 'cancelled' && inv.paymentType === 'deposit_percentage' && inv.balanceDue > 0 && (
                                <p>Deposit of {inv.depositPercentage ?? ''}% ({money(inv.amountDueNow, inv.currency)}) due when booking; the remaining {money(inv.amountDueLater, inv.currency)} is due before departure.</p>
                            )}
                            {inv.status !== 'cancelled' && inv.paymentType === 'pay_on_arrival' && inv.balanceDue > 0 && <p>The balance is paid to the tour operator on arrival.</p>}
                            <p>Amounts are in {inv.currency}. Booked through TourBNT; the tour is provided by the tour operator named above.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
