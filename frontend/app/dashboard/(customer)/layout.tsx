'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/config/roles';

/**
 * Customer route group layout (e.g. "My Bookings").
 * Open to any authenticated dashboard user, except admins: these are personal
 * pages, and platform-wide bookings live under Tours → Bookings.
 */
export default function DashboardCustomerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, isHydrated } = useAuth();
    const admin = isHydrated && isAdmin(user.roles);

    useEffect(() => {
        if (admin) router.replace('/dashboard/tours/bookings');
    }, [admin, router]);

    if (admin) return null;
    return <>{children}</>;
}
