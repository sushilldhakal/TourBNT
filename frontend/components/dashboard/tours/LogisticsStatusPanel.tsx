'use client';

import { useMemo } from 'react';
import { CheckCircle2, Clock, XCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTourLogisticsStatus } from '@/lib/queries';
import { useTourContext } from '@/providers/TourProvider';
import { format } from 'date-fns';

const STATUS_META = {
    confirmed: { label: 'Confirmed', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    pending: { label: 'Awaiting confirmation', icon: Clock, className: 'text-amber-600 bg-amber-50 border-amber-200' },
    declined: { label: 'Declined', icon: XCircle, className: 'text-destructive bg-destructive/5 border-destructive/20' },
} as const;

const ROLE_LABEL: Record<string, string> = {
    accommodation: 'Accommodation',
    meals: 'Meals',
    guide: 'Guide',
    transport: 'Transport',
    other: 'Other',
};

/**
 * Read-only view of whether each linked hotel/restaurant/guide/transport
 * provider has confirmed capacity for this tour's fixed-departure dates.
 * A fixed-departure date isn't bookable by travelers until every row for
 * it shows "Confirmed" — see BookingService.checkAvailabilityForTour.
 */
export function LogisticsStatusPanel() {
    const { tourId } = useTourContext();
    const { data: requests, isLoading } = useTourLogisticsStatus(tourId, !!tourId);

    const groupedByDate = useMemo(() => {
        if (!requests || requests.length === 0) return [];
        const byDate = new Map<string, typeof requests>();
        for (const r of requests) {
            const list = byDate.get(r.serviceDate) || [];
            list.push(r);
            byDate.set(r.serviceDate, list);
        }
        return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
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
                    Whether the hotels, restaurants, guides, and transport providers linked to this itinerary have confirmed
                    capacity for each fixed departure date. A date isn&apos;t bookable by travelers until every row below is confirmed.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {groupedByDate.map(([date, rows]) => (
                    <div key={date} className="space-y-2">
                        <p className="text-sm font-medium">{format(new Date(date), 'EEEE, MMM d, yyyy')}</p>
                        <div className="space-y-1.5">
                            {rows.map((r) => {
                                const meta = STATUS_META[r.status];
                                const Icon = meta.icon;
                                return (
                                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                                        <div className="min-w-0">
                                            <span className="font-medium">{r.partnerName}</span>
                                            <span className="text-muted-foreground"> · {ROLE_LABEL[r.role] || r.role}</span>
                                            {r.serviceTime && <span className="text-muted-foreground"> · {r.serviceTime}</span>}
                                            <span className="text-muted-foreground"> · {r.headcount} guests</span>
                                        </div>
                                        <Badge variant="outline" className={`gap-1.5 shrink-0 ${meta.className}`}>
                                            <Icon className="h-3 w-3" />
                                            {meta.label}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
