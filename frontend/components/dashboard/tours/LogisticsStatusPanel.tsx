'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, XCircle, Building2, RotateCcw, Send, Repeat2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/use-toast';
import {
    sendItineraryPartnerRequest,
    respondToItineraryCounterOffer,
    reopenItineraryPartnerRequest,
    replaceItineraryPartner,
    type TourItineraryRequestStatus,
} from '@/lib/api/tours';
import { useTourLogisticsStatus } from '@/lib/queries/useTours';
import { searchBusinessPartners, type BusinessPartner, type BusinessPartnerType } from '@/lib/api/businessPartners';
import { useTourContext } from '@/providers/TourProvider';
import { queryKeys } from '@/lib/queries/queryKeys';
import { format } from 'date-fns';

const STATUS_META = {
    confirmed: { label: 'Confirmed', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    held: { label: 'Held', icon: Clock, className: 'text-sky-600 bg-sky-50 border-sky-200' },
    pending: { label: 'Requested', icon: Clock, className: 'text-amber-600 bg-amber-50 border-amber-200' },
    countered: { label: 'Countered', icon: Repeat2, className: 'text-violet-600 bg-violet-50 border-violet-200' },
    declined: { label: 'Declined', icon: XCircle, className: 'text-destructive bg-destructive/5 border-destructive/20' },
    expired: { label: 'Expired', icon: XCircle, className: 'text-muted-foreground bg-muted border-border' },
} as const;

const ROLE_LABEL: Record<string, string> = {
    accommodation: 'Accommodation',
    meals: 'Meals',
    guide: 'Guide',
    transport: 'Transport',
    other: 'Other',
};

const ROLE_TO_TYPES: Record<string, BusinessPartnerType[]> = {
    transport: ['transport'],
    accommodation: ['hotel', 'guesthouse'],
    guide: ['guide'],
    meals: ['restaurant'],
    other: ['guide', 'hotel', 'guesthouse', 'restaurant', 'transport', 'advertiser'],
};

function requirementLabel(row: TourItineraryRequestStatus): string {
    const qty = row.unitsRequested > 0 ? `${row.unitsRequested} ${row.unitType || 'unit(s)'}` : null;
    return [ROLE_LABEL[row.role] || row.role, qty].filter(Boolean).join(' · ');
}

/** Small inline search reused for "Replace supplier" instead of the full BusinessPartnerPicker (which is react-hook-form-bound to the itinerary JSONB, not usable standalone here). */
function ReplaceSupplierPopover({ row, onReplace }: { row: TourItineraryRequestStatus; onReplace: (partner: BusinessPartner) => void }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<BusinessPartner[]>([]);
    const [loading, setLoading] = useState(false);

    const handleQueryChange = async (value: string) => {
        setQuery(value);
        if (value.trim().length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const types = ROLE_TO_TYPES[row.role] || [];
            const responses = await Promise.all(types.map((type) => searchBusinessPartners({ type, q: value, limit: 5 })));
            setResults(responses.flatMap((r) => r.data));
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Repeat2 className="h-3.5 w-3.5" /> Replace
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
                <Input
                    autoFocus
                    placeholder="Search a replacement..."
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    className="h-8 mb-2"
                />
                {loading && <p className="text-xs text-muted-foreground px-1">Searching...</p>}
                {!loading && results.length === 0 && query.trim().length >= 2 && (
                    <p className="text-xs text-muted-foreground px-1">No matches.</p>
                )}
                <div className="max-h-48 overflow-auto space-y-0.5">
                    {results.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between"
                            onClick={() => { onReplace(r); setOpen(false); setQuery(''); setResults([]); }}
                        >
                            <span>{r.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{r.type}</span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function RequestRow({ tourId, row }: { tourId: string; row: TourItineraryRequestStatus }) {
    const queryClient = useQueryClient();
    const [sendDate, setSendDate] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);

    const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.businessPartners.tourLogisticsStatus(tourId) });

    const sendMutation = useMutation({
        mutationFn: () => sendItineraryPartnerRequest(tourId, row.tourItineraryPartnerId, sendDate),
        onSuccess: () => { toast({ title: 'Request sent' }); invalidate(); },
        onError: (error: Error) => toast({ title: 'Could not send request', description: error.message, variant: 'destructive' }),
    });

    const counterMutation = useMutation({
        mutationFn: (accept: boolean) => respondToItineraryCounterOffer(tourId, row.id!, accept),
        onSuccess: () => { toast({ title: 'Response recorded' }); invalidate(); },
        onError: (error: Error) => toast({ title: 'Could not respond', description: error.message, variant: 'destructive' }),
    });

    const reopenMutation = useMutation({
        mutationFn: () => reopenItineraryPartnerRequest(tourId, row.id!),
        onSuccess: () => { toast({ title: 'Request reopened' }); invalidate(); },
        onError: (error: Error) => toast({ title: 'Could not reopen', description: error.message, variant: 'destructive' }),
    });

    const replaceMutation = useMutation({
        mutationFn: (partner: BusinessPartner) => replaceItineraryPartner(tourId, row.tourItineraryPartnerId, partner.id, partner.name),
        onSuccess: () => { toast({ title: 'Supplier replaced' }); invalidate(); },
        onError: (error: Error) => toast({ title: 'Could not replace supplier', description: error.message, variant: 'destructive' }),
    });

    const meta = row.status ? STATUS_META[row.status] : null;
    const Icon = meta?.icon;

    return (
        <div id={`itinerary-request-${row.id ?? row.tourItineraryPartnerId}`} className="rounded-md border px-3 py-2 text-sm space-y-2 scroll-mt-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                    <span className="font-medium">{row.partnerName}</span>
                    <span className="text-muted-foreground"> · {requirementLabel(row)}</span>
                    {row.serviceTime && <span className="text-muted-foreground"> · {row.serviceTime}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {meta && Icon && (
                        <Badge variant="outline" className={`gap-1.5 ${meta.className}`}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                        </Badge>
                    )}
                    {row.events.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={() => setHistoryOpen((v) => !v)}>
                            {historyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                    )}
                </div>
            </div>

            {row.status === null && (
                <div className="flex items-center gap-2">
                    <Input type="date" className="h-8 w-40" value={sendDate} onChange={(e) => setSendDate(e.target.value)} />
                    <Button size="sm" disabled={!sendDate || sendMutation.isPending} onClick={() => sendMutation.mutate()} className="gap-1.5">
                        <Send className="h-3.5 w-3.5" /> Send request
                    </Button>
                    <ReplaceSupplierPopover row={row} onReplace={(p) => replaceMutation.mutate(p)} />
                </div>
            )}

            {row.status === 'countered' && (
                <div className="rounded-md bg-violet-50 border border-violet-200 px-2.5 py-2 space-y-1.5">
                    <p className="text-xs text-violet-900">
                        Proposed instead:
                        {row.counterUnits != null && ` ${row.counterUnits} ${row.unitType || 'unit(s)'}`}
                        {row.counterDate && ` on ${format(new Date(row.counterDate), 'MMM d, yyyy')}`}
                        {row.counterTime && ` at ${row.counterTime}`}
                        {row.counterNotes && ` — "${row.counterNotes}"`}
                    </p>
                    <div className="flex gap-2">
                        <Button size="sm" disabled={counterMutation.isPending} onClick={() => counterMutation.mutate(true)}>Accept</Button>
                        <Button size="sm" variant="outline" disabled={counterMutation.isPending} onClick={() => counterMutation.mutate(false)}>Decline</Button>
                    </div>
                </div>
            )}

            {(row.status === 'declined' || row.status === 'expired') && (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={reopenMutation.isPending} onClick={() => reopenMutation.mutate()} className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" /> Reopen
                    </Button>
                    <ReplaceSupplierPopover row={row} onReplace={(p) => replaceMutation.mutate(p)} />
                </div>
            )}

            {(row.status === 'pending' || row.status === 'held' || row.status === 'confirmed') && (
                <div className="flex items-center gap-2">
                    <ReplaceSupplierPopover row={row} onReplace={(p) => replaceMutation.mutate(p)} />
                </div>
            )}

            {historyOpen && row.events.length > 0 && (
                <div className="pt-1.5 border-t space-y-1">
                    {row.events.map((e) => (
                        <p key={e.id} className="text-xs text-muted-foreground">
                            {format(new Date(e.createdAt), 'MMM d, HH:mm')} — {e.fromStatus ?? 'new'} → {e.toStatus}
                            {e.notes ? ` (${e.notes})` : ''}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

const NOT_CONFIRMED_LABEL: Record<NonNullable<TourItineraryRequestStatus['status']>, string> = {
    pending: 'Requested',
    held: 'Held',
    countered: 'Countered',
    declined: 'Declined',
    expired: 'Expired',
    confirmed: 'Confirmed',
} as const;

/**
 * One verdict for the whole date instead of making the agency read every
 * row — "Confirmed" only once every linked requirement is, otherwise names
 * exactly which supplier(s) are still blocking it. Computed purely from the
 * rows already fetched for this date; no extra request.
 */
function DateVerdict({ rows }: { rows: TourItineraryRequestStatus[] }) {
    const blockers = rows.filter((r) => r.status !== 'confirmed');

    if (blockers.length === 0) {
        return (
            <Alert className="py-2">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle className="text-sm">Confirmed</AlertTitle>
            </Alert>
        );
    }

    return (
        <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Not yet confirmable</AlertTitle>
            <AlertDescription>
                <ul className="text-sm space-y-0.5 mt-1">
                    {blockers.map((b) => (
                        <li key={b.id ?? b.tourItineraryPartnerId}>
                            <a
                                href={`#itinerary-request-${b.id ?? b.tourItineraryPartnerId}`}
                                className="underline underline-offset-2 hover:no-underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(`itinerary-request-${b.id ?? b.tourItineraryPartnerId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                            >
                                {ROLE_LABEL[b.role] || b.role} ({b.partnerName}) — {b.status ? NOT_CONFIRMED_LABEL[b.status] : 'Not requested'}
                            </a>
                        </li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
}

/**
 * Agency orchestrator table: every hotel/restaurant/guide/transport
 * requirement linked to this itinerary, its quantity, and its request
 * status, with actions to send a request, respond to a counter-offer,
 * reopen a declined/expired request, or replace the supplier outright.
 * A fixed-departure date isn't bookable by travelers until every row for
 * it shows "Confirmed" — see BookingService.checkAvailabilityForTour.
 */
export function LogisticsStatusPanel() {
    const { tourId } = useTourContext();
    const { data: requests, isLoading } = useTourLogisticsStatus(tourId, !!tourId);

    const { dated, undated } = useMemo(() => {
        const dated = new Map<string, TourItineraryRequestStatus[]>();
        const undated: TourItineraryRequestStatus[] = [];
        for (const r of requests || []) {
            if (!r.serviceDate) {
                undated.push(r);
                continue;
            }
            const list = dated.get(r.serviceDate) || [];
            list.push(r);
            dated.set(r.serviceDate, list);
        }
        return { dated: Array.from(dated.entries()).sort(([a], [b]) => a.localeCompare(b)), undated };
    }, [requests]);

    if (!tourId || isLoading || !requests || requests.length === 0) {
        return null;
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    Logistics status
                </CardTitle>
                <CardDescription>
                    Requirements linked to this itinerary — request availability, respond to counter-offers, reopen a declined
                    request, or replace a supplier. A fixed departure date isn&apos;t bookable by travelers until every row for it
                    shows &quot;Confirmed&quot;.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {undated.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Not yet requested</p>
                        <div className="space-y-1.5">
                            {undated.map((r) => (
                                <RequestRow key={r.tourItineraryPartnerId} tourId={tourId} row={r} />
                            ))}
                        </div>
                    </div>
                )}
                {dated.map(([date, rows]) => (
                    <div key={date} className="space-y-2">
                        <p className="text-sm font-medium">{format(new Date(date), 'EEEE, MMM d, yyyy')}</p>
                        <DateVerdict rows={rows} />
                        <div className="space-y-1.5">
                            {rows.map((r) => (
                                <RequestRow key={r.id} tourId={tourId} row={r} />
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
