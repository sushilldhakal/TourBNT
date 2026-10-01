'use client';

import { CheckCircle2, Clock, Repeat2, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/tourUtils';
import type { BookingTimelineDay, BookingTimelinePartnerStatus } from '@/lib/api/bookings';

const STATUS_META: Record<BookingTimelinePartnerStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
    confirmed: { label: 'Confirmed', icon: CheckCircle2, className: 'status-pill status-pill--confirmed' },
    held: { label: 'Held', icon: Clock, className: 'status-pill status-pill--held' },
    pending: { label: 'Requested', icon: Clock, className: 'status-pill status-pill--pending' },
    countered: { label: 'Countered', icon: Repeat2, className: 'status-pill status-pill--countered' },
    declined: { label: 'Declined', icon: XCircle, className: 'status-pill status-pill--declined' },
    expired: { label: 'Expired', icon: XCircle, className: 'status-pill status-pill--expired' },
    unscheduled: { label: 'Not yet arranged', icon: HelpCircle, className: 'status-pill status-pill--expired' },
};

const ROLE_LABEL: Record<string, string> = {
    accommodation: 'Stay',
    meals: 'Meals',
    guide: 'Guide',
    transport: 'Transport',
    other: 'Also involved',
};

interface BookingTimelineProps {
    days: BookingTimelineDay[];
}

export function BookingTimeline({ days }: BookingTimelineProps) {
    if (!days || days.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                No itinerary information available for this trip yet.
            </div>
        );
    }

    return (
        <div className="space-y-2 relative" role="region" aria-label="Day-by-day trip timeline">
            <div className="absolute left-[18px] sm:left-[22px] top-0 bottom-0 w-[2px] bg-primary/30 z-0" aria-hidden="true" />

            {days.map((day, index) => (
                <div key={day.dayId ?? index} className="flex items-start gap-3 sm:gap-4 relative pb-6 last:pb-0">
                    <div
                        className="shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center z-10 bg-background border-2 border-primary/40 text-foreground"
                        aria-hidden="true"
                    >
                        <span className="font-bold text-xs sm:text-sm">{index + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0 pt-1 sm:pt-2">
                        <h3 className="font-semibold text-sm sm:text-base">{day.title || `Day ${index + 1}`}</h3>
                        {day.date && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{formatDate(day.date)}</p>
                        )}
                        {day.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2">{day.description}</p>
                        )}
                        {day.destination && (
                            <p className="text-xs sm:text-sm mt-1">
                                <span className="font-medium text-muted-foreground">Destination: </span>
                                <span className="text-foreground">{day.destination}</span>
                            </p>
                        )}

                        {day.partners.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {day.partners.map((partner, pIndex) => {
                                    const meta = STATUS_META[partner.status];
                                    const Icon = meta.icon;
                                    return (
                                        <div
                                            key={pIndex}
                                            className={cn('inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs sm:text-sm mr-2', meta.className)}
                                        >
                                            <Icon className="h-3.5 w-3.5 shrink-0" />
                                            <span className="font-medium">{ROLE_LABEL[partner.role] || partner.role}</span>
                                            {partner.businessPartnerName && <span>· {partner.businessPartnerName}</span>}
                                            {partner.serviceTime && (
                                                <span className="opacity-80">
                                                    · {partner.serviceTime}
                                                    {partner.serviceEndTime ? `–${partner.serviceEndTime}` : ''}
                                                </span>
                                            )}
                                            <span className="opacity-80">· {meta.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
