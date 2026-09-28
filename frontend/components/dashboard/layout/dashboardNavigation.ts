import {
    Home, FileText, Users, Image, Settings, Mail, LayoutDashboard,
    List, MapPin, FolderTree, Lightbulb, HelpCircle, Calendar, Star, Wrench,
    MessageSquare, Plus, Briefcase, UserCog, CalendarCheck, Building2, Megaphone
} from 'lucide-react';
import type { NavigationItem, FlatNavItem } from '@/types/dashboard';

export type { NavigationItem, FlatNavItem } from '@/types/dashboard';

/**
 * Single source of truth for dashboard navigation.
 * Used by DashboardSidebar and DashboardHeader (command search).
 */
export const baseNavigationItems: NavigationItem[] = [
    {
        href: '/dashboard',
        label: 'Dashboard',
        icon: Home,
    },
    {
        label: 'Posts',
        icon: FileText,
        children: [
            { href: '/dashboard/posts', label: 'All Posts', icon: List },
            { href: '/dashboard/posts/add', label: 'Add Post', icon: Plus },
            { href: '/dashboard/posts/comments', label: 'Comments', icon: MessageSquare },
        ],
    },
    {
        label: 'Tours',
        icon: LayoutDashboard,
        children: [
            { href: '/dashboard/tours', label: 'All Tours', icon: List },
            { href: '/dashboard/tours/add', label: 'Add Tour', icon: Plus },
            { href: '/dashboard/tours/destination', label: 'Destinations', icon: MapPin},
            { href: '/dashboard/tours/categories', label: 'Categories', icon: FolderTree},
            { href: '/dashboard/tours/facts', label: 'Facts', icon: Lightbulb },
            { href: '/dashboard/tours/faq', label: 'FAQ', icon: HelpCircle },
            { href: '/dashboard/tours/bookings', label: 'Bookings', icon: Calendar },
            { href: '/dashboard/tours/reviews', label: 'Reviews', icon: Star },
            { href: '/dashboard/tours/settings', label: 'Settings', icon: Wrench },
        ],
    },
    {
        href: '/dashboard/gallery',
        label: 'Gallery',
        icon: Image,
    },
    {
        label: 'Users',
        icon: Users,
        children: [
            { href: '/dashboard/users', label: 'All Users', icon: List, adminOnly: true },
            { href: '/dashboard/users/seller-applications', label: 'Seller Applications', icon: Briefcase, adminOnly: true },
            {
                href: '/dashboard/subscribers',
                label: 'Subscribers',
                icon: Mail,
                adminOnly: true,
            },
        ],
    },
    {
        href: '/dashboard/profile',
        label: 'My Profile',
        icon: UserCog,
    },
    {
        label: 'Business Partners',
        icon: Building2,
        adminOnly: true,
        children: [
            { href: '/dashboard/business-partners', label: 'Applications', icon: List, adminOnly: true },
            { href: '/dashboard/ads', label: 'Ad Campaigns', icon: Megaphone, adminOnly: true },
        ],
    },
    {
        href: '/dashboard/business',
        label: 'My Business',
        icon: Building2,
        partnerOnly: true,
    },
    {
        href: '/dashboard/settings',
        label: 'Settings',
        icon: Settings,
        adminOnly: true,
    },
    {
        href: '/dashboard/bookings',
        label: 'My Bookings',
        icon: CalendarCheck,
    },
    {
        href: '/dashboard/message',
        label: 'Message',
        icon: MessageSquare,
    },
];

/**
 * Flattens navigation tree and filters by admin. Used for command palette search.
 */
export function getFlatNavigationForSearch(
    items: NavigationItem[],
    isAdmin: boolean,
    userId?: string,
    isPartner: boolean = false
): FlatNavItem[] {
    const result: FlatNavItem[] = [];

    for (const item of items) {
        if (item.adminOnly && !isAdmin) continue;
        if (item.partnerOnly && !isPartner) continue;

        if (item.href) {
            let href = item.href;
            if (href === '/dashboard/users/edit/:id' && userId) {
                href = `/dashboard/users/edit/${userId}`;
            }
            result.push({
                href,
                label: item.label,
                icon: item.icon,
                groupLabel: undefined,
            });
        }

        if (item.children) {
            for (const child of item.children) {
                if (child.adminOnly && !isAdmin) continue;
                if (child.partnerOnly && !isPartner) continue;
                if (!child.href) continue;
                let href = child.href;
                if (href === '/dashboard/users/edit/:id' && userId) {
                    href = `/dashboard/users/edit/${userId}`;
                }
                result.push({
                    href,
                    label: child.label,
                    icon: child.icon,
                    groupLabel: item.label,
                });
            }
        }
    }

    return result;
}
