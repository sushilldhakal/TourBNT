'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatPrice, getAdStats, type Advertisement, type AdStats } from '@/lib/api/ads';

/** Plan summary line, e.g. "Monthly · 2 months · Rs 10,000" or "10,000 views · Rs 5,000". */
export function describePlan(ad: Pick<Advertisement, 'billingModel' | 'durationMonths' | 'viewQuota' | 'priceAmount' | 'currency'>): string {
    const price = formatPrice(ad.priceAmount, ad.currency);
    if (ad.billingModel === 'per_view') {
        return `${(ad.viewQuota ?? 0).toLocaleString('en-IN')} views within ${ad.durationMonths} month${ad.durationMonths === 1 ? '' : 's'} · ${price}`;
    }
    return `Monthly · ${ad.durationMonths} month${ad.durationMonths === 1 ? '' : 's'} · ${price}`;
}

/** Review / payment / delivery state as badges. */
export function AdStatusBadges({ ad }: { ad: Advertisement }) {
    const review = ad.approvalStatus;
    const now = Date.now();
    const scheduled = ad.campaignStatus === 'active' && ad.startDate && new Date(ad.startDate).getTime() > now;
    const delivery = review !== 'approved' || !ad.isPaid
        ? null
        : ad.campaignStatus === 'ended'
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
    const byDate = new Map(stats.daily.map((d) => [String(d.date).slice(0, 10), d]));
    const series = Array.from({ length: days }, (_, i) => {
        const date = new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
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
