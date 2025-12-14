import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { DashboardLayoutClient } from '@/components/dashboard/layout/DashboardLayoutClient';
import { jwtDecode } from 'jwt-decode';
import { canAccessDashboard } from '@/lib/utils/roles';

/**
 * Dashboard Layout (Server Component)
 * Handles server-side authentication check and role-based access
 * Only admin and seller roles can access the dashboard
 */

interface DecodedToken {
    sub: string;
    roles: string;
    exp: number;
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Server-side auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    // Redirect to login if no token
    if (!token) {
        redirect('/auth/login?redirect=/dashboard');
    }

    try {
        // Decode token to check role
        const decoded = jwtDecode<DecodedToken>(token.value);

        // Check if user has dashboard access using centralized utility
        if (!canAccessDashboard(decoded.roles)) {
            // Regular users (user, subscriber) should not access dashboard - redirect to home
            redirect('/?error=unauthorized');
        }

        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp < currentTime) {
            redirect('/auth/login?error=expired');
        }
    } catch (error) {
        // Invalid token - redirect to login
        console.error('Invalid token:', error);
        redirect('/auth/login?error=invalid');
    }

    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
