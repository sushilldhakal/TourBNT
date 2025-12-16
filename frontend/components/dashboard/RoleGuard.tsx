'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * RoleGuard Component
 * Protects components/pages based on user roles
 * Client component for role-based access control
 */

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallback?: React.ReactNode;
    redirectTo?: string;
}

export function RoleGuard({
    children,
    allowedRoles,
    fallback,
    redirectTo,
}: RoleGuardProps) {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAuth();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);

    useEffect(() => {
        // Wait for auth to hydrate
        if (!isHydrated) {
            return;
        }

        // Check authentication
        if (!isAuthenticated) {
            if (redirectTo) {
                router.push(redirectTo);
            }
            setHasAccess(false);
            return;
        }

        // Check role - user.roles is a string, allowedRoles is string[]
        const userRole = user.roles;
        const userHasRole = allowedRoles.includes(userRole);
        setHasAccess(userHasRole);

        // Redirect if no access and redirectTo is specified
        if (!userHasRole && redirectTo) {
            router.push(redirectTo);
        }
    }, [allowedRoles, redirectTo, router, isAuthenticated, isHydrated, user.roles]);

    // Loading state - wait for auth hydration
    if (!isHydrated || hasAccess === null) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
        );
    }

    // No access
    if (!hasAccess) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Access Denied
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You don't have permission to access this page.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        Required role(s): {allowedRoles.join(', ')}
                    </p>
                </div>
            </div>
        );
    }

    // Has access
    return <>{children}</>;
}

/**
 * AdminGuard - Shorthand for admin-only access
 */
export function AdminGuard({
    children,
    fallback,
    redirectTo = '/dashboard',
}: Omit<RoleGuardProps, 'allowedRoles'>) {
    return (
        <RoleGuard allowedRoles={['admin']} fallback={fallback} redirectTo={redirectTo}>
            {children}
        </RoleGuard>
    );
}

/**
 * SellerGuard - For seller and admin access
 */
export function SellerGuard({
    children,
    fallback,
    redirectTo = '/dashboard',
}: Omit<RoleGuardProps, 'allowedRoles'>) {
    return (
        <RoleGuard allowedRoles={['seller', 'admin']} fallback={fallback} redirectTo={redirectTo}>
            {children}
        </RoleGuard>
    );
}

/**
 * GuideGuard - For guide and admin access
 */
export function GuideGuard({
    children,
    fallback,
    redirectTo = '/dashboard',
}: Omit<RoleGuardProps, 'allowedRoles'>) {
    return (
        <RoleGuard allowedRoles={['guide', 'admin']} fallback={fallback} redirectTo={redirectTo}>
            {children}
        </RoleGuard>
    );
}

/**
 * AgencyGuard - For agency and admin access
 */
export function AgencyGuard({
    children,
    fallback,
    redirectTo = '/dashboard',
}: Omit<RoleGuardProps, 'allowedRoles'>) {
    return (
        <RoleGuard allowedRoles={['agency', 'admin']} fallback={fallback} redirectTo={redirectTo}>
            {children}
        </RoleGuard>
    );
}

/**
 * TransportGuard - For transport and admin access
 */
export function TransportGuard({
    children,
    fallback,
    redirectTo = '/dashboard',
}: Omit<RoleGuardProps, 'allowedRoles'>) {
    return (
        <RoleGuard allowedRoles={['transport', 'admin']} fallback={fallback} redirectTo={redirectTo}>
            {children}
        </RoleGuard>
    );
}

/**
 * HotelGuard - For hotel and admin access
 */
export function HotelGuard({
    children,
    fallback,
    redirectTo = '/dashboard',
}: Omit<RoleGuardProps, 'allowedRoles'>) {
    return (
        <RoleGuard allowedRoles={['hotel', 'admin']} fallback={fallback} redirectTo={redirectTo}>
            {children}
        </RoleGuard>
    );
}

/**
 * DashboardGuard - For all dashboard-enabled roles
 */
export function DashboardGuard({
    children,
    fallback,
    redirectTo = '/',
}: Omit<RoleGuardProps, 'allowedRoles'>) {
    return (
        <RoleGuard
            allowedRoles={['admin', 'seller', 'guide', 'agency', 'transport', 'hotel']}
            fallback={fallback}
            redirectTo={redirectTo}
        >
            {children}
        </RoleGuard>
    );
}

/**
 * Hook to check if user has role (for conditional rendering)
 */
export function useHasRole(role: string): boolean {
    const { user, isHydrated } = useAuth();

    if (!isHydrated) {
        return false;
    }

    return user.roles === role;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: string[]): boolean {
    const { user, isHydrated } = useAuth();

    if (!isHydrated) {
        return false;
    }

    return roles.includes(user.roles);
}
