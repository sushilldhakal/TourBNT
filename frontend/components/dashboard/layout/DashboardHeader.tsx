'use client';

import { Menu, LogOut, User, Settings, Minimize2, Maximize2, MessageSquare, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useEffect, useMemo, useState } from 'react';
import { isAdmin } from '@/lib/utils/roles';
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
    const isUserAdmin = isAdmin(userRole ?? displayRole);

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
        return getFlatNavigationForSearch(baseNavigationItems, isUserAdmin, user?.id ?? undefined);
    }, [isHydrated, isUserAdmin, user?.id]);

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
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>

                {/* Desktop Sidebar Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex"
                    onClick={onToggleSidebar}
                >
                    <Menu className="h-5 w-5" />
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
                    >
                        <Search className="h-3.5 w-3.5 shrink-0" />
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
                    >
                        <Search className="h-4 w-4" />
                    </Button>

                    {/* Messages Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 gap-1"
                        title="Messages"
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span className="absolute right-1 top-1 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                        </span>
                    </Button>

                    {/* Notifications Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 gap-1"
                        title="Notifications"
                    >
                        <Bell className="h-4 w-4" />
                        <span className="absolute right-1 top-1 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                        </span>
                    </Button>

                    <ModeToggle />
                    {showLayoutToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleLayout}
                            className="h-7 w-7 hover:bg-secondary-foreground/10 gap-1"
                            title={isFullWidth ? 'Switch to Boxed Layout' : 'Switch to Full Width Layout'}
                        >
                            {isFullWidth ? (
                                <Minimize2 size={16} className="text-secondary-foreground" />
                            ) : (
                                <Maximize2 size={16} className="text-secondary-foreground" />
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
                        <User className="mr-2 h-4 w-4" />
                        <span>HomePage</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleProfileClick}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600 dark:text-red-400">
                        <LogOut className="mr-2 h-4 w-4" />
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
                                            <Icon className="mr-2 h-4 w-4" />
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
