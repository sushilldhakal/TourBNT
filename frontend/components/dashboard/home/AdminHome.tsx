'use client';

import { format } from 'date-fns';
import { ClipboardCheck, Users, MapPin, CalendarCheck, DollarSign, Star, Megaphone, AlertTriangle } from 'lucide-react';
import type { AdminHomeSummary } from '@/lib/api/adminLists';
import { Empty, Section, StatCard, StatusBadge, money, num } from './HomeShared';

export function AdminHome({ data }: { data: AdminHomeSummary }) {
    const attention = data.pendingApplications.total + data.pendingReviews + data.ads.pending + data.supplierRequests.problems;
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-3">Needs your attention {attention === 0 && <span className="text-sm font-normal text-muted-foreground">— all clear</span>}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon={ClipboardCheck} label="Applications to review" value={data.pendingApplications.total} href="/dashboard/users/seller-applications"
                        hint={`${data.pendingApplications.sellers} sellers · ${data.pendingApplications.partners} businesses`} tone={data.pendingApplications.total ? 'warn' : undefined} />
                    <StatCard icon={Star} label="Reviews to moderate" value={data.pendingReviews} href="/dashboard/tours/reviews" tone={data.pendingReviews ? 'warn' : undefined} />
                    <StatCard icon={Megaphone} label="Ads awaiting approval" value={data.ads.pending} href="/dashboard/ads" hint={`${data.ads.active} campaigns live`} tone={data.ads.pending ? 'warn' : undefined} />
                    <StatCard icon={AlertTriangle} label="Supplier problems" value={data.supplierRequests.problems} href="/dashboard/operations"
                        hint={`${data.supplierRequests.open} requests still open`} tone={data.supplierRequests.problems ? 'bad' : undefined} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} label="Users" value={num(data.users.total)} href="/dashboard/users" hint={`${data.users.customers} customers · ${data.users.sellers} sellers · ${data.users.partners} partners`} />
                <StatCard icon={MapPin} label="Tours" value={data.tours.total} hint={`${data.tours.published} published · ${data.tours.draft} draft`} />
                <StatCard icon={CalendarCheck} label="Bookings" value={num(data.bookings.total)} href="/dashboard/tours/bookings" hint={`${data.bookings.pending} pending · ${data.bookings.upcoming} departing in 30 days`} />
                <StatCard icon={DollarSign} label="Revenue" value={money(data.bookings.revenue)} hint={`${money(data.bookings.collected)} collected`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Latest applications" action={{ label: 'Review all', href: '/dashboard/users/seller-applications' }}>
                    {data.latestApplications.length === 0 ? <Empty>No applications waiting.</Empty> : (
                        <ul className="divide-y">
                            {data.latestApplications.map((a) => (
                                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                                    <div><div className="font-medium">{a.name}</div><div className="text-xs text-muted-foreground capitalize">{a.type} · applied {format(new Date(a.submittedAt), 'MMM dd')}</div></div>
                                    <StatusBadge status="pending" />
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
                                    <div className="min-w-0"><div className="font-medium truncate">{b.tourTitle}</div><div className="text-xs text-muted-foreground truncate">{b.contactName} · {money(b.total)} · {format(new Date(b.departureDate), 'MMM dd, yyyy')}</div></div>
                                    <StatusBadge status={b.status} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>
        </div>
    );
}
