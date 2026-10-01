'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getDashboardSummary } from '@/lib/api/adminLists';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { ErrorState } from '@/components/dashboard/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminHome } from '@/components/dashboard/home/AdminHome';
import { SellerHome } from '@/components/dashboard/home/SellerHome';
import { PartnerHome } from '@/components/dashboard/home/PartnerHome';

/**
 * Dashboard home. What it shows depends on who is signed in — platform-wide
 * figures for an admin, tours/bookings for a seller, and the business's own
 * requests/inventory/reviews/ads for a hotel, restaurant, guide, transport
 * company or advertiser. The server scopes the numbers (GET /dashboard/summary).
 */
export default function DashboardPage() {
    const { user, isHydrated } = useAuth();
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['dashboard', 'summary', user.id],
        queryFn: getDashboardSummary,
        enabled: isHydrated && !!user.id,
        staleTime: 30_000,
    });

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={LayoutDashboard}
                badge="Dashboard"
                title="Dashboard"
                description={`Welcome back${user.name ? `, ${user.name}` : ''}! ${format(new Date(), 'EEEE, MMMM d, yyyy')}`}
            />

            {isError ? (
                <ErrorState title="Could not load your dashboard" description={error instanceof Error ? error.message : 'Please try again.'} onRetry={() => refetch()} />
            ) : isLoading || !data ? (
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
                    <Skeleton className="h-64" />
                </div>
            ) : data.kind === 'admin' ? (
                <AdminHome data={data} />
            ) : data.kind === 'seller' ? (
                <SellerHome data={data} />
            ) : (
                <PartnerHome partners={data.partners} />
            )}
        </div>
    );
}
