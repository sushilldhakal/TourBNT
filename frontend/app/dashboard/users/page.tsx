'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Users, Mail, Calendar, Search, UserCog, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { LoadingState } from '@/components/dashboard/shared/LoadingState';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { ErrorState } from '@/components/dashboard/shared/ErrorState';
import { format } from 'date-fns';
import { useState } from 'react';
import { User as StoreUser } from '@/lib/store/useUserStore';

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const { user, isAuthenticated, isHydrated } = useAuth();

    // For now, show current user as the only "user" since we're using /api/users/me
    // This page should be updated to show all users only for admin users
    const users: StoreUser[] = isAuthenticated && user.id ? [user] : [];
    const filteredUsers = searchTerm
        ? users.filter((u: StoreUser) =>
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.roles?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : users;

    const isLoading = !isHydrated;
    const isError = false;

    // Helper function to get badge color based on role
    const getRoleBadgeVariant = (roles: string) => {
        const role = roles?.toLowerCase() || '';
        switch (role) {
            case 'admin':
                return 'destructive';
            case 'seller':
                return 'default';
            case 'user':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const renderContent = () => {
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user: StoreUser) => (
                    <Card
                        key={user.id}
                        className="overflow-hidden hover:shadow-md transition-shadow border-muted"
                    >
                        <CardHeader className="p-6">
                            <div className="flex justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12 border">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{getInitials(user.name || 'U')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-lg">{user.name || 'Unknown'}</CardTitle>
                                        <CardDescription className="text-sm flex items-center gap-1">
                                            <Mail className="h-3 w-3" /> {user.email}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant={getRoleBadgeVariant(user.roles)}>{user.roles}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Member since login
                            </div>
                            {user.phone && (
                                <p className="text-sm mt-1 text-muted-foreground">Phone: {user.phone}</p>
                            )}
                        </CardContent>
                        <CardFooter className="p-6 pt-0 flex justify-end">
                            <Button variant="outline" size="sm" asChild className="flex items-center gap-2">
                                <Link href={`/dashboard/users/edit/${user.id}`}>
                                    <UserCog className="h-4 w-4" />
                                    Manage
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    };

    return (
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
                            <AdminGuard>
                                <Button asChild className="flex items-center gap-2">
                                    <Link href="/dashboard/users/add">
                                        <UserPlus className="h-4 w-4" />
                                        Add User
                                    </Link>
                                </Button>
                            </AdminGuard>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardContent className="p-6">{renderContent()}</CardContent>
            </Card>
        </div>
    );
}