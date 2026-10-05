'use client';

import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatPrice, getAdPlacementPreview, getAdStats, type Advertisement, type AdStats } from '@/lib/api/ads';

/** Plan summary line, e.g. "Monthly · 2 months · Rs 10,000" or "10,000 views · Rs 5,000". */
export function describePlan(ad: Pick<Advertisement, 'billingModel' | 'durationMonths' | 'viewQuota' | 'priceAmount' | 'currency'>): string {
    const price = formatPrice(ad.priceAmount, ad.currency);
    if (ad.billingModel === 'per_view') {
        return `${(ad.viewQuota ?? 0).toLocaleString('en-IN')} views within ${ad.durationMonths} month${ad.durationMonths === 1 ? '' : 's'} · ${price}`;
    }
    return `Monthly · ${ad.durationMonths} month${ad.durationMonths === 1 ? '' : 's'} · ${price}`;
}

let openedAt = 0;
function subscribeToClock() {
    return () => {};
}
function clientOpenedAt() {
    if (openedAt === 0) openedAt = Date.now();
    return openedAt;
}
function useOpenedAt() {
    return useSyncExternalStore(subscribeToClock, clientOpenedAt, () => 0);
}

/** Review / payment / delivery state as badges. */
export function AdStatusBadges({ ad }: { ad: Advertisement }) {
    const review = ad.approvalStatus;
    const now = useOpenedAt();
    const scheduled = now > 0 && ad.campaignStatus === 'active' && ad.startDate && new Date(ad.startDate).getTime() > now;
    const viewsUsedUp = ad.billingModel === 'per_view' && ad.viewQuota != null && ad.impressionCount >= ad.viewQuota;
    const delivery = review !== 'approved' || !ad.isPaid
        ? null
        : ad.campaignStatus === 'ended' || viewsUsedUp
            ? 'Ended'
            : ad.campaignStatus === 'paused'
                ? 'Paused'
                : scheduled
                    ? 'Scheduled'
                    : ad.campaignStatus === 'active'
                        ? 'Live'
                        : 'Draft';
    return (
        <div className="flex flex-wrap gap-2">
            <Badge variant={review === 'approved' ? 'default' : review === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                {review === 'pending' ? 'In review' : review}
            </Badge>
            <Badge variant={ad.isPaid ? 'default' : 'outline'}>{ad.isPaid ? 'Paid' : 'Payment due'}</Badge>
            {delivery && <Badge variant={delivery === 'Live' ? 'default' : 'secondary'}>{delivery}</Badge>}
        </div>
    );
}

/** Delivery numbers for one campaign: totals, CTR, quota/period progress and a daily chart. */
export function AdStatsPanel({ adId, days = 30 }: { adId: string; days?: number }) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['ad-stats', adId, days],
        queryFn: () => getAdStats(adId, days),
        staleTime: 60_000,
    });

    if (isLoading) return <p className="text-sm text-muted-foreground">Loading stats…</p>;
    if (!stats) return <p className="text-sm text-muted-foreground">Stats unavailable.</p>;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Views" value={stats.totalImpressions.toLocaleString('en-IN')} />
                <Stat label="Clicks" value={stats.totalClicks.toLocaleString('en-IN')} />
                <Stat label="Click rate" value={`${(stats.ctr * 100).toFixed(1)}%`} />
                <Stat
                    label={stats.daysRemaining != null ? 'Days left' : 'Run period'}
                    value={stats.daysRemaining != null ? String(stats.daysRemaining) : 'Starts when live'}
                />
            </div>

            {stats.billingModel === 'per_view' && stats.viewQuota != null && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{stats.totalImpressions.toLocaleString('en-IN')} of {stats.viewQuota.toLocaleString('en-IN')} views delivered</span>
                        <span>{(stats.viewsRemaining ?? 0).toLocaleString('en-IN')} left</span>
                    </div>
                    <Progress value={Math.min((stats.totalImpressions / Math.max(stats.viewQuota, 1)) * 100, 100)} />
                </div>
            )}

            {(stats.startDate || stats.endDate) && (
                <p className="text-xs text-muted-foreground">
                    Runs {stats.startDate ? new Date(stats.startDate).toLocaleDateString() : '—'} → {stats.endDate ? new Date(stats.endDate).toLocaleDateString() : '—'}
                </p>
            )}

            <DailyChart stats={stats} days={days} />
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
    );
}

/** Views per day as bars, clicks as a dark cap on each bar. */
function DailyChart({ stats, days }: { stats: AdStats; days: number }) {
    const now = useOpenedAt();
    const byDate = new Map(stats.daily.map((d) => [String(d.date).slice(0, 10), d]));
    if (now === 0) return null;
    const series = Array.from({ length: days }, (_, i) => {
        const date = new Date(now - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
        const row = byDate.get(date);
        return { date, impressions: row?.impressions ?? 0, clicks: row?.clicks ?? 0 };
    });
    const max = Math.max(...series.map((d) => d.impressions), 1);
    if (series.every((d) => d.impressions === 0 && d.clicks === 0)) {
        return <p className="text-xs text-muted-foreground">No views in the last {days} days yet.</p>;
    }

    return (
        <div>
            <p className="text-xs text-muted-foreground mb-2">Last {days} days — views (bar) and clicks (dark top)</p>
            <div className="flex items-end gap-[2px] h-24" role="img" aria-label={`Daily views and clicks for the last ${days} days`}>
                {series.map((d) => (
                    <div
                        key={d.date}
                        className="flex-1 flex flex-col justify-end h-full"
                        title={`${d.date}: ${d.impressions} views, ${d.clicks} clicks`}
                    >
                        <div className="w-full rounded-t-sm bg-primary/30 flex flex-col justify-start overflow-hidden" style={{ height: `${(d.impressions / max) * 100}%`, minHeight: d.impressions ? 2 : 0 }}>
                            {d.clicks > 0 && <div className="w-full bg-primary" style={{ height: `${Math.min((d.clicks / Math.max(d.impressions, 1)) * 100, 100)}%`, minHeight: 2 }} />}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{series[0].date}</span>
                <span>{series[series.length - 1].date}</span>
            </div>
        </div>
    );
}

/** Plain answer to "where is this ad on the site?" — live status, places (and where each
 *  comes from), tour types, and the actual tour pages showing it. */
export function AdWhereItShows({ adId }: { adId: string }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['ad-where', adId],
        queryFn: () => getAdPlacementPreview(adId),
        staleTime: 30_000,
    });

    if (isLoading) return <p className="text-sm text-muted-foreground">Checking where this ad shows…</p>;
    if (isError || !data) return <p className="text-sm text-destructive">Couldn&apos;t check placements.</p>;

    return (
        <div className="space-y-4 text-sm">
            {data.serving ? (
                <p className="rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-green-700 dark:text-green-400">
                    Live on the site now.
                </p>
            ) : (
                <div className="rounded-md border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-300">
                    <p className="font-medium">Not showing to visitors right now</p>
                    <ul className="list-disc pl-5 mt-1">
                        {data.blockers.map((b) => <li key={b}>{b}</li>)}
                        {data.blockers.length === 0 && <li>No page on the site matches it yet</li>}
                    </ul>
                </div>
            )}

            <div>
                <p className="font-medium mb-1">Places</p>
                {data.places.length === 0 ? <p className="text-muted-foreground">None</p> : (
                    <div className="flex flex-wrap gap-2">
                        {data.places.map((p) => (
                            <Badge key={p.id} variant="secondary" title={`From ${p.source}`}>{p.name} · {p.source}</Badge>
                        ))}
                    </div>
                )}
            </div>
            <div>
                <p className="font-medium mb-1">Tour types</p>
                <p className="text-muted-foreground">{data.tourTypes.length ? data.tourTypes.map((t) => t.name).join(', ') : 'Any (not restricted)'}</p>
            </div>

            <div>
                <p className="font-medium mb-1">{data.serving ? 'Shows on' : 'Would show on (once live)'}</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    {data.surfaces.map((s) => <li key={s}>{s}</li>)}
                </ul>
            </div>

            {data.tours.length > 0 && (
                <div>
                    <p className="font-medium mb-1">Tour pages ({data.tourCount})</p>
                    <ul className="space-y-1 max-h-56 overflow-y-auto pr-2">
                        {data.tours.map((t) => (
                            <li key={t.id}>
                                <a href={`/tours/${t.id}`} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{t.title}</a>
                            </li>
                        ))}
                    </ul>
                    {data.tourCount > data.tours.length && <p className="text-xs text-muted-foreground mt-1">…and {data.tourCount - data.tours.length} more</p>}
                </div>
            )}
        </div>
    );
}
