'use client';

import { Menu, LogOut, User, Settings } from 'lucide-react';
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
import useDashboardStore from '@/store/dashboardStore';

/**
 * Dashboard Header Component
 * Migrated from dashboard/src/userDefinedComponents/DashboardHeader.tsx
 * Provides top navigation bar with user menu
 */

interface DashboardHeaderProps {
    isCollapsed: boolean;
    onToggleSidebar: () => void;
    onLogout: () => void;
}

export function DashboardHeader({ isCollapsed, onToggleSidebar, onLogout }: DashboardHeaderProps) {
    const router = useRouter();
    const { user } = useAuth();
    const userEmail = getUserEmail();
    const userRole = getUserRole();

    const handleProfileClick = () => {
        router.push('/dashboard/settings');
    };

    const handleHomeClick = () => {
        router.push('/');
    }

    return (
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 lg:px-6">
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

            {/* Spacer */}
            <div className="flex-1" />

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
        </header>
    );
}
