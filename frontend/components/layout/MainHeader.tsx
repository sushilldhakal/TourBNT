'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LuMenu as Menu, LuX as X, LuBell as Bell, LuSearch as Search, LuUser as User, LuLoader as Loader2 } from 'react-icons/lu';
import { useLayout } from '@/providers/LayoutProvider';
import { ModeToggle } from '@/components/ui/ModeToggle';
import Logo from '@/public/logo';
import { useRole } from '@/lib/hooks/useRole';
import { useAuth } from '@/lib/hooks/useAuth';

const menuItems = [
    { id: 'home', title: 'Home', url: '/' },
    { id: 'tours', title: 'Tours', url: '/tours' },
    { id: 'about', title: 'About Us', url: '/about' },
    { id: 'contact', title: 'Contact Us', url: '/contact' },
];

interface MainHeaderProps {
    onSearchToggle: () => void;
}

export function MainHeader({ onSearchToggle }: MainHeaderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isHeaderFixed, setIsHeaderFixed] = useState(false);
    const [avatarUrl] = useState<string | null>(null);
    const [isLoadingAvatar] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const pathname = usePathname();
    const headerRef = useRef<HTMLDivElement>(null);
    const { isFullWidth } = useLayout();

    // Use centralized role hook
    const { isAuthenticated, canAccessDashboard: userCanAccessDashboard } = useRole();
    const { logout } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY >= 40) {
                setIsHeaderFixed(true);
            } else {
                setIsHeaderFixed(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <>
            {/* Placeholder when header is fixed */}
            {isHeaderFixed && <div className="h-[76px] w-full" />}

            <nav
                ref={headerRef}
                id="main-header"
                className={`${isHeaderFixed ? 'fixed top-0 h-[60px]' : 'relative h-[76px]'
                    } z-50 bg-secondary w-full text-secondary-foreground border-t-2 border-primary px-5 transition-all duration-200`}
            >
                <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} h-full transition-all duration-300`}>
                    <div className="relative flex items-center justify-between h-full">
                        {/* Mobile menu button */}
                        <div className="absolute inset-y-0 left-0 flex items-center md:hidden z-10">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isOpen ? (
                                    <X className="block h-6 w-6" aria-hidden="true" />
                                ) : (
                                    <Menu className="block h-6 w-6" aria-hidden="true" />
                                )}
                            </button>
                        </div>

                        {/* Logo - Mobile (centered) */}
                        <div className="flex flex-1 justify-center md:hidden -ml-2">
                            <Link href="/" className="flex items-center">
                                <Logo
                                    width={isHeaderFixed ? 200 : 220}
                                    height={isHeaderFixed ? 50 : 58}
                                    className="transition-all duration-200"
                                />
                            </Link>
                        </div>

                        {/* Logo - Desktop */}
                        <div className="flex shrink-0 items-center hidden md:block -ml-8">
                            <Link href="/" className="flex items-center">
                                <Logo
                                    width={isHeaderFixed ? 220 : 260}
                                    height={isHeaderFixed ? 55 : 68}
                                    className="transition-all duration-200"
                                />
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="flex flex-1 items-center justify-center md:items-stretch md:justify-end">
                            <div className="hidden md:ml-6 md:block">
                                <div className="flex space-x-4">
                                    {menuItems.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={item.url}
                                            className={`hover:bg-primary/10 hover:text-primary rounded-md px-3 ${isHeaderFixed ? 'py-1' : 'py-2'
                                                } text-sm font-medium transition-all duration-200 ${pathname === item.url ? 'bg-primary text-primary-foreground' : ''
                                                }`}
                                        >
                                            {item.title}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right side buttons */}
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 md:static md:inset-auto md:ml-6 md:pr-0">
                            {/* Theme Toggle */}
                            <ModeToggle />

                            {isAuthenticated ? (
                                <>
                                    {/* Notifications */}
                                    <button
                                        type="button"
                                        className="ml-3 relative rounded-full bg-primary/20 p-1 text-muted-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary"
                                    >
                                        <span className="sr-only">View notifications</span>
                                        <Bell className="h-6 w-6" />
                                    </button>

                                    {/* User Menu */}
                                    <div className="relative ml-3">
                                        <button
                                            onClick={() => setShowUserMenu(!showUserMenu)}
                                            className="relative flex rounded-full bg-primary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary"
                                        >
                                            <span className="sr-only">Open user menu</span>
                                            {isLoadingAvatar ? (
                                                <div className="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center">
                                                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                                </div>
                                            ) : avatarUrl ? (
                                                <img
                                                    alt="User avatar"
                                                    src={avatarUrl}
                                                    className="h-8 w-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                            )}
                                        </button>

                                        {/* Dropdown Menu */}
                                        {showUserMenu && (
                                            <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-card py-1 shadow-lg ring-1 ring-border">
                                                {/* Only show Dashboard link for authorized roles */}
                                                {userCanAccessDashboard && (
                                                    <Link
                                                        href="/dashboard"
                                                        className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                                        onClick={() => setShowUserMenu(false)}
                                                    >
                                                        Dashboard
                                                    </Link>
                                                )}
                                                <Link
                                                    href="/profile"
                                                    className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    Your Profile
                                                </Link>
                                                <Link
                                                    href="/booking"
                                                    className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    My Bookings
                                                </Link>
                                                <Link
                                                    href="/settings"
                                                    className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    Settings
                                                </Link>
                                                <button
                                                    onClick={handleLogout}
                                                    className="block w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    Sign out
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Link href="/auth/login" className="text-primary ml-3">
                                    Login
                                </Link>
                            )}

                            {/* Search Icon */}
                            <button className="ml-3 cursor-pointer" onClick={onSearchToggle}>
                                <Search />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isOpen && (
                    <div className="md:hidden">
                        <div className="space-y-1 px-2 pb-3 pt-2">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.url}
                                    className={`text-secondary-foreground hover:bg-accent hover:text-accent-foreground block rounded-md px-3 py-2 text-base font-medium ${pathname === item.url ? 'bg-primary text-primary-foreground' : ''
                                        }`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {item.title}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
}
