'use client';

import { Truck } from 'lucide-react';
import { BusinessTypeDashboard } from '@/components/dashboard/business/BusinessTypeDashboard';

export default function LogisticsDashboardPage() {
    return (
        <BusinessTypeDashboard
            types={['transport']}
            title="Logistics"
            description="Manage your transport capacity and the pickups you've been booked for."
            icon={Truck}
        />
    );
}
