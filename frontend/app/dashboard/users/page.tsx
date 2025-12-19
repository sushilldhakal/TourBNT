'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getUsers } from '@/lib/api/users';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Users, Mail, Calendar, Search, UserCog, UserPlus, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { LoadingState } from '@/components/dashboard/shared/LoadingState';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { ErrorState } from '@/components/dashboard/shared/ErrorState';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { getRoleBadgeColor, UserRole } from '@/lib/utils/roles';
import { ViewToggle, ViewMode } from '@/components/dashboard/tours/ViewToggle';
import { DataTable } from '@/components/dashboard/DataTable';
import {
    ColumnDef,
} from '@tanstack/react-table';
import { format } from 'date-fns';

interface User {
    _id: string;
    id: string;
    name: string;
    email: string;
    phone?: string;
    roles: string;
    avatar?: string;
    createdAt?: string;
    created_at?: string;
}

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const observerRef = useRef<HTMLDivElement>(null);

    // Regular query for table view - use max allowed limit
    const { data: tableData, isLoading: isLoadingTable, isError: isErrorTable, error: tableError } = useQuery({
        queryKey: ['users', 'table'],
        queryFn: async () => {
            // Use maximum allowed limit (100)
            const response = await getUsers({ page: 1, limit: 100 });
            // Ensure response has the expected structure
            if (!response || (!response.users && !Array.isArray(response))) {
                throw new Error('Invalid response structure from API');
            }
            return response;
        },
        enabled: viewMode === 'list',
        retry: 1,
    });

    // Infinite query for card view
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingCards,
        isError: isErrorCards,
    } = useInfiniteQuery({
        queryKey: ['users', 'infinite'],
        queryFn: ({ pageParam }: { pageParam: number }) => getUsers({ page: pageParam, limit: 20 }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const pagination = lastPage.pagination;
            if (pagination && pagination.page < pagination.totalPages) {
                return pagination.page + 1;
            }
            return undefined;
        },
        enabled: viewMode === 'grid',
        staleTime: 5 * 60 * 1000,
    });

    // Intersection observer for infinite scroll
    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [target] = entries;
            if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
        [fetchNextPage, hasNextPage, isFetchingNextPage]
    );

    // Set up intersection observer for infinite scroll
    useEffect(() => {
        if (viewMode !== 'grid') return;

        const element = observerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(handleObserver, {
            threshold: 0.1,
            rootMargin: '200px',
        });

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [handleObserver, viewMode]);

    // Extract users from table data
    const tableUsers: User[] = useMemo(() => {
        if (!tableData) return [];
        if (tableData.users && Array.isArray(tableData.users)) return tableData.users;
        if (tableData.data?.users && Array.isArray(tableData.data.users)) return tableData.data.users;
        if (Array.isArray(tableData)) return tableData;
        return [];
    }, [tableData]);

    // Flatten all pages from infinite query for card view
    const allCardUsers: User[] = useMemo(() => {
        if (!infiniteData) return [];
        return infiniteData.pages.flatMap((page) => {
            if (page.users) return page.users;
            if (page.data?.users) return page.data.users;
            if (Array.isArray(page)) return page;
            return [];
        });
    }, [infiniteData]);

    // Filter users based on search term
    const filteredTableUsers = useMemo(() => {
        if (!searchTerm) return tableUsers;
        const term = searchTerm.toLowerCase();
        return tableUsers.filter(
            (user) =>
                user.name?.toLowerCase().includes(term) ||
                user.email?.toLowerCase().includes(term) ||
                user.roles?.toLowerCase().includes(term) ||
                user.phone?.toLowerCase().includes(term)
        );
    }, [tableUsers, searchTerm]);

    const filteredCardUsers = useMemo(() => {
        if (!searchTerm) return allCardUsers;
        const term = searchTerm.toLowerCase();
        return allCardUsers.filter(
            (user) =>
                user.name?.toLowerCase().includes(term) ||
                user.email?.toLowerCase().includes(term) ||
                user.roles?.toLowerCase().includes(term) ||
                user.phone?.toLowerCase().includes(term)
        );
    }, [allCardUsers, searchTerm]);

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Table columns definition
    const columns: ColumnDef<User>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2 lg:px-3"
                    >
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>{getInitials(user.name || 'U')}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{user.name || 'Unknown'}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: ({ row }) => (
                    <div className="text-sm">{row.getValue('email')}</div>
                ),
            },
            {
                accessorKey: 'phone',
                header: 'Phone',
                cell: ({ row }) => (
                    <div className="text-sm">{row.getValue('phone') || 'N/A'}</div>
                ),
            },
            {
                accessorKey: 'roles',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2 lg:px-3"
                    >
                        Role
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const role = row.getValue('roles') as string;
                    return (
                        <Badge variant={getRoleBadgeColor(role as UserRole) as any}>
                            {role}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: 'createdAt',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2 lg:px-3"
                    >
                        <Calendar className="mr-2 h-4 w-4" />
                        Created
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const date = row.original.createdAt || row.original.created_at;
                    return (
                        <div className="text-sm">
                            {date ? format(new Date(date), 'MMM dd, yyyy') : 'N/A'}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/users/edit/${user._id || user.id}`}>
                                <UserCog className="h-4 w-4 mr-2" />
                                Manage
                            </Link>
                        </Button>
                    );
                },
            },
        ],
        []
    );

    const renderCardView = () => {
        if (isLoadingCards) {
            return <LoadingState type="cards" rows={6} />;
        }

        if (isErrorCards) {
            return (
                <ErrorState
                    title="Error Loading Users"
                    description="We encountered an error while fetching user data. Please try again."
                    onRetry={() => window.location.reload()}
                />
            );
        }

        if (filteredCardUsers.length === 0) {
            return (
                <EmptyState
                    icon={<Users className="h-16 w-16" />}
                    title={searchTerm ? 'No Users Found' : 'No Users Yet'}
                    description={
                        searchTerm
                            ? 'Try adjusting your search terms or clear the search to see all users.'
                            : 'Get started by adding your first user to the system.'
                    }
                    action={
                        !searchTerm
                            ? {
                                label: 'Add Your First User',
                                href: '/dashboard/users/add',
                                icon: <UserPlus className="h-5 w-5" />,
                            }
                            : undefined
                    }
                />
            );
        }

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCardUsers.map((user) => (
                        <Card
                            key={user._id || user.id}
                            className="overflow-hidden hover:shadow-md transition-shadow border-muted"
                        >
                            <CardHeader className="p-6">
                                <div className="flex justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback>
                                                {getInitials(user.name || 'U')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg">
                                                {user.name || 'Unknown'}
                                            </CardTitle>
                                            <CardDescription className="text-sm flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {user.email}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant={getRoleBadgeColor(user.roles as UserRole) as any}>
                                        {user.roles}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {user.createdAt || user.created_at
                                        ? format(
                                            new Date(user.createdAt || user.created_at),
                                            'MMM dd, yyyy'
                                        )
                                        : 'Member since login'}
                                </div>
                                {user.phone && (
                                    <p className="text-sm mt-1 text-muted-foreground">
                                        Phone: {user.phone}
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter className="p-6 pt-0 flex justify-end">
                                <Button variant="outline" size="sm" asChild className="flex items-center gap-2">
                                    <Link href={`/dashboard/users/edit/${user._id || user.id}`}>
                                        <UserCog className="h-4 w-4" />
                                        Manage
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
                {/* Infinite scroll trigger */}
                {hasNextPage && (
                    <div ref={observerRef} className="h-10 flex items-center justify-center py-4">
                        {isFetchingNextPage && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                <span>Loading more users...</span>
                            </div>
                        )}
                    </div>
                )}
            </>
        );
    };

    const renderContent = () => {
        if (viewMode === 'grid') {
            return renderCardView();
        }

        // Table view using DataTable component
        if (isLoadingTable) {
            return <LoadingState type="cards" rows={6} />;
        }

        if (isErrorTable) {
            console.error('Error loading users:', tableError);
            return (
                <ErrorState
                    title="Error Loading Users"
                    description={
                        tableError instanceof Error
                            ? `Failed to load users: ${tableError.message}`
                            : "We encountered an error while fetching user data. Please try again."
                    }
                    onRetry={() => {
                        window.location.reload();
                    }}
                />
            );
        }

        const totalUsers = tableData?.pagination?.total || 0;
        const showingUsers = filteredTableUsers.length;
        const hasMoreUsers = totalUsers > 100;

        return (
            <div className="space-y-4">
                {hasMoreUsers && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Showing first 100 users. Total users: {totalUsers}. Use filters or search to find specific users.
                        </p>
                    </div>
                )}
                <DataTable
                    data={filteredTableUsers}
                    columns={columns}
                    place="Search users by name, email, role, or phone..."
                    colum="name"
                />
            </div>
        );
    };

    return (
        <AdminGuard>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <Users className="h-6 w-6 text-primary" />
                                    Users ({viewMode === 'grid' ? filteredCardUsers.length : filteredTableUsers.length})
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Manage all users of the system
                                </CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {viewMode === 'list' && (
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="Search users..."
                                            className="pl-8 w-full sm:w-[250px]"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                )}
                                <ViewToggle view={viewMode} onViewChange={setViewMode} />
                                <Button asChild className="flex items-center gap-2">
                                    <Link href="/dashboard/users/add">
                                        <UserPlus className="h-4 w-4" />
                                        Add User
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardContent className="p-6">{renderContent()}</CardContent>
                </Card>
            </div>
        </AdminGuard>
    );
}