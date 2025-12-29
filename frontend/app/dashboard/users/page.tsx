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

type UsersResponse =
    | User[]
    | { users: User[]; pagination?: { page: number; totalPages: number; totalItems: number; itemsPerPage: number } }
    | { data: { users: User[]; pagination?: { page: number; totalPages: number; totalItems: number; itemsPerPage: number } } };

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const observerRef = useRef<HTMLDivElement>(null);

    // Single infinite query for both table and card views
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
    } = useInfiniteQuery({
        queryKey: ['users', 'infinite'],
        queryFn: ({ pageParam }: { pageParam: number }) => {
            // Use consistent limit for both views
            return getUsers({ page: pageParam, limit: 50 });
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: unknown) => {
            if (typeof lastPage === 'object' && lastPage !== null) {
                if ('pagination' in lastPage) {
                    const pagination = (lastPage as { pagination?: { currentPage?: number; page?: number; totalPages?: number } }).pagination;
                    if (pagination) {
                        const currentPage = pagination.currentPage || pagination.page;
                        if (typeof currentPage === 'number' && typeof pagination.totalPages === 'number') {
                            if (currentPage < pagination.totalPages) {
                                return currentPage + 1;
                            }
                        }
                    }
                }
                if ('data' in lastPage && typeof lastPage.data === 'object' && lastPage.data !== null) {
                    const data = lastPage.data as { pagination?: { currentPage?: number; page?: number; totalPages?: number } };
                    if (data.pagination) {
                        const currentPage = data.pagination.currentPage || data.pagination.page;
                        if (typeof currentPage === 'number' && typeof data.pagination.totalPages === 'number') {
                            if (currentPage < data.pagination.totalPages) {
                                return currentPage + 1;
                            }
                        }
                    }
                }
            }
            return undefined;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Load more pages initially for table view to show more users
    useEffect(() => {
        if (viewMode === 'list' && infiniteData && hasNextPage && !isFetchingNextPage) {
            // Load 2 more pages for table view (total 3 pages = 150 users)
            const loadedPages = infiniteData.pages.length;
            if (loadedPages < 3) {
                fetchNextPage();
            }
        }
    }, [viewMode, infiniteData, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

    // Set up intersection observer for infinite scroll (only for grid view)
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

    // Flatten all pages from infinite query - used for both table and card views
    const allUsers: User[] = useMemo(() => {
        if (!infiniteData) return [];
        return infiniteData.pages.flatMap((page: unknown) => {
            if (Array.isArray(page)) return page;
            if (typeof page === 'object' && page !== null) {
                // Check for 'items' field (current API format)
                if ('items' in page && Array.isArray(page.items)) {
                    return page.items;
                }
                // Fallback: check for 'users' field
                if ('users' in page && Array.isArray(page.users)) {
                    return page.users;
                }
                // Fallback: check for nested 'data' structure
                if ('data' in page && typeof page.data === 'object' && page.data !== null) {
                    const data = page.data as { items?: User[]; users?: User[] };
                    if (data.items && Array.isArray(data.items)) {
                        return data.items;
                    }
                    if (data.users && Array.isArray(data.users)) {
                        return data.users;
                    }
                }
            }
            return [];
        });
    }, [infiniteData]);

    // Filter users based on search term - used for both views
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return allUsers;
        const term = searchTerm.toLowerCase();
        return allUsers.filter(
            (user) =>
                user.name?.toLowerCase().includes(term) ||
                user.email?.toLowerCase().includes(term) ||
                user.roles?.toLowerCase().includes(term) ||
                (user.phone && String(user.phone).includes(term))
        );
    }, [allUsers, searchTerm]);

    // Extract total users from pagination, handling different response structures
    const totalUsers = useMemo(() => {
        if (!infiniteData || infiniteData.pages.length === 0) return 0;
        // Check all pages to find the highest totalItems value
        let maxTotal = 0;
        for (const page of infiniteData.pages) {
            if (typeof page === 'object' && page !== null) {
                if ('pagination' in page && page.pagination) {
                    const pagination = page.pagination as { totalItems?: number; total?: number };
                    const total = pagination.totalItems || pagination.total || 0;
                    if (total > maxTotal) maxTotal = total;
                }
                if ('data' in page && typeof page.data === 'object' && page.data !== null) {
                    const data = page.data as { pagination?: { totalItems?: number; total?: number } };
                    if (data.pagination) {
                        const total = data.pagination.totalItems || data.pagination.total || 0;
                        if (total > maxTotal) maxTotal = total;
                    }
                }
            }
        }
        // Return the max total found, or fallback to count of loaded users
        return maxTotal > 0 ? maxTotal : allUsers.length;
    }, [infiniteData, allUsers]);

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
        if (isLoading) {
            return <LoadingState type="cards" rows={6} />;
        }

        if (isError) {
            return (
                <ErrorState
                    title="Error Loading Users"
                    description="We encountered an error while fetching user data. Please try again."
                    onRetry={() => window.location.reload()}
                />
            );
        }

        if (filteredUsers.length === 0) {
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
                    {filteredUsers.map((user) => (
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
                                            new Date(user.createdAt || user.created_at || new Date()),
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
        if (isLoading) {
            return <LoadingState type="cards" rows={6} />;
        }

        if (isError) {
            console.error('Error loading users:', error);
            return (
                <ErrorState
                    title="Error Loading Users"
                    description={
                        error instanceof Error
                            ? `Failed to load users: ${error.message}`
                            : "We encountered an error while fetching user data. Please try again."
                    }
                    onRetry={() => {
                        window.location.reload();
                    }}
                />
            );
        }

        const showingUsers = filteredUsers.length;
        const hasMoreUsers = totalUsers > allUsers.length;

        return (
            <div className="space-y-4">
                {hasMoreUsers && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Showing {allUsers.length} of {totalUsers} users. {hasNextPage && (
                                <button
                                    onClick={() => fetchNextPage()}
                                    className="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100"
                                >
                                    Load more
                                </button>
                            )}
                        </p>
                    </div>
                )}
                <DataTable
                    data={filteredUsers}
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
                                    Users ({filteredUsers.length})
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Manage all users of the system
                                </CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {viewMode === 'grid' && (
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