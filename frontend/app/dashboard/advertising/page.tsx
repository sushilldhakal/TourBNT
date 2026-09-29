'use client';

import { Megaphone } from 'lucide-react';
import { BusinessTypeDashboard } from '@/components/dashboard/business/BusinessTypeDashboard';

export default function AdvertisingDashboardPage() {
    return (
        <BusinessTypeDashboard
            types={['advertiser']}
            title="Advertising"
            description="Manage your business profile and ad campaigns."
            icon={Megaphone}
            showLogistics={false}
        />
    );
}
