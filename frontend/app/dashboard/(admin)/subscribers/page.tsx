'use client';

import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { AddSubscriber, SubscriberList } from '@/components/dashboard/subscriber';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { Mail } from 'lucide-react';

export default function SubscribersPage() {
    return (
        <AdminGuard>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <DashboardCardHeader
                    variant="compact"
                    icon={Mail}
                    badge="Subscribers"
                    title="Subscribers Management"
                    description="Manage newsletter subscribers and add new ones"
                />

                <div className="grid min-w-0 gap-6">
                    <AddSubscriber />
                    <SubscriberList />
                </div>
            </div>
        </AdminGuard>
    );
}
