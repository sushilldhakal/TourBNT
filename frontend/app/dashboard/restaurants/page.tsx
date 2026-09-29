'use client';

import { Utensils } from 'lucide-react';
import { BusinessTypeDashboard } from '@/components/dashboard/business/BusinessTypeDashboard';

export default function RestaurantsDashboardPage() {
    return (
        <BusinessTypeDashboard
            types={['restaurant']}
            title="Restaurant"
            description="Manage your restaurant, seating capacity, and the meal requests coming your way."
            icon={Utensils}
        />
    );
}
