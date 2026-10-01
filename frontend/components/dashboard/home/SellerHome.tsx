'use client';

import { format } from 'date-fns';
import { CalendarCheck, DollarSign, MapPin, Star, MessageSquare, Clock } from 'lucide-react';
import type { SellerHomeSummary } from '@/lib/api/adminLists';
import { Empty, Section, StatCard, StatusBadge, money, num } from './HomeShared';
import { PartnerHome } from './PartnerHome';

export function SellerHome({ data }: { data: SellerHomeSummary }) {
    const needs = data.bookings.pending + data.reviews.pending + data.openEnquiries;
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-3">Needs your attention {needs === 0 && <span className="text-sm font-normal text-muted-foreground">— all clear</span>}</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard icon={Clock} label="Bookings to confirm" value={data.bookings.pending} href="/dashboard/tours/bookings" tone={data.bookings.pending ? 'warn' : undefined} />
                    <StatCard icon={Star} label="Reviews to moderate" value={data.reviews.pending} href="/dashboard/tours/reviews" tone={data.reviews.pending ? 'warn' : undefined} />
                    <StatCard icon={MessageSquare} label="Open enquiries" value={data.openEnquiries} href="/dashboard/message" tone={data.openEnquiries ? 'warn' : undefined} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={MapPin} label="My tours" value={data.tours.total} href="/dashboard/tours" hint={`${data.tours.published} published · ${data.tours.draft} draft`} />
                <StatCard icon={CalendarCheck} label="Bookings" value={num(data.bookings.total)} href="/dashboard/tours/bookings" hint={`${data.bookings.confirmed} confirmed · ${data.bookings.upcoming} departing in 30 days`} />
                <StatCard icon={DollarSign} label="Revenue" value={money(data.bookings.revenue)} hint={`${money(data.bookings.collected)} collected`} />
                <StatCard icon={Star} label="Rating" value={data.reviews.approved ? `${data.reviews.average} / 5` : '—'} hint={`${data.reviews.approved} approved reviews · ${num(data.tours.views)} tour views`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Upcoming departures" action={{ label: 'Bookings', href: '/dashboard/tours/bookings' }}>
                    {data.upcomingDepartures.length === 0 ? <Empty>No upcoming departures.</Empty> : (
                        <ul className="divide-y">
                            {data.upcomingDepartures.map((d) => (
                                <li key={`${d.tourId}-${d.departure}`} className="flex items-center justify-between py-2 text-sm">
                                    <div><div className="font-medium">{d.title}</div><div className="text-xs text-muted-foreground">{format(new Date(d.departure), 'EEE, MMM dd yyyy')}</div></div>
                                    <div className="text-right text-xs text-muted-foreground">{d.bookings} booking{d.bookings === 1 ? '' : 's'}<br />{d.pax} traveller{d.pax === 1 ? '' : 's'}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
                <Section title="Recent bookings" action={{ label: 'All bookings', href: '/dashboard/tours/bookings' }}>
                    {data.recentBookings.length === 0 ? <Empty>No bookings yet.</Empty> : (
                        <ul className="divide-y">
                            {data.recentBookings.map((b) => (
                                <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                    <div className="min-w-0"><div className="font-medium truncate">{b.tourTitle}</div><div className="text-xs text-muted-foreground truncate">{b.contactName} · {money(b.total)}</div></div>
                                    <StatusBadge status={b.status} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>

            {/* A seller who also runs an approved business sees that workspace too */}
            {data.partners.length > 0 && <PartnerHome partners={data.partners} heading="Your business listings" />}
        </div>
    );
}
