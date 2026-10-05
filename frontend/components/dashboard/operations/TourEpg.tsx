'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    Bed,
    Binoculars,
    Bus,
    Car,
    ChevronLeft,
    ChevronRight,
    Footprints,
    Plane,
    Search,
    Ship,
    UserRound,
} from 'lucide-react';
import { SellerGuard } from '@/components/dashboard/RoleGuard';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import {
    getOperationsEpg,
    type EpgDay,
    type EpgDeparture,
    type EpgOperationalStatus,
    type EpgStatusFilter,
    type TransportKind,
} from '@/lib/api/operationsEpg';
import { cn } from '@/lib/utils';

/**
 * Tour operations EPG.
 *
 * Rows are tour departures. Columns are calendar dates. A cell is that
 * departure's own itinerary day (start date + day index), so two tours on
 * the same date show different day numbers. The grid only reads the
 * existing itinerary — it does not schedule anything.
 *
 * The shift scheduler's timeline is an hourly resource grid with drag and
 * resize. That model does not fit a read-only day-per-column guide, so this
 * view keeps the scheduler's useful ideas (sticky resource column, a bounded
 * date window, a now line, row windowing) without turning departures into shifts.
 */

type Scale = 'days' | 'weeks' | 'month';
type Density = 'compact' | 'detailed';

const SCALES: Record<Scale, { days: number; shift: number; label: string }> = {
    days: { days: 14, shift: 7, label: 'Days' },
    weeks: { days: 28, shift: 7, label: 'Weeks' },
    month: { days: 42, shift: 14, label: 'Month' },
};

const FILTERS: { id: EpgStatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'running', label: 'Running' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'starting-today', label: 'Starting today' },
    { id: 'ending-today', label: 'Ending today' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'delayed', label: 'Delayed' },
    { id: 'attention', label: 'Attention' },
];

const STATUS_STYLE: Record<EpgOperationalStatus, { label: string; dot: string; text: string; cell: string }> = {
    running: { label: 'Running', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', cell: 'border-emerald-600/30 bg-emerald-500/10' },
    upcoming: { label: 'Upcoming', dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300', cell: 'border-sky-600/30 bg-sky-500/10' },
    completed: { label: 'Completed', dot: 'bg-muted-foreground', text: 'text-muted-foreground', cell: 'border-border bg-muted/50' },
    cancelled: { label: 'Cancelled', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', cell: 'border-rose-600/30 bg-rose-500/10 opacity-70' },
    delayed: { label: 'Delayed', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', cell: 'border-amber-600/40 bg-amber-500/10' },
    attention: { label: 'Attention', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300', cell: 'border-red-600/40 bg-red-500/10' },
};

const ROW_HEADER = 248;
const HEADER_H = 52;
const COL = { detailed: 176, compact: 112 } as const;
const ROW = { detailed: 112, compact: 60 } as const;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localIso(date = new Date()): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function addIsoDays(iso: string, days: number): string {
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function dateParts(iso: string) {
    const [year, month, day] = iso.split('-').map(Number);
    const utc = new Date(Date.UTC(year, month - 1, day));
    return { month: MONTHS[month - 1], day, weekday: WEEKDAYS[utc.getUTCDay()], monthIndex: month };
}

function windowFor(scale: Scale, today: string) {
    const lead = scale === 'days' ? 1 : 3;
    const from = addIsoDays(today, -lead);
    return { from, to: addIsoDays(from, SCALES[scale].days - 1) };
}

function TransportGlyph({ kind, label }: { kind: TransportKind | null; label: string }) {
    const className = 'h-3 w-3 shrink-0';
    if (kind === 'flight') return <Plane className={className} aria-hidden />;
    if (kind === 'boat') return <Ship className={className} aria-hidden />;
    if (kind === 'trek') return <Footprints className={className} aria-hidden />;
    if (kind === 'safari') return <Binoculars className={className} aria-hidden />;
    if (kind === 'road') {
        return /bus|coach/i.test(label) ? <Bus className={className} aria-hidden /> : <Car className={className} aria-hidden />;
    }
    return null;
}

function DayCell({ day, tourId, status, today, density }: { day: EpgDay; tourId: string; status: EpgOperationalStatus; today: string; density: Density }) {
    const style = STATUS_STYLE[status];
    const isNow = day.date === today;
    const motion = day.transport || day.vehicle || day.activity;
    const motionLabel = day.vehicle || day.transport || day.activity || '';
    return (
        <Link
            href={`/dashboard/tours/edit/${tourId}?day=${day.index}#itinerary`}
            title={`Day ${day.dayNumber}${day.destination ? `, ${day.destination}` : ''}. Open this itinerary day.`}
            className={cn(
                'flex h-full flex-col overflow-hidden rounded-md border px-1.5 py-1 text-left transition-colors hover:ring-2 hover:ring-primary/50',
                style.cell,
                isNow && 'ring-1 ring-rose-500',
            )}
        >
            {density === 'detailed' ? (
                <>
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold tracking-wide">DAY {day.dayNumber}</span>
                        {isNow && <span className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-300">Now</span>}
                    </div>
                    <span className="truncate text-xs font-semibold leading-tight">{day.destination || 'Open itinerary'}</span>
                    {day.accommodation && (
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                            <Bed className="h-3 w-3 shrink-0" aria-hidden /> {day.accommodation}
                        </span>
                    )}
                    {day.guide && (
                        <span className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                            <UserRound className="h-3 w-3 shrink-0" aria-hidden /> {day.guide}
                        </span>
                    )}
                    {motion && (
                        <span className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                            <TransportGlyph kind={day.transportKind} label={motionLabel} />
                            <span className="truncate">{motionLabel}</span>
                        </span>
                    )}
                </>
            ) : (
                <>
                    <span className="truncate text-[11px] font-semibold leading-tight">D{day.dayNumber} · {day.destination || 'Day'}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                        {day.accommodation && <Bed className="h-3 w-3" aria-label="Accommodation" />}
                        {day.guide && <UserRound className="h-3 w-3" aria-label="Guide" />}
                        {day.transportKind && <TransportGlyph kind={day.transportKind} label={motionLabel} />}
                    </span>
                </>
            )}
        </Link>
    );
}

function RowHeader({ row, today }: { row: EpgDeparture; today: string }) {
    const style = STATUS_STYLE[row.status];
    const onRoad = row.currentDay != null;
    const place = onRoad ? row.todayStop?.destination : row.nextStop?.destination;
    const progress = onRoad
        ? `Day ${row.currentDay}/${row.totalDays}`
        : row.startDate > today
            ? `Starts ${dateParts(row.startDate).month} ${dateParts(row.startDate).day}`
            : `Finished ${dateParts(row.endDate).month} ${dateParts(row.endDate).day}`;
    return (
        <Link
            href={`/dashboard/tours/edit/${row.tourId}#overview`}
            title={row.issues.length ? row.issues.join(' · ') : `${row.title} departure details`}
            className="flex h-full flex-col justify-center gap-0.5 overflow-hidden border-r bg-card px-3 hover:bg-muted/60"
            style={{ width: ROW_HEADER }}
        >
            <span className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)} aria-hidden />
                <span className="truncate text-sm font-semibold">{row.title}</span>
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
                {row.code}
                {row.departureLabel && row.departureLabel !== row.code ? ` · ${row.departureLabel}` : ''}
                {' · '}
                {row.guestCount} guest{row.guestCount === 1 ? '' : 's'}
                {row.capacity != null ? ` / ${row.capacity}` : ''}
            </span>
            <span className={cn('truncate text-[11px] font-medium', style.text)}>
                {style.label} · {progress}
                {place ? ` · ${place}` : ''}
                {row.guideName ? ` · ${row.guideName}` : ''}
            </span>
        </Link>
    );
}

function MobileCard({ row, today }: { row: EpgDeparture; today: string }) {
    const style = STATUS_STYLE[row.status];
    const stop = row.todayStop ?? row.nextStop ?? row.days[row.days.length - 1] ?? null;
    return (
        <article className="rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <Link href={`/dashboard/tours/edit/${row.tourId}#overview`} className="truncate text-sm font-semibold hover:underline">
                        {row.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{row.code} · {row.guestCount} guests</p>
                </div>
                <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', style.text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                    {style.label}
                </span>
            </div>
            <p className="mt-2 text-sm">
                {row.currentDay != null ? `Day ${row.currentDay}/${row.totalDays}` : row.startDate > today ? 'Upcoming' : 'Completed'}
                {stop?.destination ? ` · ${stop.destination}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                {[stop?.accommodation && `Stay ${stop.accommodation}`, stop?.guide && `Guide ${stop.guide}`, (stop?.vehicle || stop?.transport) && (stop.vehicle || stop.transport)].filter(Boolean).join(' · ') || 'Open the itinerary for the day plan.'}
            </p>
            {row.nextStop && row.todayStop && (
                <p className="mt-1 text-xs text-muted-foreground">Next: {row.nextStop.destination || row.nextStop.title}</p>
            )}
            {stop && (
                <Link href={`/dashboard/tours/edit/${row.tourId}?day=${stop.index}#itinerary`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                    Open day {stop.dayNumber}
                </Link>
            )}
        </article>
    );
}

function EpgGrid({
    departures,
    dates,
    today,
    fraction,
    density,
    centerToken,
}: {
    departures: EpgDeparture[];
    dates: string[];
    today: string;
    fraction: number;
    density: Density;
    centerToken: number;
}) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportH, setViewportH] = useState(640);
    const colW = COL[density];
    const rowH = ROW[density];
    const todayIndex = dates.indexOf(today);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        let frame = 0;
        const measure = () => {
            frame = 0;
            setScrollTop(el.scrollTop);
            setViewportH(el.clientHeight);
        };
        const onScroll = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(measure);
        };
        measure();
        el.addEventListener('scroll', onScroll, { passive: true });
        const observer = new ResizeObserver(onScroll);
        observer.observe(el);
        return () => {
            el.removeEventListener('scroll', onScroll);
            observer.disconnect();
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el || todayIndex < 0) return;
        const frame = window.requestAnimationFrame(() => {
            el.scrollLeft = Math.max(0, ROW_HEADER + todayIndex * colW - el.clientWidth * 0.35);
        });
        return () => window.cancelAnimationFrame(frame);
    }, [centerToken, todayIndex, colW]);

    const overscan = 8;
    const startIndex = Math.max(0, Math.floor((scrollTop - HEADER_H) / rowH) - overscan);
    const endIndex = Math.min(departures.length, Math.ceil((scrollTop + viewportH - HEADER_H) / rowH) + overscan);
    const visible = departures.slice(startIndex, endIndex);
    const width = ROW_HEADER + dates.length * colW;

    return (
        <div ref={scrollerRef} className="h-full overflow-auto rounded-lg border bg-card" aria-label="Tour operations timeline">
            <div className="relative" style={{ width }}>
                {todayIndex >= 0 && (
                    <div
                        className="pointer-events-none absolute bottom-0 z-0 bg-rose-500/5"
                        style={{ top: 0, left: ROW_HEADER + todayIndex * colW, width: colW }}
                    />
                )}
                <div className="sticky top-0 z-30 flex border-b bg-card" style={{ height: HEADER_H }}>
                    <div
                        className="sticky left-0 z-40 flex shrink-0 items-end border-r bg-card px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                        style={{ width: ROW_HEADER }}
                    >
                        Departures
                    </div>
                    {dates.map((iso, index) => {
                        const parts = dateParts(iso);
                        const prev = index > 0 ? dateParts(dates[index - 1]) : null;
                        const isToday = iso === today;
                        return (
                            <div
                                key={iso}
                                className={cn(
                                    'flex shrink-0 flex-col items-center justify-center border-r text-center',
                                    prev && prev.monthIndex !== parts.monthIndex && 'border-l-2 border-l-foreground/20',
                                    isToday && 'bg-rose-500/10',
                                )}
                                style={{ width: colW }}
                            >
                                <span className={cn('text-[10px] uppercase', isToday ? 'font-bold text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                                    {isToday ? 'Today' : parts.weekday}
                                </span>
                                <span className={cn('text-xs font-semibold', isToday && 'text-rose-700 dark:text-rose-200')}>
                                    {parts.month} {parts.day}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div style={{ height: startIndex * rowH }} />
                {visible.map((row) => {
                    const byDate = new Map(row.days.map((day) => [day.date, day]));
                    return (
                        <div key={row.id} className="flex border-b" style={{ height: rowH }}>
                            <div className="sticky left-0 z-20 shrink-0" style={{ width: ROW_HEADER }}>
                                <RowHeader row={row} today={today} />
                            </div>
                            {dates.map((iso) => {
                                const day = byDate.get(iso);
                                return (
                                    <div key={iso} className="shrink-0 border-r p-1" style={{ width: colW }}>
                                        {day ? <DayCell day={day} tourId={row.tourId} status={row.status} today={today} density={density} /> : null}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
                <div style={{ height: Math.max(0, departures.length - endIndex) * rowH }} />

                {todayIndex >= 0 && (
                    <div
                        className="pointer-events-none absolute z-10 w-0.5 -translate-x-1/2 bg-rose-500"
                        style={{
                            left: ROW_HEADER + todayIndex * colW + fraction * colW,
                            top: HEADER_H,
                            height: Math.max(departures.length, 1) * rowH,
                        }}
                    >
                        <span className="absolute -left-4 top-1 rounded-sm bg-rose-500 px-1 py-0.5 text-[9px] font-bold tracking-wide text-white">
                            NOW
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

const selectClass = 'h-9 rounded-md border bg-background px-2 text-sm';

export function TourEpg() {
    const [clock, setClock] = useState<{ today: string; fraction: number } | null>(null);
    const [scale, setScale] = useState<Scale>('days');
    const [density, setDensity] = useState<Density>('detailed');
    const [range, setRange] = useState<{ from: string; to: string } | null>(null);
    const [status, setStatus] = useState<EpgStatusFilter>('all');
    const [search, setSearch] = useState('');
    const [destination, setDestination] = useState('');
    const [guide, setGuide] = useState('');
    const [transport, setTransport] = useState('');
    const [centerToken, setCenterToken] = useState(0);
    const [layout, setLayout] = useState<'desktop' | 'mobile' | null>(null);
    const q = useDebouncedValue(search.trim());
    const activeRange = range ?? (clock ? windowFor('days', clock.today) : null);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 1024px)');
        const apply = () => setLayout(media.matches ? 'desktop' : 'mobile');
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setClock({
                today: localIso(now),
                fraction: (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86_400,
            });
        };
        tick();
        const id = window.setInterval(tick, 30_000);
        return () => window.clearInterval(id);
    }, []);

    const timeline = useQuery({
        queryKey: ['operations', 'epg', { from: activeRange?.from, to: activeRange?.to, today: clock?.today, status, q, destination, guide, transport }],
        queryFn: () => getOperationsEpg({
            from: activeRange!.from,
            to: activeRange!.to,
            today: clock!.today,
            status,
            q,
            destination,
            guide,
            transport,
        }),
        enabled: Boolean(activeRange && clock),
        placeholderData: keepPreviousData,
    });

    const counts = timeline.data?.counts;
    const summary = useMemo(() => {
        if (!counts) return null;
        return `${counts.running} running · ${counts['starting-today']} starting · ${counts['ending-today']} ending · ${counts.attention} need attention`;
    }, [counts]);

    const chooseScale = (next: Scale) => {
        if (!activeRange) return;
        setScale(next);
        setDensity(next === 'days' ? 'detailed' : 'compact');
        setRange({ from: activeRange.from, to: addIsoDays(activeRange.from, SCALES[next].days - 1) });
    };

    const shiftWindow = (direction: -1 | 1) => {
        if (!activeRange) return;
        const amount = SCALES[scale].shift * direction;
        setRange({
            from: addIsoDays(activeRange.from, amount),
            to: addIsoDays(activeRange.to, amount),
        });
    };

    const goToday = () => {
        if (!clock) return;
        setRange(windowFor(scale, clock.today));
        setCenterToken((token) => token + 1);
    };

    return (
        <SellerGuard>
            <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4">
                <DashboardCardHeader
                    variant="compact"
                    icon={Plane}
                    badge="Tour operations"
                    title="Tour timeline"
                    description="Every departure on one guide. Columns are calendar dates. The day number inside a row belongs to that departure, counted from its own start."
                    actions={(
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/operations">Operations board</Link>
                        </Button>
                    )}
                />

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                        <div className="relative w-full lg:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search tours, guides, places"
                                className="pl-8"
                                aria-label="Search tours"
                            />
                        </div>
                        <select className={selectClass} value={destination} onChange={(event) => setDestination(event.target.value)} aria-label="Destination">
                            <option value="">All destinations</option>
                            {(timeline.data?.facets.destinations ?? []).map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <select className={selectClass} value={guide} onChange={(event) => setGuide(event.target.value)} aria-label="Guide">
                            <option value="">All guides</option>
                            {(timeline.data?.facets.guides ?? []).map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <select className={selectClass} value={transport} onChange={(event) => setTransport(event.target.value)} aria-label="Transport">
                            <option value="">All transport</option>
                            {(timeline.data?.facets.transports ?? []).map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {FILTERS.map((filter) => {
                            const count = counts?.[filter.id];
                            const active = status === filter.id;
                            return (
                                <button
                                    key={filter.id}
                                    type="button"
                                    onClick={() => setStatus(filter.id)}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-xs font-medium',
                                        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                                    )}
                                >
                                    {filter.label}{count != null ? ` ${count}` : ''}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-md border bg-card">
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftWindow(-1)} aria-label="Earlier dates">
                                <ChevronLeft />
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={goToday}>Today</Button>
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftWindow(1)} aria-label="Later dates">
                                <ChevronRight />
                            </Button>
                        </div>
                        <div className="flex rounded-md border bg-card p-0.5">
                            {(Object.keys(SCALES) as Scale[]).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => chooseScale(key)}
                                    className={cn('rounded px-2.5 py-1 text-xs font-medium', scale === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                                >
                                    {SCALES[key].label}
                                </button>
                            ))}
                        </div>
                        <div className="flex rounded-md border bg-card p-0.5">
                            {(['compact', 'detailed'] as Density[]).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setDensity(key)}
                                    className={cn('rounded px-2.5 py-1 text-xs font-medium capitalize', density === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                        {activeRange && (
                            <span className="text-xs text-muted-foreground">
                                {dateParts(activeRange.from).month} {dateParts(activeRange.from).day} – {dateParts(activeRange.to).month} {dateParts(activeRange.to).day}
                            </span>
                        )}
                        {summary && <span className="text-xs font-medium">{summary}</span>}
                    </div>
                </div>

                {timeline.isError && (
                    <p className="text-sm text-destructive">{timeline.error instanceof Error ? timeline.error.message : 'Could not load the timeline.'}</p>
                )}
                {timeline.data?.truncated && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">Showing the first {timeline.data.departures.length} of {timeline.data.totalMatched} departures. Narrow the dates or filters to see the rest.</p>
                )}

                {!timeline.data && (timeline.isLoading || !activeRange) && (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
                    </div>
                )}

                {timeline.data && timeline.data.departures.length === 0 && (
                    <div className="rounded-lg border bg-card px-6 py-16 text-center">
                        <p className="font-medium">No departures in this window</p>
                        <p className="mt-1 text-sm text-muted-foreground">Try another date range, or clear the filters. Draft tours stay off this guide.</p>
                    </div>
                )}

                {timeline.data && timeline.data.departures.length > 0 && clock && (
                    <>
                        {layout !== 'mobile' && (
                            <div className="hidden h-[calc(100dvh-18rem)] min-h-[28rem] lg:block">
                                <EpgGrid
                                    departures={timeline.data.departures}
                                    dates={timeline.data.dates}
                                    today={clock.today}
                                    fraction={clock.fraction}
                                    density={density}
                                    centerToken={centerToken}
                                />
                            </div>
                        )}
                        {layout === 'mobile' && (
                            <div className="space-y-2">
                                {timeline.data.departures.map((row) => <MobileCard key={row.id} row={row} today={clock.today} />)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </SellerGuard>
    );
}
