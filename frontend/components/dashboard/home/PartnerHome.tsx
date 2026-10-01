'use client';

import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Bed, Utensils, Compass, Truck, Megaphone, Star, CheckCircle2, Inbox, PauseCircle, MousePointerClick, BarChart3, Percent, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PartnerSummary } from '@/lib/api/adminLists';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, Section, StatCard, StatusBadge, num } from './HomeShared';

// Everything that differs between a hotel, a restaurant, a guide, a transport company and an advertiser.
const TYPE_CONFIG: Record<PartnerSummary['type'], { label: string; icon: LucideIcon; href: string; requests: string; inventory?: { label: string; icon: LucideIcon } }> = {
    hotel: { label: 'Hotel', icon: Bed, href: '/dashboard/hotels', requests: 'Room requests', inventory: { label: 'Rooms', icon: Bed } },
    guesthouse: { label: 'Guesthouse', icon: Bed, href: '/dashboard/hotels', requests: 'Room requests', inventory: { label: 'Rooms', icon: Bed } },
    restaurant: { label: 'Restaurant', icon: Utensils, href: '/dashboard/restaurants', requests: 'Meal requests', inventory: { label: 'Seats', icon: Utensils } },
    guide: { label: 'Guide', icon: Compass, href: '/dashboard/guides', requests: 'Guiding requests' },
    transport: { label: 'Transport', icon: Truck, href: '/dashboard/logistics', requests: 'Vehicle requests', inventory: { label: 'Vehicles', icon: Truck } },
    advertiser: { label: 'Advertiser', icon: Megaphone, href: '/dashboard/advertising', requests: '' },
};

function Listing({ p }: { p: PartnerSummary }) {
    const cfg = TYPE_CONFIG[p.type];
    const isAdvertiser = p.type === 'advertiser';
    const awaiting = p.requests.pending + p.requests.countered;
    const problems = p.requests.declined + p.requests.expired;

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><cfg.icon className="h-5 w-5 text-primary" /></div>
                        <div className="min-w-0">
                            <div className="font-semibold truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{cfg.label}{!p.isActive ? ' · inactive' : ''}</div>
                        </div>
                    </div>
                    <StatusBadge status={p.approvalStatus} />
                </CardContent>
            </Card>

            {p.approvalStatus !== 'approved' && (
                <Card className="border-amber-500/40">
                    <CardContent className="py-4 text-sm">
                        {p.approvalStatus === 'pending'
                            ? 'Your listing is waiting for admin approval. You will be notified as soon as it is reviewed.'
                            : `Your application was rejected${p.rejectionReason ? `: ${p.rejectionReason}` : '.'} Update your listing and reapply.`}
                    </CardContent>
                </Card>
            )}

            {isAdvertiser ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon={Megaphone} label="Active campaigns" value={p.ads.active} href={cfg.href} hint={`${p.ads.total} total · ${p.ads.pending} awaiting approval`} />
                    <StatCard icon={BarChart3} label="Impressions" value={num(p.ads.impressions)} hint="All campaigns" />
                    <StatCard icon={MousePointerClick} label="Clicks" value={num(p.ads.clicks)} />
                    <StatCard icon={Percent} label="Click-through rate" value={`${p.ads.ctr}%`} tone={p.ads.ctr >= 3 ? 'good' : undefined} />
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={Inbox} label="Awaiting your response" value={awaiting} href={cfg.href} tone={awaiting ? 'warn' : undefined} hint={`${cfg.requests.toLowerCase()} · ${p.requests.pending} new, ${p.requests.countered} countered`} />
                        <StatCard icon={PauseCircle} label="On hold" value={p.requests.held} href={cfg.href} hint="Confirm before the hold expires" tone={p.requests.held ? 'warn' : undefined} />
                        <StatCard icon={CheckCircle2} label="Confirmed" value={p.requests.confirmed} hint={`${p.requests.upcomingConfirmed} in the next 30 days`} tone="good" />
                        <StatCard icon={Clock} label="Declined / expired" value={problems} tone={problems ? 'bad' : undefined} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {cfg.inventory && <StatCard icon={cfg.inventory.icon} label={cfg.inventory.label} value={num(p.inventory.totalUnits)} href={cfg.href} hint={`${p.inventory.types} ${p.inventory.types === 1 ? 'type' : 'types'} configured`} />}
                        <StatCard icon={Star} label="Rating" value={p.reviewCount ? `${p.averageRating} / 5` : '—'} hint={`${p.reviewCount} reviews${p.pendingReviews ? ` · ${p.pendingReviews} to moderate` : ''}`} />
                    </div>

                    <Section title="Requests waiting for you" action={{ label: 'Open workspace', href: cfg.href }}>
                        {p.nextRequests.length === 0 ? <Empty>Nothing waiting — you are up to date.</Empty> : (
                            <ul className="divide-y">
                                {p.nextRequests.map((r) => (
                                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                        <div className="min-w-0">
                                            <div className="font-medium truncate">{r.tourTitle}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(r.serviceDate), 'EEE, MMM dd')}{r.serviceTime ? ` · ${r.serviceTime}` : ''}{r.unitsRequested ? ` · ${r.unitsRequested} ${cfg.inventory?.label.toLowerCase() ?? 'requested'}` : ''}
                                                {r.status === 'pending' && r.respondByAt ? ` · respond within ${formatDistanceToNowStrict(new Date(r.respondByAt))}` : ''}
                                                {r.status === 'held' && r.holdExpiresAt ? ` · hold expires in ${formatDistanceToNowStrict(new Date(r.holdExpiresAt))}` : ''}
                                            </div>
                                        </div>
                                        <StatusBadge status={r.status} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                </>
            )}
        </div>
    );
}

export function PartnerHome({ partners, heading }: { partners: PartnerSummary[]; heading?: string }) {
    if (partners.length === 0) {
        return (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                No business listing is linked to your account yet. <Link href="/apply-partner" className="text-primary underline">Apply as a partner</Link>.
            </CardContent></Card>
        );
    }
    return (
        <div className="space-y-10">
            {heading && <h3 className="text-lg font-semibold -mb-4">{heading}</h3>}
            {partners.map((p) => <Listing key={p.id} p={p} />)}
        </div>
    );
}
