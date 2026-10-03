'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, BedDouble, CheckCircle2, Clock, Compass, ExternalLink, Mail, Phone, Repeat2, RotateCcw, Search, Truck, Utensils, XCircle, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { PaginationControls } from '@/components/dashboard/shared/PaginationControls';
import { ReplaceSupplierPopover } from '@/components/dashboard/tours/LogisticsStatusPanel';
import { getOperationsAttention, type AttentionRow } from '@/lib/api/adminLists';
import { reopenItineraryPartnerRequest, replaceItineraryPartner, respondToItineraryCounterOffer } from '@/lib/api/tours';
import type { BusinessPartner } from '@/lib/api/businessPartners';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

const KEY = ['operations-attention'];

const STATUS: Record<AttentionRow['status'], { label: string; hint: string; icon: LucideIcon; className: string }> = {
    declined: { label: 'Declined', hint: 'The supplier said no. Replace them or ask again.', icon: XCircle, className: 'status-pill status-pill--declined' },
    expired: { label: 'No reply', hint: 'The request expired without an answer. Call them, ask again, or replace them.', icon: XCircle, className: 'status-pill status-pill--expired' },
    countered: { label: 'Change proposed', hint: 'The supplier proposed something different. Accept or decline it.', icon: Repeat2, className: 'status-pill status-pill--countered' },
    pending: { label: 'Waiting for reply', hint: 'Requested, not answered yet.', icon: Clock, className: 'status-pill status-pill--pending' },
    held: { label: 'Held, not confirmed', hint: 'The supplier is holding it but hasn\'t confirmed.', icon: Clock, className: 'status-pill status-pill--held' },
};

const ROLE: Record<AttentionRow['role'], { label: string; icon: LucideIcon }> = {
    accommodation: { label: 'Stay', icon: BedDouble },
    meals: { label: 'Meal', icon: Utensils },
    guide: { label: 'Guide', icon: Compass },
    transport: { label: 'Transport', icon: Truck },
    other: { label: 'Other', icon: Compass },
};

const FILTERS: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All open' },
    { key: 'declined', label: 'Declined' },
    { key: 'expired', label: 'No reply' },
    { key: 'countered', label: 'Change proposed' },
    { key: 'pending', label: 'Waiting' },
    { key: 'held', label: 'Held' },
];

/** "Tomorrow", "In 3 days" … for the day headings. */
function whenLabel(daysUntil: number): string {
    if (daysUntil <= 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    return `In ${daysUntil} days`;
}

function askLabel(r: AttentionRow): string {
    const qty = r.unitsRequested > 0 ? `${r.unitsRequested} ${r.unitType || 'unit(s)'}` : null;
    const people = r.headcount > 0 ? `${r.headcount} people` : null;
    return [qty, people, r.serviceTime].filter(Boolean).join(' · ');
}

function ItemRow({ row }: { row: AttentionRow }) {
    const qc = useQueryClient();
    const refresh = () => {
        qc.invalidateQueries({ queryKey: KEY });
        // Keep the tour's own itinerary panel in step.
        qc.invalidateQueries({ queryKey: queryKeys.businessPartners.tourLogisticsStatus(row.tourId) });
    };
    const fail = (title: string) => (e: Error) => toast({ title, description: e.message, variant: 'destructive' });

    const counter = useMutation({
        mutationFn: (accept: boolean) => respondToItineraryCounterOffer(row.tourId, row.id, accept),
        onSuccess: (_d, accept) => { toast({ title: accept ? 'Change accepted' : 'Change declined' }); refresh(); },
        onError: fail('Could not respond'),
    });
    const reopen = useMutation({
        mutationFn: () => reopenItineraryPartnerRequest(row.tourId, row.id),
        onSuccess: () => { toast({ title: 'Request sent again', description: `${row.partnerName} has been asked again.` }); refresh(); },
        onError: fail('Could not ask again'),
    });
    const replace = useMutation({
        mutationFn: (p: BusinessPartner) => replaceItineraryPartner(row.tourId, row.tourItineraryPartnerId, p.id, p.name),
        onSuccess: (_d, p) => { toast({ title: 'Supplier replaced', description: `${p.name} replaces ${row.partnerName} on this tour.` }); refresh(); },
        onError: fail('Could not replace the supplier'),
    });
    const busy = counter.isPending || reopen.isPending || replace.isPending;

    const s = STATUS[row.status];
    const R = ROLE[row.role] ?? ROLE.other;
    const StatusIcon = s.icon;

    return (
        <li className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <R.icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="font-medium">{row.partnerName}</span>
                        <span className="text-sm text-muted-foreground">{R.label}{askLabel(row) ? ` · ${askLabel(row)}` : ''}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {row.tourTitle}{row.tourCode ? <span className="font-mono text-xs"> ({row.tourCode})</span> : null}
                        {row.bookedTravellers > 0 && <> · <span className="text-foreground">{row.bookedTravellers} traveller{row.bookedTravellers === 1 ? '' : 's'} booked</span></>}
                    </p>
                </div>
                <Badge variant="outline" className={`gap-1.5 shrink-0 ${s.className}`} title={s.hint}>
                    <StatusIcon className="h-3 w-3" aria-hidden="true" />{s.label}
                </Badge>
            </div>

            {row.status === 'countered' && (
                <div className="rounded-md border border-violet-300/60 bg-violet-500/10 px-3 py-2 text-sm">
                    <span className="font-medium">Proposed instead:</span>
                    {row.counterUnits != null && ` ${row.counterUnits} ${row.unitType || 'unit(s)'}`}
                    {row.counterDate && ` on ${format(parseISO(row.counterDate), 'EEE d MMM')}`}
                    {row.counterTime && ` at ${row.counterTime}`}
                    {row.counterNotes && <span className="text-muted-foreground"> — “{row.counterNotes}”</span>}
                </div>
            )}
            {row.responseNotes && row.status !== 'countered' && (
                <p className="text-sm text-muted-foreground">Supplier note: “{row.responseNotes}”</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {row.partnerPhone && (
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <a href={`tel:${row.partnerPhone.replace(/[^\d+]/g, '')}`}><Phone className="h-3.5 w-3.5" />{row.partnerPhone}</a>
                    </Button>
                )}
                {row.partnerEmail && (
                    <Button asChild size="sm" variant="ghost" className="gap-1.5">
                        <a href={`mailto:${row.partnerEmail}?subject=${encodeURIComponent(`${row.tourTitle}: ${format(parseISO(row.serviceDate), 'd MMM yyyy')}`)}`}><Mail className="h-3.5 w-3.5" />Email</a>
                    </Button>
                )}
                <span className="flex-1" />
                {row.status === 'countered' && (
                    <>
                        <Button size="sm" disabled={busy} onClick={() => counter.mutate(true)} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Accept change</Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => counter.mutate(false)}>Decline</Button>
                    </>
                )}
                {(row.status === 'declined' || row.status === 'expired') && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => reopen.mutate()} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" />Ask again</Button>
                )}
                <ReplaceSupplierPopover row={row} tourDestinationId={row.tourDestinationId ?? undefined} onReplace={(p) => replace.mutate(p)} />
                <Button asChild size="sm" variant="ghost" className="gap-1.5">
                    <Link href={`/dashboard/tours/edit/${row.tourId}`}><ExternalLink className="h-3.5 w-3.5" />Itinerary</Link>
                </Button>
            </div>
        </li>
    );
}

/**
 * Every upcoming supplier request on the seller's published tours that isn't confirmed yet, soonest day first
 * (tomorrow, then the day after …), so they can call the supplier, accept a proposed change, ask again or swap
 * the supplier from one place. The same actions exist per tour on the itinerary page.
 */
export function AttentionBoard() {
    const [status, setStatus] = useState('all');
    const [tourId, setTourId] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const q = useDebouncedValue(search.trim());

    const query = useQuery({
        queryKey: [...KEY, status, tourId, q, page, limit],
        queryFn: () => getOperationsAttention({ status, tourId, q: q || undefined, page, limit }),
        placeholderData: keepPreviousData,
        refetchInterval: 60_000, // suppliers answer throughout the day
    });
    const data = query.data;
    const counts = data?.counts ?? {};
    const totalOpen = Object.values(counts).reduce((n, v) => n + v, 0);
    const problems = (counts.declined ?? 0) + (counts.expired ?? 0) + (counts.countered ?? 0);

    const days = useMemo(() => {
        const map = new Map<string, AttentionRow[]>();
        for (const r of data?.items ?? []) map.set(r.serviceDate, [...(map.get(r.serviceDate) ?? []), r]);
        return [...map.entries()];
    }, [data?.items]);

    const selectClass = 'h-9 rounded-md border border-border bg-background px-2 text-sm';

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <Card><CardContent className="py-4"><p className="text-2xl font-semibold">{totalOpen}</p><p className="text-sm text-muted-foreground">Open supplier requests</p></CardContent></Card>
                <Card><CardContent className="py-4"><p className="text-2xl font-semibold text-destructive">{problems}</p><p className="text-sm text-muted-foreground">Declined, no reply or change proposed</p></CardContent></Card>
                <Card><CardContent className="py-4"><p className="text-2xl font-semibold">{data?.within7Days ?? 0}</p><p className="text-sm text-muted-foreground">Open in the next 7 days</p></CardContent></Card>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
                    {FILTERS.map((f) => {
                        const n = f.key === 'all' ? totalOpen : counts[f.key] ?? 0;
                        return (
                            <Button key={f.key} size="sm" variant={status === f.key ? 'default' : 'outline'} onClick={() => { setStatus(f.key); setPage(1); }} aria-pressed={status === f.key}>
                                {f.label} <span className="ml-1 opacity-70">{n}</span>
                            </Button>
                        );
                    })}
                </div>
                <span className="flex-1" />
                <select className={selectClass} value={tourId} onChange={(e) => { setTourId(e.target.value); setPage(1); }} aria-label="Tour">
                    <option value="all">All tours</option>
                    {(data?.tours ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}{t.code ? ` (${t.code})` : ''}</option>)}
                </select>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tour or supplier…" className="h-9 w-56 pl-8" aria-label="Search tours or suppliers" />
                </div>
            </div>

            {query.isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
            ) : query.isError ? (
                <p className="text-sm text-destructive">{(query.error as Error).message}</p>
            ) : days.length === 0 ? (
                <EmptyState
                    icon={<CheckCircle2 className="h-10 w-10" aria-hidden="true" />}
                    title={totalOpen === 0 ? 'Everything is confirmed' : 'Nothing matches these filters'}
                    description={totalOpen === 0 ? 'Every upcoming hotel, meal, guide and transport request on your published tours is confirmed.' : 'Try another status, tour or search.'}
                />
            ) : (
                <div className="space-y-6">
                    {days.map(([date, rows]) => (
                        <section key={date} aria-labelledby={`day-${date}`} className="space-y-2">
                            <h3 id={`day-${date}`} className="flex items-baseline gap-2 text-sm font-semibold">
                                {rows[0].daysUntil <= 2 && <AlertTriangle className="h-4 w-4 self-center text-destructive" aria-hidden="true" />}
                                <span>{whenLabel(rows[0].daysUntil)}</span>
                                <span className="font-normal text-muted-foreground">{format(parseISO(date), 'EEEE d MMMM yyyy')}</span>
                            </h3>
                            <ul className="space-y-2">{rows.map((r) => <ItemRow key={r.id} row={r} />)}</ul>
                        </section>
                    ))}
                    {data && data.pagination.totalPages > 1 && (
                        <PaginationControls
                            page={page} totalPages={data.pagination.totalPages} totalItems={data.pagination.totalItems} limit={limit}
                            onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} isFetching={query.isFetching && !query.isLoading}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
