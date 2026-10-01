import { UserRole } from '@/lib/utils/roles';

/**
 * Which roles may open which /dashboard routes — the single source of truth
 * used by BOTH the server-side proxy (blocks before any page renders) and the
 * dashboard layout (client fallback). The sidebar's `roles` lists must stay in
 * line with this. The API enforces its own role checks independently.
 *
 * Longest matching prefix wins. A path matching no rule is open to every role
 * that can use the dashboard at all (e.g. /dashboard, /dashboard/profile,
 * /dashboard/message).
 *
 * Partner pages also admit `seller` and `admin`: a seller (or admin) can own a
 * business listing, and ownership isn't known at routing time — the page's own
 * data fetch decides what they actually see.
 */
const A = UserRole.ADMIN;
const S = UserRole.SELLER;

export const DASHBOARD_ACCESS_RULES: ReadonlyArray<{ prefix: string; roles: readonly string[] }> = [
    // Tour operator tools
    { prefix: '/dashboard/tours', roles: [A, S] },
    { prefix: '/dashboard/posts', roles: [A, S] },
    { prefix: '/dashboard/gallery', roles: [A, S] },
    { prefix: '/dashboard/settings', roles: [A, S] },

    // Platform administration
    { prefix: '/dashboard/users', roles: [A] },
    { prefix: '/dashboard/subscribers', roles: [A] },
    { prefix: '/dashboard/operations', roles: [A] },
    { prefix: '/dashboard/ads', roles: [A] }, // ad moderation queue
    { prefix: '/dashboard/business-partners', roles: [A] },

    // Business-partner workspaces — each only for its own type
    { prefix: '/dashboard/hotels', roles: [A, S, UserRole.HOTEL, UserRole.GUESTHOUSE] },
    { prefix: '/dashboard/restaurants', roles: [A, S, UserRole.RESTAURANT] },
    { prefix: '/dashboard/guides', roles: [A, S, UserRole.GUIDE] },
    { prefix: '/dashboard/logistics', roles: [A, S, UserRole.TRANSPORT] },
    { prefix: '/dashboard/advertising', roles: [A, S, UserRole.ADVERTISER] },

    // Customer area — dashboard roles other than customers never use it
    { prefix: '/dashboard/bookings', roles: [UserRole.USER] },
];

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/');

/** True if `role` may open `path` (a /dashboard/... pathname). */
export function canAccessDashboardPath(path: string, role: string | null | undefined): boolean {
    if (!role) return false;
    let best: { prefix: string; roles: readonly string[] } | undefined;
    for (const rule of DASHBOARD_ACCESS_RULES) {
        if (matches(path, rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) best = rule;
    }
    return best ? best.roles.includes(role) : true;
}
