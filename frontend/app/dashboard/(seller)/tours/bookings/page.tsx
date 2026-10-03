'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import Link from 'next/link';
import { CalendarCheck, Search, MoreHorizontal, Users, DollarSign, Wallet, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { PaginationControls } from '@/components/dashboard/shared/PaginationControls';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { getBookingsPage, type BookingStatRow, type BookingStatus, type ManagedBooking, type PaymentStatus } from '@/lib/api/adminLists';
import { getBookingStats, updateBookingStatus, updatePaymentStatus } from '@/lib/api/bookings';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

const STATUS_TABS: Array<{ key: 'all' | BookingStatus; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
];

// `!text-*` because Badge's own text-foreground would otherwise win.
const BOOKING_STYLE: Record<BookingStatus, string> = {
    pending: 'bg-amber-500/15 border-amber-500/30 !text-amber-700 dark:!text-amber-300',
    confirmed: 'bg-emerald-500/15 border-emerald-500/30 !text-emerald-700 dark:!text-emerald-300',
    completed: 'bg-blue-500/15 border-blue-500/30 !text-blue-700 dark:!text-blue-300',
    cancelled: 'bg-red-500/15 border-red-500/30 !text-red-700 dark:!text-red-300',
};
const PAYMENT_STYLE: Record<PaymentStatus, string> = {
    unpaid: 'bg-red-500/15 border-red-500/30 !text-red-700 dark:!text-red-300',
    partial: 'bg-amber-500/15 border-amber-500/30 !text-amber-700 dark:!text-amber-300',
    paid: 'bg-emerald-500/15 border-emerald-500/30 !text-emerald-700 dark:!text-emerald-300',
    refunded: 'bg-zinc-500/15 border-zinc-500/30 !text-zinc-600 dark:!text-zinc-300',
};

const money = (n: number, currency = 'USD') => `${currency === 'USD' ? '$' : `${currency} `}${Math.round(n).toLocaleString()}`;
const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm';

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <Card>
            <CardContent className="py-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xl font-semibold leading-none">{value}</p><p className="text-sm text-muted-foreground mt-1">{label}</p></div>
            </CardContent>
        </Card>
    );
}

export default function TourBookingsPage() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<'all' | BookingStatus>('all');
    const [paymentStatus, setPaymentStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const q = useDebouncedValue(search.trim());

    const stats = useQuery({ queryKey: ['bookings', 'stats'], // extractResponseData leaves array payloads wrapped in the { success, data } envelope.
        queryFn: async (): Promise<BookingStatRow[]> => {
            const res = (await getBookingStats()) as unknown;
            return Array.isArray(res) ? res : ((res as { data?: BookingStatRow[] })?.data ?? []);
        }, staleTime: 15_000 });
    const list = useQuery({
        queryKey: ['bookings', 'page', { status, paymentStatus, q, page, limit }],
        queryFn: () => getBookingsPage({ status, paymentStatus, q, page, limit }),
        placeholderData: keepPreviousData,
    });

    const statRows = Array.isArray(stats.data) ? stats.data : [];
    const byStatus = (s: BookingStatus) => statRows.find((r) => r._id === s);
    const totalCount = statRows.reduce((n, r) => n + r.count, 0);
    const liveRows = statRows.filter((r) => r._id !== 'cancelled');
    const revenue = liveRows.reduce((n, r) => n + r.totalRevenue, 0);
    const collected = statRows.reduce((n, r) => n + r.paidRevenue, 0);

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['bookings'] });
    const statusMutation = useMutation({
        mutationFn: ({ id, next }: { id: string; next: BookingStatus }) => updateBookingStatus(id, next),
        onSuccess: () => { toast({ title: 'Booking updated' }); refresh(); },
        onError: (e: Error) => toast({ title: 'Could not update booking', description: e.message, variant: 'destructive' }),
    });
    const paymentMutation = useMutation({
        mutationFn: ({ b, next }: { b: ManagedBooking; next: PaymentStatus }) =>
            updatePaymentStatus(b.id, next, next === 'paid' ? b.pricing.totalPrice : next === 'unpaid' ? 0 : undefined),
        onSuccess: () => { toast({ title: 'Payment updated' }); refresh(); },
        onError: (e: Error) => toast({ title: 'Could not update payment', description: e.message, variant: 'destructive' }),
    });

    const rows = list.data?.items ?? [];
    const pagination = list.data?.pagination;
    const countFor = (k: 'all' | BookingStatus) => (k === 'all' ? totalCount : byStatus(k)?.count ?? 0);

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={CalendarCheck}
                badge="Tours"
                title="Tour Bookings"
                description="Every booking made on the tours you can manage"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatTile icon={Users} label="Total bookings" value={String(totalCount)} />
                <StatTile icon={Clock} label="Awaiting confirmation" value={String(byStatus('pending')?.count ?? 0)} />
                <StatTile icon={DollarSign} label="Booked revenue" value={money(revenue)} />
                <StatTile icon={Wallet} label="Collected" value={money(collected)} />
            </div>

            <Tabs value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
                <TabsList className="h-auto flex-wrap justify-start gap-1">
                    {STATUS_TABS.map((t) => (
                        <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                            {t.label}
                            <span className="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">{countFor(t.key)}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="search" placeholder="Search reference, traveller or tour…" className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                        </div>
                        <select className={selectClass} value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} aria-label="Payment status">
                            <option value="all">All payments</option>
                            {(['unpaid', 'partial', 'paid', 'refunded'] as const).map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                        </select>
                    </div>

                    {list.isError ? (
                        <p className="text-sm text-destructive">{list.error instanceof Error ? list.error.message : 'Failed to load bookings.'}</p>
                    ) : list.isLoading ? (
                        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                    ) : rows.length === 0 ? (
                        <EmptyState icon={<CalendarCheck className="h-14 w-14" />} title="No bookings found" description="Try a different status, payment filter or search." />
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Tour</TableHead>
                                        <TableHead>Traveller</TableHead>
                                        <TableHead>Departure</TableHead>
                                        <TableHead className="text-right">Total / paid</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((b) => {
                                        const pax = b.participants.adults + b.participants.children + b.participants.infants;
                                        return (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-mono text-xs whitespace-nowrap">{b.bookingReference}<div className="font-sans text-muted-foreground">{format(new Date(b.bookingDate), 'MMM dd, yyyy')}</div></TableCell>
                                                <TableCell><div className="font-medium">{b.tourTitle}</div><div className="text-xs text-muted-foreground">{b.tourCode}</div></TableCell>
                                                <TableCell>
                                                    <div className="font-medium flex items-center gap-1.5">{b.contactName}{b.isGuestBooking && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Guest</Badge>}</div>
                                                    <div className="text-xs text-muted-foreground">{b.contactEmail}</div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {format(new Date(b.departureDate), 'MMM dd, yyyy')}
                                                    <div className="text-xs text-muted-foreground" title={`${b.participants.adults} adults, ${b.participants.children} children, ${b.participants.infants} infants`}>{pax} traveller{pax === 1 ? '' : 's'}</div>
                                                </TableCell>
                                                <TableCell className="text-right text-sm whitespace-nowrap">{money(b.pricing.totalPrice, b.pricing.currency)}<div className="text-xs text-muted-foreground">{money(b.paidAmount, b.pricing.currency)} paid</div></TableCell>
                                                <TableCell><Badge variant="outline" className={`capitalize ${BOOKING_STYLE[b.status]}`}>{b.status}</Badge></TableCell>
                                                <TableCell><Badge variant="outline" className={`capitalize ${PAYMENT_STYLE[b.paymentStatus]}`}>{b.paymentStatus}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Booking actions"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Booking status</DropdownMenuLabel>
                                                            {(['confirmed', 'completed', 'cancelled'] as const).filter((s) => s !== b.status).map((s) => (
                                                                <DropdownMenuItem key={s} className="capitalize" onClick={() => statusMutation.mutate({ id: b.id, next: s })}>Mark {s}</DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuLabel>Payment</DropdownMenuLabel>
                                                            {(['paid', 'partial', 'unpaid', 'refunded'] as const).filter((p) => p !== b.paymentStatus).map((p) => (
                                                                <DropdownMenuItem key={p} className="capitalize" onClick={() => paymentMutation.mutate({ b, next: p })}>Mark {p}</DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem asChild><Link href={`/booking/${b.id}/invoice`}>View invoice</Link></DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {pagination && (
                        <PaginationControls
                            page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} limit={pagination.limit}
                            onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} isFetching={list.isFetching && !list.isLoading}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
