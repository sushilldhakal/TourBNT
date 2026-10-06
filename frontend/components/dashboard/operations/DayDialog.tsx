'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bed, Car, ExternalLink, Info, Plus, UserRound, Utensils, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { getApprovedDestinations } from '@/lib/api/globalApi';
import { longDate } from '@/lib/operations/dates';
import {
    dayKeyOf,
    getDayDetail,
    getSupplierOptions,
    updateDay,
    type DayDetail,
    type DayRole,
    type DaySupplier,
    type SupplierOption,
} from '@/lib/api/operationsDay';
import type { EpgDay, EpgDeparture, EpgPartnerService } from '@/lib/api/operationsEpg';
import { cn } from '@/lib/utils';

const ROLES: { role: DayRole; label: string; add: string; Icon: LucideIcon; hint?: string }[] = [
    { role: 'accommodation', label: 'Hotel / guesthouse', add: 'Add stay', Icon: Bed },
    { role: 'meals', label: 'Restaurants', add: 'Add restaurant', Icon: Utensils, hint: 'Add one per meal.' },
    { role: 'transport', label: 'Transport', add: 'Add transport', Icon: Car },
    { role: 'guide', label: 'Guides', add: 'Add guide', Icon: UserRound },
];

const SERVICE_STATUS: Record<string, { label: string; dot: string }> = {
    confirmed: { label: 'Confirmed', dot: 'bg-emerald-500' },
    held: { label: 'Held', dot: 'bg-sky-500' },
    pending: { label: 'Needs reply', dot: 'bg-amber-500' },
    countered: { label: 'Countered', dot: 'bg-amber-500' },
    declined: { label: 'Declined', dot: 'bg-red-500' },
    expired: { label: 'Expired', dot: 'bg-red-500' },
};

/** Strips the "doing x:" prefix handleApiError adds so the server's own sentence reads cleanly. */
const messageOf = (error: unknown): string => {
    const text = error instanceof Error ? error.message : String(error);
    return text.replace(/^[^:]+: /, '');
};

interface Row {
    key: string;
    role: DayRole;
    businessPartnerId: string | null;
    name: string;
    openForAll: boolean;
    liveRequests: number;
    confirmedRequests: number;
}

let rowSeq = 0;
const newKey = () => `row-${rowSeq++}`;

function rowsFrom(partners: DaySupplier[]): Record<DayRole, Row[]> {
    const rows: Record<DayRole, Row[]> = { accommodation: [], meals: [], transport: [], guide: [] };
    for (const p of partners) {
        if (!(p.role in rows)) continue;
        rows[p.role as DayRole].push({
            key: newKey(),
            role: p.role as DayRole,
            businessPartnerId: p.businessPartnerId,
            name: p.name,
            openForAll: p.openForAll,
            liveRequests: p.liveRequests,
            confirmedRequests: p.confirmedRequests,
        });
    }
    return rows;
}

const signature = (rows: Record<DayRole, Row[]>, destinationId: string | null, place: string) =>
    JSON.stringify([destinationId, place, ROLES.map(({ role }) => rows[role].map((r) => r.businessPartnerId ?? `~${r.name}`))]);

export interface DayDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    departure: EpgDeparture;
    day: EpgDay;
    /** `operator` edits the tour's itinerary; `partner` only shows what this business was asked to do. */
    mode: 'operator' | 'partner';
}

export function DayDialog({ open, onOpenChange, departure, day, mode }: DayDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-baseline gap-x-2">
                        <span>Day {day.dayNumber}</span>
                        <span className="text-base font-normal text-muted-foreground">{longDate(day.date)}</span>
                    </DialogTitle>
                    <DialogDescription>
                        {departure.title} · {departure.code}
                        {departure.departureLabel && departure.departureLabel !== departure.code ? ` · ${departure.departureLabel}` : ''}
                        {' · '}day {day.dayNumber} of {departure.totalDays}
                    </DialogDescription>
                </DialogHeader>
                {mode === 'operator' ? (
                    <OperatorBody departure={departure} day={day} onClose={() => onOpenChange(false)} />
                ) : (
                    <PartnerBody departure={departure} day={day} onClose={() => onOpenChange(false)} />
                )}
            </DialogContent>
        </Dialog>
    );
}

function PartnerBody({ departure, day, onClose }: { departure: EpgDeparture; day: EpgDay; onClose: () => void }) {
    const services = day.services ?? [];
    return (
        <>
            <div className="space-y-3 text-sm">
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="font-medium">{day.destination || day.title || 'Itinerary day'}</p>
                    <p className="text-xs text-muted-foreground">{departure.guestCount} guest{departure.guestCount === 1 ? '' : 's'} in the group</p>
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your services this day</h3>
                {services.length === 0 && <p className="text-muted-foreground">Nothing is asked of your business on this day.</p>}
                <ul className="space-y-2">
                    {services.map((service) => <ServiceCard key={service.requestId} service={service} />)}
                </ul>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
        </>
    );
}

function ServiceCard({ service }: { service: EpgPartnerService }) {
    const state = SERVICE_STATUS[service.status] ?? SERVICE_STATUS.pending;
    const role = ROLES.find((r) => r.role === service.role);
    const Icon = role?.Icon ?? Info;
    const units = service.capacityConfirmed ?? service.unitsRequested;
    const details = [
        service.headcount > 0 && `${service.headcount} guest${service.headcount === 1 ? '' : 's'}`,
        units > 0 && service.role !== 'guide' && `${units} ${service.unitType ?? (units === 1 ? 'unit' : 'units')}`,
        service.serviceTime && (service.serviceEndTime ? `${service.serviceTime}–${service.serviceEndTime}` : service.serviceTime),
        service.counterDate && `offered ${service.counterDate}`,
    ].filter(Boolean);
    return (
        <li className="flex items-start gap-2 rounded-md border px-3 py-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{service.partnerName || role?.label}</p>
                <p className="text-xs text-muted-foreground">{details.join(' · ') || 'No details yet'}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                <span className={cn('h-2 w-2 rounded-full', state.dot)} aria-hidden />
                {state.label}
            </span>
        </li>
    );
}

function OperatorBody({ departure, day, onClose }: { departure: EpgDeparture; day: EpgDay; onClose: () => void }) {
    const dayKey = dayKeyOf(day);
    const detail = useQuery({
        queryKey: ['operations', 'day', departure.tourId, dayKey],
        queryFn: () => getDayDetail(departure.tourId, dayKey),
    });
    const itineraryHref = `/dashboard/tours/edit/${departure.tourId}?day=${day.index}#itinerary`;

    if (detail.isLoading) {
        return (
            <div className="space-y-3" aria-busy>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    if (detail.isError || !detail.data) {
        return (
            <>
                <div className="space-y-2 text-sm">
                    <p className="text-destructive">{messageOf(detail.error)}</p>
                    <p className="text-muted-foreground">You can still open the itinerary page for this tour.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button asChild><Link href={itineraryHref}>Open itinerary <ExternalLink className="ml-1 h-4 w-4" /></Link></Button>
                </DialogFooter>
            </>
        );
    }

    return <OperatorForm departure={departure} day={day} dayKey={dayKey} detail={detail.data} itineraryHref={itineraryHref} onClose={onClose} />;
}

/** The editable form. Mounted only once the day has loaded, so its state starts from the saved day. */
function OperatorForm({
    departure,
    day,
    dayKey,
    detail,
    itineraryHref,
    onClose,
}: {
    departure: EpgDeparture;
    day: EpgDay;
    dayKey: string;
    detail: DayDetail;
    itineraryHref: string;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();

    const destinations = useQuery({
        queryKey: ['destinations', 'approved-options'],
        queryFn: async () => {
            const raw = (await getApprovedDestinations()) as unknown;
            const list = (Array.isArray(raw) ? raw : (raw as { data?: unknown[]; items?: unknown[] })?.data ?? (raw as { items?: unknown[] })?.items ?? []) as Array<Record<string, unknown>>;
            return list
                .map((d) => ({ id: String(d._id ?? d.id ?? ''), name: String(d.name ?? ''), active: d.isActive !== false }))
                .filter((d) => d.id && d.name && d.active)
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        staleTime: 5 * 60 * 1000,
    });

    const [initial] = useState(() => ({ rows: rowsFrom(detail.partners), destinationId: detail.destinationId, place: detail.place }));
    const [destinationId, setDestinationId] = useState<string | null>(initial.destinationId);
    const [place, setPlace] = useState(initial.place);
    const [rows, setRows] = useState<Record<DayRole, Row[]>>(initial.rows);
    const [savedSignature] = useState(() => signature(initial.rows, initial.destinationId, initial.place));

    const options = useQuery({
        queryKey: ['operations', 'supplier-options', destinationId],
        queryFn: () => getSupplierOptions(destinationId),
        staleTime: 60 * 1000,
    });

    const dirty = signature(rows, destinationId, place) !== savedSignature;
    const destinationName = destinations.data?.find((d) => d.id === destinationId)?.name ?? detail.destinationName ?? null;

    const mutation = useMutation({
        mutationFn: () => updateDay(departure.tourId, dayKey, {
            destinationId,
            place,
            partners: ROLES.flatMap(({ role }) => rows[role]
                .filter((r) => r.businessPartnerId || r.openForAll || r.name)
                .map((r) => (r.businessPartnerId
                    ? { role, businessPartnerId: r.businessPartnerId }
                    : { role, businessPartnerId: null, name: r.name, openForAll: r.openForAll }))),
        }),
        onSuccess: () => {
            toast({ title: `Day ${day.dayNumber} updated`, description: `Saved to the ${departure.title} itinerary.` });
            queryClient.invalidateQueries({ queryKey: ['operations'] });
            onClose();
        },
    });

    const setRow = (role: DayRole, key: string, patch: Partial<Row>) =>
        setRows((current) => ({ ...current, [role]: current[role].map((r) => (r.key === key ? { ...r, ...patch } : r)) }));
    const removeRow = (role: DayRole, key: string) =>
        setRows((current) => ({ ...current, [role]: current[role].filter((r) => r.key !== key) }));
    const addRow = (role: DayRole) =>
        setRows((current) => ({
            ...current,
            [role]: [...current[role], { key: newKey(), role, businessPartnerId: null, name: '', openForAll: false, liveRequests: 0, confirmedRequests: 0 }],
        }));

    return (
        <>
            <div className="space-y-5">
                <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>This is the tour&apos;s itinerary, shared by every departure of {departure.title}. A change here applies to all of them, not only this date.</span>
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium" htmlFor="day-destination">Destination</label>
                        <Select value={destinationId ?? undefined} onValueChange={(value) => setDestinationId(value)}>
                            <SelectTrigger id="day-destination" className="w-full">
                                <SelectValue placeholder={destinations.isLoading ? 'Loading…' : 'Choose a destination'} />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                {(destinations.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {destinationId
                                ? 'Suppliers below are limited to this destination.'
                                : 'Pick a destination to see the suppliers that serve it.'}
                            {detail.destinationSource === 'text' && ' Guessed from the day’s place name — check it.'}
                            {detail.destinationSource === 'tour' && ' Using the tour’s main destination.'}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium" htmlFor="day-place">Place on the day card</label>
                        <Input id="day-place" value={place} maxLength={200} onChange={(event) => setPlace(event.target.value)} placeholder="e.g. Namche → Tengboche" />
                    </div>
                </div>

                {options.isError && <p className="text-xs text-destructive">{messageOf(options.error)}</p>}

                {ROLES.map(({ role, label, add, Icon, hint }) => {
                    const list: SupplierOption[] = options.data?.[role] ?? [];
                    return (
                        <section key={role} aria-label={label} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                                    <Icon className="h-4 w-4" aria-hidden /> {label}
                                </h3>
                                <Button type="button" variant="ghost" size="sm" onClick={() => addRow(role)} disabled={!destinationId}>
                                    <Plus className="mr-1 h-3.5 w-3.5" /> {add}
                                </Button>
                            </div>
                            {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
                            {rows[role].length === 0 && <p className="text-xs text-muted-foreground">None set for this day.</p>}
                            {rows[role].map((row) => (
                                <SupplierRow
                                    key={row.key}
                                    row={row}
                                    label={label}
                                    options={list}
                                    optionsLoading={options.isLoading}
                                    destinationName={destinationName}
                                    chosenElsewhere={new Set(rows[role].map((r) => r.businessPartnerId).filter((id): id is string => Boolean(id) && id !== row.businessPartnerId))}
                                    onPick={(id) => {
                                        const picked = list.find((o) => o.id === id);
                                        setRow(role, row.key, { businessPartnerId: id, name: picked?.name ?? row.name, openForAll: false, liveRequests: 0, confirmedRequests: 0 });
                                    }}
                                    onRemove={() => removeRow(role, row.key)}
                                />
                            ))}
                        </section>
                    );
                })}

                {mutation.isError && <p role="alert" className="text-sm text-destructive">{messageOf(mutation.error)}</p>}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" asChild>
                    <Link href={itineraryHref}>Open itinerary page <ExternalLink className="ml-1 h-4 w-4" /></Link>
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => mutation.mutate()} disabled={!dirty || mutation.isPending}>
                        {mutation.isPending ? 'Saving…' : 'Save changes'}
                    </Button>
                </div>
            </DialogFooter>
        </>
    );
}

function SupplierRow({
    row,
    label,
    options,
    optionsLoading,
    destinationName,
    chosenElsewhere,
    onPick,
    onRemove,
}: {
    row: Row;
    label: string;
    options: SupplierOption[];
    optionsLoading: boolean;
    destinationName: string | null;
    chosenElsewhere: Set<string>;
    onPick: (id: string) => void;
    onRemove: () => void;
}) {
    const locked = row.confirmedRequests > 0;
    const unlinked = !row.businessPartnerId && (row.openForAll || row.name);
    const inList = row.businessPartnerId ? options.some((o) => o.id === row.businessPartnerId) : true;

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                {unlinked ? (
                    <div className="flex h-9 flex-1 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm">
                        <span className="truncate">{row.openForAll ? 'Open slot — any approved business can apply' : row.name}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">{row.openForAll ? 'Open' : 'Not linked'}</span>
                    </div>
                ) : (
                    <Select value={row.businessPartnerId ?? undefined} onValueChange={onPick} disabled={locked}>
                        <SelectTrigger className="w-full" aria-label={`${label}: choose a supplier`}>
                            <SelectValue placeholder={optionsLoading ? 'Loading…' : options.length === 0 ? 'No suppliers in this destination' : 'Choose a supplier'} />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                            {/* The saved supplier stays selectable even when it doesn't serve the chosen destination. */}
                            {!inList && row.businessPartnerId && <SelectItem value={row.businessPartnerId}>{row.name}</SelectItem>}
                            {options.map((o) => (
                                <SelectItem key={o.id} value={o.id} disabled={chosenElsewhere.has(o.id)}>
                                    {o.name}
                                    <span className="ml-2 text-xs text-muted-foreground">{o.type}{o.rating > 0 ? ` · ★ ${o.rating.toFixed(1)}` : ''}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Button type="button" variant="ghost" size="icon" onClick={onRemove} disabled={locked} aria-label={`Remove ${row.name || label}`}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            {locked && (
                <p className="text-xs text-muted-foreground">{row.name} has confirmed {row.confirmedRequests} upcoming date{row.confirmedRequests === 1 ? '' : 's'}. They need to withdraw before you can change this.</p>
            )}
            {!locked && row.liveRequests > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{row.name} has {row.liveRequests} open request{row.liveRequests === 1 ? '' : 's'}. If you replace or remove them, those are declined and they are told.</p>
            )}
            {!inList && row.businessPartnerId && !optionsLoading && destinationName && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{row.name} isn&apos;t listed for {destinationName}. Pick another, or keep them if that&apos;s intended.</p>
            )}
        </div>
    );
}
