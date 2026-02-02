'use client';

import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { CalendarCheck } from 'lucide-react';

export default function TourBookingsPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={CalendarCheck}
                badge="Tours"
                title="Tour Bookings"
                description="View and manage bookings for your tours"
            />
            <p className="text-muted-foreground">Tour bookings management coming soon.</p>
        </div>
    );
}
