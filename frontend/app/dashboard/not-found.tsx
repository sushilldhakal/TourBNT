'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileQuestion, Home, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { baseNavigationItems, getFlatNavigationForSearch } from '@/components/dashboard/layout/dashboardNavigation';
import { isAdmin } from '@/lib/utils/roles';
import { getUserRole } from '@/lib/utils/auth';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';

export default function DashboardNotFound() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };
    const { user, userRole, isHydrated } = useAuth();
    const displayRole = userRole ?? getUserRole();
    const [searchOpen, setSearchOpen] = useState(false);
    const isUserAdmin = isAdmin(userRole ?? displayRole);
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <FileQuestion className="w-24 h-24 text-slate-300 dark:text-slate-600 mb-6" strokeWidth={1.5} />

            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
                Page Not Found
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
                The dashboard page you're looking for doesn't exist.
            </p>

            {/* Search Box */}
            <button
                onClick={() => setSearchOpen(true)}
                className="relative hidden lg:flex h-10 w-full mb-8 max-w-[180px] min-w-0 items-center gap-1.5 rounded-md border border-input bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Search (⌘K)"
            >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">Search...</span>
                <kbd className=" items-center rounded border bg-background/80 px-2 font-mono text-[14px] font-medium  lg:inline-flex">
                    ⌘ + K
                </kbd>
            </button>
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

            <div className="flex flex-col sm:flex-row gap-3">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                    <Home className="w-4 h-4" />
                    Dashboard Home
                </Link>
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                </button>
            </div>
        </div>
    );
}