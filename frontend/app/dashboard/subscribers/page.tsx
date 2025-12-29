'use client';

import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { AddSubscriber, SubscriberList } from '@/components/dashboard/subscriber';

export default function SubscribersPage() {
    return (
        <AdminGuard>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscribers Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage newsletter subscribers and add new ones
                    </p>
                </div>

                <div className="grid gap-6">
                    <AddSubscriber />
                    <SubscriberList />
                </div>
            </div>
        </AdminGuard>
    );
}
