'use client';

/**
 * Customer route group layout (e.g. my bookings).
 * No role guard – any authenticated dashboard user can access.
 */
export default function DashboardCustomerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
