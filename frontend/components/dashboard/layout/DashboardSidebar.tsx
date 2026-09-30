'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Package2, Home, FileText, Users, Image, Settings, Mail, LayoutDashboard,
    ChevronDown, ChevronRight, Plus, List, MapPin, FolderTree, Lightbulb,
    HelpCircle, Calendar, Star, Wrench, MessageSquare, UserPlus, Briefcase,
    PanelLeftClose, PanelLeft,
    UserCog, CalendarCheck, Compass, Utensils, Truck, Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/utils/roles';
import { useMyBusinessPartners } from '@/lib/queries';
import type { BusinessPartnerType } from '@/lib/api/businessPartners';
import { Megaphone, Building2 } from 'lucide-react';

/**
 * Which nav link each business-partner type resolves to. A user can own
 * more than one business-partner listing (role no longer determines this —
 * see approveBusinessPartner on the server, which stopped overwriting an
 * existing seller/admin role), so this is driven by what they actually
 * own (useMyBusinessPartners), not by their single `role` column.
 */
const TYPE_TO_NAV: Record<BusinessPartnerType, { href: string; label: string; icon: any }> = {
    hotel: { href: '/dashboard/hotels', label: 'Hotels', icon: Building2 },
    guesthouse: { href: '/dashboard/hotels', label: 'Hotels', icon: Building2 },
    restaurant: { href: '/dashboard/restaurants', label: 'Restaurant', icon: Utensils },
    guide: { href: '/dashboard/guides', label: 'Guide', icon: Compass },
    transport: { href: '/dashboard/logistics', label: 'Logistics', icon: Truck },
    advertiser: { href: '/dashboard/advertising', label: 'Advertising', icon: Megaphone },
};

/**
 * Dashboard Sidebar Component
 * Migrated from dashboard Navigation component
 * Provides collapsible navigation menu with expandable submenus
 */

interface DashboardSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    mobileMenuOpen?: boolean;
}

interface NavigationItem {
    href?: string;
    label: string;
    icon: any;
    children?: NavigationItem[];
    adminOnly?: boolean; // Flag to mark admin-only items
}

const baseNavigationItems: NavigationItem[] = [
    {
        href: '/dashboard',
        label: 'Dashboard',
        icon: Home
    },
    {
        label: 'Posts',
        icon: FileText,
        children: [
            { href: '/dashboard/posts', label: 'All Posts', icon: List },
            { href: '/dashboard/posts/add', label: 'Add Post', icon: Plus },
            { href: '/dashboard/posts/comments', label: 'Comments', icon: MessageSquare },
        ]
    },
    {
        label: 'Tours',
        icon: LayoutDashboard,
        children: [
            { href: '/dashboard/tours', label: 'All Tours', icon: List },
            { href: '/dashboard/tours/add', label: 'Add Tour', icon: Plus },
            { href: '/dashboard/tours/destination', label: 'Destinations', icon: MapPin },
            { href: '/dashboard/tours/categories', label: 'Categories', icon: FolderTree },
            { href: '/dashboard/tours/facts', label: 'Facts', icon: Lightbulb },
            { href: '/dashboard/tours/faq', label: 'FAQ', icon: HelpCircle },
            { href: '/dashboard/tours/bookings', label: 'Bookings', icon: Calendar },
            { href: '/dashboard/tours/reviews', label: 'Reviews', icon: Star },
            { href: '/dashboard/tours/settings', label: 'Settings', icon: Wrench },
        ]
    },
    {
        label: 'Users',
        icon: Users,
        children: [
            { href: '/dashboard/users', label: 'All Users', icon: List, adminOnly: true },
            // Remove the static edit link - users can access edit from the users list page
            { href: '/dashboard/users/seller-applications', label: 'Seller Applications', icon: Briefcase, adminOnly: true },
        ]
    },
    {
        label: 'Business Partners',
        icon: Building2,
        adminOnly: true,
        children: [
            { href: '/dashboard/business-partners', label: 'Applications', icon: List, adminOnly: true },
            { href: '/dashboard/ads', label: 'Ad Campaigns', icon: Megaphone, adminOnly: true },
        ]
    },
    {
        href: '/dashboard/operations',
        label: 'Operations',
        icon: Gauge,
        adminOnly: true
    },
    // Add My Profile link at top level (accessible to all authenticated users)
    {
        href: '/dashboard/profile', // We'll create this page
        label: 'My Profile',
        icon: UserCog
    },
    {
        href: '/dashboard/bookings',
        label: 'My Bookings',
        icon: CalendarCheck
    },
    {
        href: '/dashboard/gallery',
        label: 'Gallery',
        icon: Image
    },
    {
        href: '/dashboard/subscribers',
        label: 'Subscribers',
        icon: Mail,
        adminOnly: true
    },
    {
        href: '/dashboard/message',
        label: 'Message',
        icon: MessageSquare
    },
    {
        href: '/dashboard/settings',
        label: 'Settings',
        icon: Settings
    },
];

export function DashboardSidebar({ isCollapsed, onToggle, mobileMenuOpen = false }: DashboardSidebarProps) {
    const pathname = usePathname();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const { userRole, isHydrated, user } = useAuth();
    const isUserAdmin = isAdmin(userRole);

    // Extract userId to avoid dependency issues
    const userId = user?.id;

    // Which business-partner listings this user actually owns — not their
    // single `role` column, which can't represent owning more than one
    // (e.g. a seller who also runs an approved hotel). Cheap enough to fetch
    // for every dashboard user rather than gate it behind a role guess.
    const { data: myBusinesses } = useMyBusinessPartners(!!userId);
    const businessNavItems: NavigationItem[] = useMemo(() => {
        if (!Array.isArray(myBusinesses) || myBusinesses.length === 0) return [];
        const seenHrefs = new Set<string>();
        const items: NavigationItem[] = [];
        for (const business of myBusinesses) {
            const nav = TYPE_TO_NAV[business.type];
            if (!nav || seenHrefs.has(nav.href)) continue;
            seenHrefs.add(nav.href);
            items.push({ href: nav.href, label: nav.label, icon: nav.icon });
        }
        return items;
    }, [myBusinesses]);

    // Filter navigation items based on user role, then splice in the
    // business-partner items (if any) right before "My Profile".
    const navigationItems = useMemo(() => {
        if (!isHydrated) return baseNavigationItems;

        const filtered = baseNavigationItems
            .filter((item) => {
                if (item.adminOnly && !isUserAdmin) {
                    return false;
                }

                // If item has children, filter them based on admin status
                if (item.children) {
                    const filteredChildren = item.children
                        .filter((child) => {
                            // Show item if it's not admin-only, or if user is admin
                            return !child.adminOnly || isUserAdmin;
                        })
                        .map((child) => {
                            // Replace dynamic hrefs with actual user ID
                            if (child.href === '/dashboard/users/edit/:id' && userId) {
                                return {
                                    ...child,
                                    href: `/dashboard/users/edit/${userId}`,
                                    label: 'My Profile', // Change label for current user
                                };
                            }
                            return child;
                        });

                    // If no children remain after filtering, hide the parent
                    if (filteredChildren.length === 0) {
                        return false;
                    }

                    // Update the item with filtered children
                    item.children = filteredChildren;
                }

                return true;
            });

        if (businessNavItems.length === 0) return filtered;

        const profileIndex = filtered.findIndex((item) => item.href === '/dashboard/profile');
        const insertAt = profileIndex === -1 ? filtered.length : profileIndex;
        return [...filtered.slice(0, insertAt), ...businessNavItems, ...filtered.slice(insertAt)];
    }, [isHydrated, isUserAdmin, userId, businessNavItems]);

    // Auto-expand parent menu if child is active
    useState(() => {
        navigationItems.forEach((item) => {
            if (item.children) {
                const hasActiveChild = item.children.some(
                    (child) => child.href && (pathname === child.href || pathname.startsWith(child.href + '/'))
                );
                if (hasActiveChild && !expandedItems.includes(item.label)) {
                    setExpandedItems((prev) => [...prev, item.label]);
                }
            }
        });
    });

    const toggleExpand = (label: string) => {
        setExpandedItems((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    };

    const renderNavItem = (item: NavigationItem, isChild = false, forceExpand = false) => {
        const collapsed = forceExpand ? false : isCollapsed;
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.label);
        const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + '/'));

        if (hasChildren) {
            const button = (
                <button
                    onClick={() => toggleExpand(item.label)}
                    className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                        'hover:bg-blue-100 dark:hover:bg-slate-800',
                        'text-slate-700 dark:text-slate-300',
                        collapsed && 'justify-center'
                    )}
                >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                        <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </>
                    )}
                </button>
            );

            return (
                <div key={item.label} className="space-y-1">
                    {collapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {button}
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                                {item.label}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        button
                    )}
                    {!collapsed && isExpanded && (
                        <div className="ml-4 space-y-1 border-l-2 border-blue-200 dark:border-slate-700 pl-2">
                            {item.children!.map((child) => renderNavItem(child, true, forceExpand))}
                        </div>
                    )}
                </div>
            );
        }

        const link = (
            <Link
                href={item.href!}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                    'hover:bg-blue-100 dark:hover:bg-slate-800',
                    isActive
                        ? 'bg-blue-200 dark:bg-slate-700 text-blue-900 dark:text-blue-100'
                        : 'text-slate-700 dark:text-slate-300',
                    collapsed && 'justify-center',
                    isChild && 'text-sm'
                )}
            >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
            </Link>
        );

        if (collapsed && !isChild) {
            return (
                <Tooltip key={item.href || item.label}>
                    <TooltipTrigger asChild>
                        {link}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                        {item.label}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return <div key={item.href || item.label}>{link}</div>;
    };

    return (
        <TooltipProvider delayDuration={300}>
            {/* Mobile Sidebar */}
            <div
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 overflow-hidden md:hidden',
                    'bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
                    'border-r border-blue-200 dark:border-slate-700/50 shadow-2xl backdrop-blur-xl w-[280px]',
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ height: '100vh' }}
            >
                {/* Mobile Header */}
                <div className="flex items-center justify-between border-b border-slate-700/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-xs h-[80px] p-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
                        onClick={onToggle}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                                <Package2 className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                        </div>
                        <div>
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                TourBNT
                            </span>
                            <div className="text-xs text-slate-400 font-medium tracking-wide">Dashboard</div>
                        </div>
                    </Link>
                </div>

                {/* Mobile Navigation - always show labels (forceExpand) */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navigationItems.map((item) => renderNavItem(item, false, true))}
                </nav>

                {/* Mobile Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>System Online</span>
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div
                className={cn(
                    'hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex flex-col transition-all duration-300 overflow-hidden',
                    'bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
                    'border-r border-blue-200 dark:border-slate-700/50 shadow-2xl backdrop-blur-xl',
                    isCollapsed ? 'w-[70px]' : 'w-[280px]'
                )}
                style={{ height: '100vh' }}
            >
                {/* Header/Branding */}
                <div
                    className={cn(
                        'flex items-center border-b border-slate-700/50',
                        'bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-xs',
                        isCollapsed ? 'h-[70px] justify-center p-2' : 'h-[80px] justify-between p-4'
                    )}
                >
                    <Link
                        href="/dashboard"
                        className={cn(
                            'flex items-center gap-3 group transition-all duration-300 hover:scale-105',
                            isCollapsed ? 'justify-center' : 'justify-start'
                        )}
                        aria-label="Dashboard Home"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                                <Package2 className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                        </div>
                        <div
                            className={cn(
                                'transition-all duration-300 overflow-hidden',
                                isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                            )}
                        >
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                TourBNT
                            </span>
                            <div className="text-xs text-slate-400 font-medium tracking-wide">Dashboard</div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navigationItems.map((item) => renderNavItem(item))}
                </nav>

                {/* Footer with Toggle Button */}
                <div
                    className={cn(
                        'border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-xs',
                        isCollapsed ? 'p-2' : 'p-4'
                    )}
                >
                    {/* Toggle Button */}
                    <div className={cn('mb-3', isCollapsed ? 'flex justify-center' : 'flex justify-end')}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onToggle}
                                    className={cn(
                                        'p-2 rounded-lg transition-all',
                                        'hover:bg-blue-100 dark:hover:bg-slate-800',
                                        'text-slate-600 dark:text-slate-400',
                                        'hover:text-blue-600 dark:hover:text-blue-400'
                                    )}
                                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                >
                                    {isCollapsed ? (
                                        <PanelLeft className="h-5 w-5" />
                                    ) : (
                                        <PanelLeftClose className="h-5 w-5" />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* System Status */}
                    <div
                        className={cn(
                            'flex items-center gap-3 text-xs text-slate-400',
                            isCollapsed ? 'justify-center' : 'justify-start'
                        )}
                    >
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span
                            className={cn(
                                'transition-all duration-300',
                                isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
                            )}
                        >
                            System Online
                        </span>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
