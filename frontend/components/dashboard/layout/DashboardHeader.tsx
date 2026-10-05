'use client';

import { Menu, LogOut, User, Settings, Minimize2, Maximize2, MessageSquare, Bell, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getConversations } from '@/lib/api/conversations';
import type { Conversation } from '@/lib/api/conversations';
import { getNotifications, markNotificationAsRead, deleteNotification } from '@/lib/api/notifications';
import type { Notification } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { getUserEmail, getUserRole } from '@/lib/utils/auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLayout } from '@/providers/LayoutProvider';
import { ModeToggle } from '@/components/ui/ModeToggle';
import { Breadcrumbs } from './Breadcrumbs';
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from '@/components/ui/command';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAdmin } from '@/lib/utils/roles';
import { useMyBusinessPartners } from '@/lib/queries';
import { baseNavigationItems, getFlatNavigationForSearch } from './dashboardNavigation';
import type { DashboardHeaderProps } from '@/types/dashboard';

/**
 * Dashboard Header Component
 * Migrated from dashboard/src/userDefinedComponents/DashboardHeader.tsx
 * Provides top navigation bar with user menu
 */
export function DashboardHeader({ onToggleSidebar, onLogout }: DashboardHeaderProps) {
    const router = useRouter();
    const { user, userRole, isHydrated } = useAuth();
    const userEmail = getUserEmail();
    const displayRole = userRole ?? getUserRole();
    const { isFullWidth, toggleLayout } = useLayout();
    const [searchOpen, setSearchOpen] = useState(false);
    const [showLayoutToggle, setShowLayoutToggle] = useState(false);
    const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const isUserAdmin = isAdmin(userRole ?? displayRole);
    // Ownership-driven, not role-driven — a seller/admin can also own an
    // approved business listing (see approveBusinessPartner on the server).
    const { data: myBusinesses } = useMyBusinessPartners(!!user?.id);
    const isUserPartner = !!myBusinesses && myBusinesses.length > 0;

    const loadRecentMessages = useCallback(() => {
        setMessagesLoading(true);
        getConversations({ limit: 5 })
            .then(({ items }) => setRecentConversations(items))
            .catch(() => setRecentConversations([]))
            .finally(() => setMessagesLoading(false));
    }, []);

    const handleMessagesOpenChange = (open: boolean) => {
        setMessagesOpen(open);
        if (open) loadRecentMessages();
    };

    const loadRecentNotifications = useCallback(() => {
        setNotificationsLoading(true);
        getNotifications({ limit: 5 })
            .then(({ items, unreadCount }) => {
                setRecentNotifications(items);
                setUnreadNotificationCount(unreadCount);
            })
            .catch(() => setRecentNotifications([]))
            .finally(() => setNotificationsLoading(false));
    }, []);

    // Fetch the unread count on mount so the badge is accurate before the
    // dropdown is ever opened, not just a decorative always-on dot.
    useEffect(() => {
        if (!isHydrated || !user?.id) return;
        getNotifications({ limit: 1, unreadOnly: true })
            .then(({ unreadCount }) => setUnreadNotificationCount(unreadCount))
            .catch(() => {});
    }, [isHydrated, user?.id]);

    const handleNotificationsOpenChange = (open: boolean) => {
        setNotificationsOpen(open);
        if (open) loadRecentNotifications();
    };

    const handleNotificationClick = (notification: Notification) => {
        setNotificationsOpen(false);
        if (!notification.isRead) {
            markNotificationAsRead(notification.id)
                .then(() => setUnreadNotificationCount((n) => Math.max(0, n - 1)))
                .catch(() => {});
        }
        const data = notification.data as { destinationId?: string; businessPartnerId?: string; adId?: string } | null;
        if (data?.destinationId) router.push('/dashboard/tours/destination');
        else if (data?.businessPartnerId) router.push('/dashboard/business-partners');
        else if (data?.adId) router.push('/dashboard/ads');
    };

    const handleNotificationDelete = (id: string, wasUnread: boolean) => {
        deleteNotification(id)
            .then(() => {
                setRecentNotifications((prev) => prev.filter((n) => n.id !== id));
                if (wasUnread) setUnreadNotificationCount((n) => Math.max(0, n - 1));
            })
            .catch(() => {});
    };

    // Only show layout toggle when screen is wider than 1600px
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1601px)');
        const update = () => setShowLayoutToggle(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const handleProfileClick = () => {
        router.push('/dashboard/profile');
    };

    const handleHomeClick = () => {
        router.push('/');
    };

    // Same navigation as sidebar, flattened for search; admin-only items filtered by role
    const searchItems = useMemo(() => {
        if (!isHydrated) return [];
        return getFlatNavigationForSearch(baseNavigationItems, isUserAdmin, user?.id ?? undefined, isUserPartner, userRole ?? displayRole);
    }, [isHydrated, isUserAdmin, user?.id, isUserPartner, userRole, displayRole]);

    // Command+K keyboard shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setSearchOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 lg:px-6">
            {/* Left section: sidebar toggle + breadcrumbs */}
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={onToggleSidebar}
                >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Toggle menu</span>
                </Button>

                {/* Desktop Sidebar Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex"
                    onClick={onToggleSidebar}
                >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Toggle sidebar</span>
                </Button>

                {/* Breadcrumbs */}
                <div className="min-w-0">
                    <Breadcrumbs />
                </div>
            </div>

            {user && (
                <>
                    {/* Search: full bar at 1024px+, icon only below */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="relative hidden lg:flex h-8 w-40 max-w-[180px] min-w-0 items-center gap-1.5 rounded-md border border-input bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        title="Search (⌘K)"
                        aria-label="Search (⌘K)"
                    >
                        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate text-left">Search...</span>
                        <kbd className="pointer-events-none hidden shrink-0 items-center rounded border bg-background/80 px-1 font-mono text-[10px] font-medium opacity-70 lg:inline-flex">
                            ⌘K
                        </kbd>
                    </button>

                    {/* Search icon button: below 1024px only */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchOpen(true)}
                        className="h-9 w-9 shrink-0 lg:hidden gap-1"
                        title="Search (⌘K)"
                        aria-label="Search (⌘K)"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                    </Button>

                    {/* Messages dropdown */}
                    <DropdownMenu open={messagesOpen} onOpenChange={handleMessagesOpenChange}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative h-9 w-9 gap-1"
                                title="Messages"
                                aria-label="Messages"
                            >
                                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                                {recentConversations.length > 0 && (
                                    <span className="absolute right-1 top-1 flex h-2 w-2">
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72">
                            <DropdownMenuLabel className="flex items-center justify-between">
                                <span>Recent messages</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto py-1 text-xs text-primary"
                                    onClick={() => {
                                        setMessagesOpen(false);
                                        router.push('/dashboard/message');
                                    }}
                                >
                                    View all
                                </Button>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {messagesLoading ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            ) : recentConversations.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    No conversations yet
                                </div>
                            ) : (
                                recentConversations.map((c) => {
                                    const id = (c as { id?: string }).id ?? (c as { _id?: string })._id ?? '';
                                    const name =
                                        c.guestName ||
                                        (c.fromUserId && typeof c.fromUserId === 'object' && 'name' in c.fromUserId
                                            ? (c.fromUserId as { name?: string }).name
                                            : undefined) ||
                                        c.subject ||
                                        'Unknown';
                                    return (
                                        <DropdownMenuItem
                                            key={id}
                                            onClick={() => {
                                                setMessagesOpen(false);
                                                router.push(`/dashboard/message?conversationId=${encodeURIComponent(id)}`);
                                            }}
                                            className="flex flex-col items-start gap-0.5 py-2"
                                        >
                                            <span className="font-medium truncate w-full text-left">{name}</span>
                                            <span className="text-xs text-muted-foreground truncate w-full text-left">
                                                {c.subject}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(c.updatedAt).toLocaleDateString()}
                                            </span>
                                        </DropdownMenuItem>
                                    );
                                })
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setMessagesOpen(false);
                                    router.push('/dashboard/message');
                                }}
                            >
                                <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                                Open messages
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Notifications dropdown */}
                    <DropdownMenu open={notificationsOpen} onOpenChange={handleNotificationsOpenChange}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative h-9 w-9 gap-1"
                                title="Notifications"
                                aria-label="Notifications"
                            >
                                <Bell className="h-4 w-4" aria-hidden="true" />
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute right-1 top-1 flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel className="flex items-center justify-between">
                                <span>
                                    Notifications
                                    {unreadNotificationCount > 0 && (
                                        <span className="ml-1.5 text-xs text-muted-foreground">({unreadNotificationCount} unread)</span>
                                    )}
                                </span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {notificationsLoading ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
                            ) : recentNotifications.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">No notifications yet</div>
                            ) : (
                                recentNotifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            'group flex items-start gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent cursor-pointer',
                                            !n.isRead && 'bg-primary/5'
                                        )}
                                        onClick={() => handleNotificationClick(n)}
                                    >
                                        <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-primary')} />
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('truncate', !n.isRead && 'font-medium')}>{n.title}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                            aria-label="Delete notification"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNotificationDelete(n.id, !n.isRead);
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <ModeToggle />
                    {showLayoutToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleLayout}
                            className="h-7 w-7 hover:bg-secondary-foreground/10 gap-1"
                            title={isFullWidth ? 'Switch to Boxed Layout' : 'Switch to Full Width Layout'}
                            aria-label={isFullWidth ? 'Switch to boxed layout' : 'Switch to full width layout'}
                        >
                            {isFullWidth ? (
                                <Minimize2 size={16} className="text-secondary-foreground" aria-hidden="true" />
                            ) : (
                                <Maximize2 size={16} className="text-secondary-foreground" aria-hidden="true" />
                            )}
                        </Button>
                    )}
                </>
            )}
            {/* User Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                            <AvatarFallback>
                                {user?.name?.charAt(0).toUpperCase() || userEmail?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {userEmail || 'user@example.com'}
                            </p>
                            {userRole && (
                                <p className="text-xs leading-none text-muted-foreground capitalize">
                                    Role: {userRole}
                                </p>
                            )}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleHomeClick}>
                        <User className="mr-2 h-4 w-4" aria-hidden="true" />
                        <span>HomePage</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleProfileClick}>
                        <User className="mr-2 h-4 w-4" aria-hidden="true" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                        <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600 dark:text-red-400">
                        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Command Palette Search Dialog – same nav as sidebar, admin-filtered */}
            <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
                <CommandInput placeholder="Search or jump to..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {(() => {
                        const byGroup = searchItems.reduce<Record<string, typeof searchItems>>(
                            (acc, item) => {
                                const key = item.groupLabel ?? 'Navigation';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(item);
                                return acc;
                            },
                            {}
                        );
                        return Object.entries(byGroup).map(([heading, items]) => (
                            <CommandGroup key={heading} heading={heading}>
                                {items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <CommandItem
                                            key={item.href}
                                            onSelect={() => {
                                                router.push(item.href);
                                                setSearchOpen(false);
                                            }}
                                        >
                                            <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                                            <span>{item.label}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        ));
                    })()}
                </CommandList>
            </CommandDialog>
        </header>
    );
}
