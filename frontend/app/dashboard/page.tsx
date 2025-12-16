'use client';

import { useQuery } from '@tanstack/react-query';
import { getTours } from '@/lib/api/tours';
import { getPosts } from '@/lib/api/posts';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, FileText, Users, Mail, CirclePlus, Image, Settings } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DashboardPage() {
    const { user, isAuthenticated } = useAuth();

    const { data: tours } = useQuery({
        queryKey: ['tours-count'],
        queryFn: () => getTours({ pageParam: 0, limit: 1 }),
    });

    const { data: posts } = useQuery({
        queryKey: ['posts-count'],
        queryFn: getPosts,
    });

    const toursCount = tours?.totalTours || 0;
    const postsCount = ((posts as any)?.posts || (posts as any)?.data || []).length;
    // For non-admin users, just show 1 (current user) or hide the stat
    const usersCount = isAuthenticated ? 1 : 0;

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">
                        Welcome back{user.name ? `, ${user.name}` : ''}!
                    </CardTitle>
                    <CardDescription className="text-base">
                        {format(new Date(), 'EEEE, MMMM d, yyyy')}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tours</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{toursCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active tour listings</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{postsCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Published blog posts</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Your Profile</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.roles || 'User'}</div>
                        <p className="text-xs text-muted-foreground mt-1">Your account role</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground mt-1">Newsletter subscribers</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <Link href="/dashboard/tours/add">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <CirclePlus className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Add New Tour</CardTitle>
                                        <CardDescription className="text-xs">
                                            Create a tour listing
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <Link href="/dashboard/posts/add">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Create Post</CardTitle>
                                        <CardDescription className="text-xs">
                                            Write a blog post
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <Link href="/dashboard/users">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Manage Users</CardTitle>
                                        <CardDescription className="text-xs">
                                            View all users
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Link>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <Link href="/dashboard/gallery">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Image className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">View Gallery</CardTitle>
                                        <CardDescription className="text-xs">
                                            Manage media files
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Link>
                    </Card>
                </div>
            </div>
        </div>
    );
}
