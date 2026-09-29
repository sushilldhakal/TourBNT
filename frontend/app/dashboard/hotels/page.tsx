'use client';

import { Building2 } from 'lucide-react';
import { BusinessTypeDashboard } from '@/components/dashboard/business/BusinessTypeDashboard';

export default function HotelsDashboardPage() {
    return (
        <BusinessTypeDashboard
            types={['hotel', 'guesthouse']}
            title="Hotels & Guesthouses"
            description="Manage your property, room availability, and the tours booking you."
            icon={Building2}
        />
    );
}
