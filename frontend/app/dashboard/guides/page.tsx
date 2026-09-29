'use client';

import { Compass } from 'lucide-react';
import { BusinessTypeDashboard } from '@/components/dashboard/business/BusinessTypeDashboard';

export default function GuidesDashboardPage() {
    return (
        <BusinessTypeDashboard
            types={['guide']}
            title="Guide"
            description="Manage your profile, availability, and the tours you've been booked to lead."
            icon={Compass}
        />
    );
}
