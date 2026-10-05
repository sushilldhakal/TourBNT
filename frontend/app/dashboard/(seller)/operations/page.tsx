'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { BellRing, Gauge, Building2, Utensils, Compass, Truck, AlertCircle, AlertTriangle, CheckCircle2, Search, ListChecks, Plane, Store, CalendarRange } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SellerGuard } from '@/components/dashboard/RoleGuard';
import { AttentionBoard } from '@/components/dashboard/operations/AttentionBoard';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/config/roles';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { PaginationControls } from '@/components/dashboard/shared/PaginationControls';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useOperationsSummary } from '@/lib/queries';
import {
    getOperationsRequestsPage,
    getOperationsSuppliersPage,
    getOperationsTripsPage,
    type PagedResult,
} from '@/lib/api/adminLists';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

// ---------------------------------------------------------------------------
// shared bits
// ---------------------------------------------------------------------------
function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
    return (
        <Card>
            <CardContent className="py-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-2xl font-semibold leading-none">{value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function AlertRow({ severity, label, count }: { severity: 'critical' | 'warning' | 'good'; label: string; count: number }) {
    const meta = {
        critical: { icon: AlertCircle, className: 'status-pill--critical' },
        warning: { icon: AlertTriangle, className: 'status-pill--warning' },
        good: { icon: CheckCircle2, className: 'status-pill--good' },
    }[severity];
    const Icon = meta.icon;
    return (
        <div className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${meta.className}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium">{count}</span>
            <span>{label}</span>
        </div>
    );
}

const REQUEST_STATUS_STYLE: Record<string, string> = {
    pending: 'status-pill status-pill--pending',
    held: 'status-pill status-pill--held',
    confirmed: 'status-pill status-pill--confirmed',
    countered: 'status-pill status-pill--countered',
    declined: 'status-pill status-pill--declined',
    expired: 'status-pill status-pill--expired',
};

const ROLE_LABEL: Record<string, string> = { transport: 'Transport', accommodation: 'Accommodation', guide: 'Guide', meals: 'Meals', other: 'Other' };

const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm';

/** Search box + optional extra filters, all resetting to page 1 on change. */
function Toolbar({ search, onSearch, placeholder, children }: { search: string; onSearch: (v: string) => void; placeholder: string; children?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder={placeholder} className="pl-8" value={search} onChange={(e) => onSearch(e.target.value)} />
            </div>
            {children}
        </div>
    );
}

/** The loading / empty / table / pagination scaffold every tab shares. */
function PagedTable<T>({
    query, onPage, onLimit, emptyTitle, head, row,
}: {
    query: { data?: PagedResult<T>; isLoading: boolean; isFetching: boolean; isError: boolean; error: unknown };
    onPage: (p: number) => void; onLimit: (l: number) => void;
    emptyTitle: string; head: React.ReactNode; row: (item: T) => React.ReactNode;
}) {
    const items = query.data?.items ?? [];
    const pg = query.data?.pagination;
    if (query.isError) return <p className="text-sm text-destructive">{query.error instanceof Error ? query.error.message : 'Failed to load.'}</p>;
    if (query.isLoading) return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
    if (items.length === 0) return <EmptyState icon={<ListChecks className="h-14 w-14" />} title={emptyTitle} description="Try changing the filters or search." />;
    return (
        <>
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader><TableRow>{head}</TableRow></TableHeader>
                    <TableBody>{items.map(row)}</TableBody>
                </Table>
            </div>
            {pg && (
                <PaginationControls
                    page={pg.page} totalPages={pg.totalPages} totalItems={pg.totalItems} limit={pg.limit}
                    onPageChange={onPage} onLimitChange={(l) => { onLimit(l); onPage(1); }} isFetching={query.isFetching && !query.isLoading}
                />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// tabs
// ---------------------------------------------------------------------------
function OverviewTab() {
    const { data, isLoading } = useOperationsSummary();
    if (isLoading || !data) return <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatTile icon={Gauge} label="Active Trips" value={data.activeTrips} />
                <StatTile icon={Building2} label="Hotels" value={data.partnerCounts.hotels} />
                <StatTile icon={Utensils} label="Restaurants" value={data.partnerCounts.restaurants} />
                <StatTile icon={Compass} label="Guides" value={data.partnerCounts.guides} />
                <StatTile icon={Truck} label="Vehicles" value={data.partnerCounts.vehicles} />
            </div>
            <Card>
                <CardContent className="py-5 space-y-2">
                    <p className="text-sm font-medium mb-1">Alerts</p>
                    <AlertRow severity="critical" label="supplier confirmations missing" count={data.alerts.missingConfirmations} />
                    <AlertRow severity="warning" label="hotel requests unavailable (declined/expired)" count={data.alerts.hotelUnavailable} />
                    <AlertRow severity="warning" label="transport requests unavailable (declined/expired)" count={data.alerts.transportMissing} />
                    <AlertRow severity="critical" label="guides declined" count={data.alerts.guidesCancelled} />
                    <AlertRow severity="good" label="bookings confirmed" count={data.alerts.bookingsConfirmed} />
                </CardContent>
            </Card>
        </div>
    );
}

function RequestsTab() {
    const [status, setStatus] = useState('all');
    const [role, setRole] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const q = useDebouncedValue(search.trim());
    const query = useQuery({
        queryKey: ['operations', 'requests', { status, role, q, page, limit }],
        queryFn: () => getOperationsRequestsPage({ status, role, q, page, limit }),
        placeholderData: keepPreviousData,
    });
    const counts = query.data?.counts ?? {};

    return (
        <div className="space-y-4">
            <Toolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search tour or supplier…">
                <select className={selectClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
                    <option value="all">All statuses</option>
                    {Object.keys(REQUEST_STATUS_STYLE).map((s) => <option key={s} value={s} className="capitalize">{s} ({counts[s] ?? 0})</option>)}
                </select>
                <select className={selectClass} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Service type">
                    <option value="all">All services</option>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </Toolbar>
            <PagedTable
                query={query} onPage={setPage} onLimit={setLimit} emptyTitle="No supplier requests"
                head={<><TableHead>Service date</TableHead><TableHead>Trip</TableHead><TableHead>Supplier</TableHead><TableHead>Service</TableHead><TableHead>Units</TableHead><TableHead>Status</TableHead><TableHead>Deadline / notes</TableHead></>}
                row={(r) => (
                    <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm">{format(new Date(r.serviceDate), 'MMM dd, yyyy')}{r.serviceTime ? <span className="text-muted-foreground"> · {r.serviceTime}</span> : null}</TableCell>
                        <TableCell><Link href={`/dashboard/tours`} className="font-medium hover:underline">{r.tourTitle}</Link><div className="text-xs text-muted-foreground">{r.tourCode}</div></TableCell>
                        <TableCell><div className="font-medium">{r.partnerName}</div><div className="text-xs text-muted-foreground capitalize">{r.partnerType}</div></TableCell>
                        <TableCell className="text-sm">{ROLE_LABEL[r.role] ?? r.role}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{r.unitsRequested ? `${r.unitsRequested}${r.unitType ? ` × ${r.unitType}` : ''}` : '—'}{r.capacityConfirmed != null && <div className="text-xs text-muted-foreground">confirmed {r.capacityConfirmed}</div>}</TableCell>
                        <TableCell><Badge variant="outline" className={`capitalize ${REQUEST_STATUS_STYLE[r.status]}`}>{r.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                            {r.status === 'pending' && r.respondByAt && `Respond by ${format(new Date(r.respondByAt), 'MMM dd, HH:mm')}`}
                            {r.status === 'held' && r.holdExpiresAt && `Hold expires in ${formatDistanceToNowStrict(new Date(r.holdExpiresAt))}`}
                            {r.status === 'countered' && `Counter: ${r.counterUnits ?? '?'} units${r.counterDate ? ` on ${r.counterDate}` : ''}`}
                            {(r.status === 'declined' || r.status === 'confirmed') && (r.responseNotes ?? '')}
                            {r.status === 'expired' && 'No response before deadline'}
                        </TableCell>
                    </TableRow>
                )}
            />
        </div>
    );
}

function TripsTab() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const q = useDebouncedValue(search.trim());
    const query = useQuery({
        queryKey: ['operations', 'trips', { q, page, limit }],
        queryFn: () => getOperationsTripsPage({ q, page, limit }),
        placeholderData: keepPreviousData,
    });
    return (
        <div className="space-y-4">
            <Toolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search trip or code…" />
            <PagedTable
                query={query} onPage={setPage} onLimit={setLimit} emptyTitle="No upcoming trips"
                head={<><TableHead>Departure</TableHead><TableHead>Trip</TableHead><TableHead>Destination</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Travellers</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead>Supplier confirmations</TableHead></>}
                row={(t) => {
                    const pct = t.requestsTotal ? Math.round((t.requestsConfirmed / t.requestsTotal) * 100) : 0;
                    return (
                        <TableRow key={`${t.tourId}-${t.departure}`}>
                            <TableCell className="whitespace-nowrap text-sm font-medium">{format(new Date(t.departure), 'EEE, MMM dd yyyy')}</TableCell>
                            <TableCell><div className="font-medium">{t.title}</div><div className="text-xs text-muted-foreground">{t.code}</div></TableCell>
                            <TableCell className="text-sm">{t.destination ?? '—'}</TableCell>
                            <TableCell className="text-right text-sm">{t.bookings} <span className="text-xs text-muted-foreground">({t.confirmedBookings} confirmed)</span></TableCell>
                            <TableCell className="text-right text-sm">{t.pax}</TableCell>
                            <TableCell className="text-right text-sm">${Math.round(t.revenue).toLocaleString()}</TableCell>
                            <TableCell className="min-w-[180px]">
                                {t.requestsTotal === 0 ? <span className="text-xs text-muted-foreground">No suppliers linked</span> : (
                                    <div className="space-y-1">
                                        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full ${pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} /></div>
                                        <div className="text-xs text-muted-foreground">{t.requestsConfirmed}/{t.requestsTotal} confirmed{t.requestsProblem ? <span className="text-red-600"> · {t.requestsProblem} problem</span> : null}</div>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                }}
            />
        </div>
    );
}

const SUPPLIER_TYPES = [
    { key: 'all', label: 'All suppliers' }, { key: 'hotel', label: 'Hotels' }, { key: 'guesthouse', label: 'Guesthouses' },
    { key: 'restaurant', label: 'Restaurants' }, { key: 'guide', label: 'Guides' }, { key: 'transport', label: 'Transport' },
];

function SuppliersTab() {
    const [type, setType] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const q = useDebouncedValue(search.trim());
    const query = useQuery({
        queryKey: ['operations', 'suppliers', { type, q, page, limit }],
        queryFn: () => getOperationsSuppliersPage({ type, q, page, limit }),
        placeholderData: keepPreviousData,
    });
    const counts = query.data?.counts ?? {};
    return (
        <div className="space-y-4">
            <Toolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search supplier…">
                <select className={selectClass} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Supplier type">
                    {SUPPLIER_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}{t.key !== 'all' ? ` (${counts[t.key] ?? 0})` : ''}</option>)}
                </select>
            </Toolbar>
            <PagedTable
                query={query} onPage={setPage} onLimit={setLimit} emptyTitle="No suppliers found"
                head={<><TableHead>Supplier</TableHead><TableHead>Type</TableHead><TableHead>City</TableHead><TableHead className="text-right">Inventory</TableHead><TableHead className="text-right">Open requests</TableHead><TableHead className="text-right">Confirmed</TableHead><TableHead className="text-right">Declined / expired</TableHead></>}
                row={(s) => (
                    <TableRow key={s.id}>
                        <TableCell><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.email}</div></TableCell>
                        <TableCell className="capitalize text-sm">{s.type}</TableCell>
                        <TableCell className="text-sm">{s.city ?? '—'}</TableCell>
                        <TableCell className="text-right text-sm whitespace-nowrap">{s.totalUnits ? `${s.totalUnits} ${s.unitLabel}${s.totalUnits === 1 ? '' : 's'}` : '—'}</TableCell>
                        <TableCell className="text-right text-sm">{s.openRequests ? <Badge variant="outline" className={REQUEST_STATUS_STYLE.held}>{s.openRequests}</Badge> : 0}</TableCell>
                        <TableCell className="text-right text-sm">{s.confirmedRequests}</TableCell>
                        <TableCell className="text-right text-sm">{s.problemRequests ? <span className="text-red-600 font-medium">{s.problemRequests}</span> : 0}</TableCell>
                    </TableRow>
                )}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
/**
 * Operations. Sellers: what needs attention across all their published tours (suppliers who haven't confirmed,
 * proposed a change or declined), soonest first. Admins: the same board across every seller, plus the
 * portfolio-wide overview, request, trip and supplier tabs.
 */
export default function OperationsPage() {
    const { user } = useAuth();
    const admin = isAdmin(user.roles);
    return (
        <SellerGuard>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <DashboardCardHeader
                    variant="compact"
                    icon={admin ? Gauge : BellRing}
                    badge="Operations"
                    title={admin ? "Today's Operations" : 'Needs attention'}
                    description={admin
                        ? 'A live snapshot across every trip and supplier — the control center for TourBNT staff.'
                        : 'Hotels, guesthouses, restaurants, guides and transport on your upcoming tours that haven\'t confirmed yet, soonest first. Call them, accept a proposed change, ask again or swap the supplier. The same actions are on each tour\'s itinerary.'}
                    actions={(
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/operations/timeline"><CalendarRange className="h-4 w-4" /> Tour timeline</Link>
                        </Button>
                    )}
                />

                {admin ? (
                    <Tabs defaultValue="attention" className="space-y-4">
                        <TabsList className="h-auto flex-wrap justify-start gap-1">
                            <TabsTrigger value="attention" className="gap-1.5"><BellRing className="h-4 w-4" />Needs attention</TabsTrigger>
                            <TabsTrigger value="overview" className="gap-1.5"><Gauge className="h-4 w-4" />Overview</TabsTrigger>
                            <TabsTrigger value="requests" className="gap-1.5"><ListChecks className="h-4 w-4" />Supplier requests</TabsTrigger>
                            <TabsTrigger value="trips" className="gap-1.5"><Plane className="h-4 w-4" />Upcoming trips</TabsTrigger>
                            <TabsTrigger value="suppliers" className="gap-1.5"><Store className="h-4 w-4" />Suppliers</TabsTrigger>
                        </TabsList>
                        {/* Radix unmounts inactive tab content, so each tab only fetches once opened. */}
                        <TabsContent value="attention"><AttentionBoard /></TabsContent>
                        <TabsContent value="overview"><OverviewTab /></TabsContent>
                        <TabsContent value="requests"><RequestsTab /></TabsContent>
                        <TabsContent value="trips"><TripsTab /></TabsContent>
                        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
                    </Tabs>
                ) : (
                    <AttentionBoard />
                )}
            </div>
        </SellerGuard>
    );
}
