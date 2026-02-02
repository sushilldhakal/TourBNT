'use client';

import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { UserCheck } from 'lucide-react';

export default function SellerApplicationsPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={UserCheck}
                badge="Users"
                title="Seller Applications"
                description="Review and manage seller applications"
            />
            <p className="text-muted-foreground">Seller applications management coming soon.</p>
        </div>
    );
}
