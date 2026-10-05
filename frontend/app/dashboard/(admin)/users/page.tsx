'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Users, Search, UserCog, UserPlus, BadgeCheck, MailWarning } from 'lucide-react';
import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { PaginationControls } from '@/components/dashboard/shared/PaginationControls';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { ErrorState } from '@/components/dashboard/shared/ErrorState';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUsersPage, getUserRoleCounts } from '@/lib/api/adminLists';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { getRoleBadgeColor } from '@/lib/utils/roles';

// One tab per kind of account. `role` is the DB role value; 'all' means no filter.
const TABS: Array<{ key: string; label: string; role?: string }> = [
    { key: 'all', label: 'All' },
    { key: 'user', label: 'Customers', role: 'user' },
    { key: 'seller', label: 'Sellers', role: 'seller' },
    { key: 'hotel', label: 'Hotels', role: 'hotel' },
    { key: 'guesthouse', label: 'Guesthouses', role: 'guesthouse' },
    { key: 'restaurant', label: 'Restaurants', role: 'restaurant' },
    { key: 'guide', label: 'Guides', role: 'guide' },
    { key: 'transport', label: 'Transport', role: 'transport' },
    { key: 'advertiser', label: 'Advertisers', role: 'advertiser' },
    { key: 'admin', label: 'Admins', role: 'admin' },
];

const initials = (name?: string) =>
    (name ?? 'U').split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);

export default function UsersPage() {
    const [tab, setTab] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const q = useDebouncedValue(search.trim());
    const role = TABS.find((t) => t.key === tab)?.role;

    const counts = useQuery({ queryKey: ['users', 'role-counts'], queryFn: getUserRoleCounts, staleTime: 30_000 });
    const list = useQuery({
        queryKey: ['users', 'page', { role, q, page, limit }],
        queryFn: () => getUsersPage({ role, q, page, limit }),
        placeholderData: keepPreviousData,
    });

    const countFor = (key: string, r?: string) => (r ? counts.data?.counts[r] : counts.data?.total);
    const rows = list.data?.items ?? [];
    const pagination = list.data?.pagination;

    return (
        <AdminGuard>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <DashboardCardHeader
                    variant="compact"
                    icon={Users}
                    badge="Users"
                    title={`Users${counts.data ? ` (${counts.data.total})` : ''}`}
                    description="Every account on the platform, separated by type"
                    actions={
                        <Button asChild className="flex items-center gap-2">
                            <Link href="/dashboard/users/add">
                                <UserPlus className="h-4 w-4" />
                                Add User
                            </Link>
                        </Button>
                    }
                />

                <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
                    <TabsList className="h-auto flex-wrap justify-start gap-1">
                        {TABS.map((t) => (
                            <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                                {t.label}
                                {countFor(t.key, t.role) !== undefined && (
                                    <span className="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">{countFor(t.key, t.role)}</span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <Card>
                    <CardContent className="p-6 space-y-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search name, email or phone…"
                                className="pl-8"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>

                        {list.isError ? (
                            <ErrorState title="Error Loading Users" description={list.error instanceof Error ? list.error.message : 'Please try again.'} onRetry={() => list.refetch()} />
                        ) : list.isLoading ? (
                            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                        ) : rows.length === 0 ? (
                            <EmptyState
                                icon={<Users className="h-16 w-16" />}
                                title={q ? 'No users found' : 'No users in this tab'}
                                description={q ? 'Try a different search term.' : 'Nobody has this account type yet.'}
                            />
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Email status</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((u) => {
                                            const userRole = u.role ?? u.roles;
                                            return (
                                                <TableRow key={u.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border">
                                                                <AvatarImage src={u.avatar} alt={u.name} />
                                                                <AvatarFallback>{initials(u.name)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <div className="font-medium truncate">{u.name || 'Unknown'}</div>
                                                                <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{u.phone || '—'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getRoleBadgeColor(userRole ?? null)} className="capitalize">{userRole}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {u.verified ? (
                                                            <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><BadgeCheck className="h-4 w-4" />Verified</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-sm text-amber-600"><MailWarning className="h-4 w-4" />Unverified</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm whitespace-nowrap">{u.createdAt ? format(new Date(u.createdAt), 'MMM dd, yyyy') : '—'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link href={`/dashboard/users/edit/${u.id}`}>
                                                                <UserCog className="h-4 w-4 mr-2" />
                                                                Manage
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {pagination && (
                            <PaginationControls
                                page={pagination.page}
                                totalPages={pagination.totalPages}
                                totalItems={pagination.totalItems}
                                limit={pagination.limit}
                                onPageChange={setPage}
                                onLimitChange={(l) => { setLimit(l); setPage(1); }}
                                isFetching={list.isFetching && !list.isLoading}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminGuard>
    );
}
