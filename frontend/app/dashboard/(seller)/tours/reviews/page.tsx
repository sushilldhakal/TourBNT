'use client';

import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { Star } from 'lucide-react';

export default function TourReviewsPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={Star}
                badge="Tours"
                title="Tour Reviews"
                description="View and manage reviews for your tours"
            />
            <p className="text-muted-foreground">Tour reviews management coming soon.</p>
        </div>
    );
}
