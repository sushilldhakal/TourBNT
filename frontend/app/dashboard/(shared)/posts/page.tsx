'use client';

import { useMutation } from '@tanstack/react-query';
import { useCacheManager, useUserPosts } from '@/lib/queries';
import { deletePost } from '@/lib/api/posts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import {
    CirclePlus,
    ArrowUpDown,
    FileText,
    User,
    Calendar,
    Edit3,
    Trash2,
    CheckCircle2,
    Clock,
    AlertCircle,
    Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { DataTable } from '@/components/dashboard/DataTable';
import { ActionDropdown } from '@/components/dashboard/shared/ActionDropdown';
import Image from 'next/image'
import type { CellContext, ColumnDef, HeaderContext } from '@tanstack/react-table';
import { PostListItem, PostsListResponse } from '@/types/post';


export default function PostsPage() {
    const { toast } = useToast();
    const { invalidatePosts } = useCacheManager();

    const { data, isLoading, isError } = useUserPosts({ page: 1, limit: 10 });
    const deleteMutation = useMutation({
        mutationFn: deletePost,
        onSuccess: () => {
            invalidatePosts();
            toast({
                title: 'Post deleted successfully',
                description: 'The post has been deleted successfully.',
            });
        },
        onError: () => {
            toast({
                title: 'Failed to delete post',
                description: 'An error occurred while deleting the post. Please try again later.',
                variant: 'destructive',
            });
        },
    });

    const handleDeletePost = async (postId: string) => {
        await deleteMutation.mutateAsync(postId);
    };

    // Helper function to get status badge variant
    const getStatusBadgeVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'published':
                return 'default';
            case 'draft':
                return 'secondary';
            case 'pending':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    // Helper function to get status icon
    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'published':
                return <CheckCircle2 className="h-3 w-3" />;
            case 'draft':
                return <Clock className="h-3 w-3" />;
            case 'pending':
                return <AlertCircle className="h-3 w-3" />;
            default:
                return <Clock className="h-3 w-3" />;
        }
    };

    // ✅ Extract items from the new API response format
    const posts = (data as PostsListResponse)?.data ?? [];
    const tableData = posts;

    const columns: ColumnDef<PostListItem>[] = [
        {
            accessorKey: 'title',
            header: ({ column }: HeaderContext<PostListItem, unknown>) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="flex items-center gap-2"
                >
                    <FileText className="h-4 w-4" />
                    Post Title
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }: CellContext<PostListItem, unknown>) => (
                <div className="max-w-xs">
                    <div className="image-area flex items-center gap-3">
                        <div className="relative group shrink-0">
                            <Image src={row.original.image || '/placeholder-image.jpg'}
                                alt={row.original.title || 'Post cover'}
                                width={48}
                                height={48}
                                className="w-12 h-12 object-cover rounded-lg border shadow-xs transition-transform group-hover:scale-105"
                            />

                        </div>

                        <Link
                            href={`/dashboard/posts/edit/${row.original.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                        >
                            {row.getValue('title')}
                            <br />
                            {row.original.views && row.original.views > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {row.original.views} view{row.original.views === 1 ? '' : 's'}
                                </span>
                            )}
                            <span className="text-sm text-muted-foreground pl-4">
                                {Number.isFinite(Number(row.original.commentsCount))
                                    ? Number(row.original.commentsCount)
                                    : 0}{' '}
                                comment{Number(row.original.commentsCount) === 1 ? '' : 's'}
                            </span>
                        </Link>
                    </div>
                </div>
            ),
        },
        {
            header: 'Author',
            cell: ({ row }: CellContext<PostListItem, unknown>) => {
                const author = row.original.author;
                return (
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                            {Array.isArray(author) ? (
                                author.map((a, i: number) => (
                                    <div className="text-sm font-medium" key={i}>
                                        {a.name}
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm font-medium">{author?.name || 'Unknown'}</div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: ({ column }: HeaderContext<PostListItem, unknown>) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="h-8 px-2 lg:px-3"
                >
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }: CellContext<PostListItem, unknown>) => {
                const status = row.getValue('status') as string;
                return (
                    <Badge variant={getStatusBadgeVariant(status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(status)}
                        <span className="capitalize">{status}</span>
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'createdAt',
            header: ({ column }: HeaderContext<PostListItem, unknown>) => (
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
            cell: ({ row }: CellContext<PostListItem, unknown>) => {
                const createdAt = row.getValue('createdAt');
                return (
                    <div className="text-sm text-muted-foreground">
                        {createdAt ? format(new Date(createdAt.toString()), 'MMM dd, yyyy') : '--'}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            enableHiding: true,
            header: () => (
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span>Actions</span>
                </div>
            ),
            cell: ({ row }: CellContext<PostListItem, unknown>) => {
                const post = row.original;
                return (
                    <ActionDropdown
                        actions={[
                            {
                                label: 'Edit Post',
                                icon: <Edit3 className="h-3 w-3" />,
                                href: `/dashboard/posts/edit/${post.id}`,
                            },
                            {
                                label: 'Delete Post',
                                icon: <Trash2 className="h-3 w-3" />,
                                onClick: () => handleDeletePost(post.id),
                                variant: 'destructive',
                            },
                        ]}
                    />
                );
            },
        },
    ];

    // Header component
    const PostsHeader = () => (
        <DashboardCardHeader
            variant="compact"
            icon={FileText}
            badge="Posts"
            title="Posts Management"
            description="Manage and organize all your blog posts"
            actions={
                <Link href="/dashboard/posts/add">
                    <Button className="flex items-center gap-2">
                        <CirclePlus className="h-4 w-4" />
                        Add New Post
                    </Button>
                </Link>
            }
        />
    );

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-[200px]" />
                        <Skeleton className="h-10 w-[120px]" />
                    </div>
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <Skeleton className="h-12 w-16 rounded-lg" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-[200px]" />
                                            <Skeleton className="h-3 w-[100px]" />
                                        </div>
                                        <Skeleton className="h-6 w-[80px]" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-8 w-[60px]" />
                                            <Skeleton className="h-8 w-[70px]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        if (isError) {
            return (
                <>
                    <PostsHeader />
                    <Card className="border-destructive/50">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Posts</h3>
                            <p className="text-sm text-muted-foreground text-center mb-4">
                                We encountered an error while fetching your posts. Please try again later.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2"
                            >
                                <CirclePlus className="h-4 w-4" />
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                </>
            );
        }

        if (tableData && tableData.length > 0) {
            return (
                <>
                    <PostsHeader />
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                All Posts ({tableData.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable data={tableData} columns={columns} place="Filter posts..." column="title" />
                        </CardContent>
                    </Card>
                </>
            );
        }

        return (
            <>
                <PostsHeader />
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-foreground mb-2">No Posts Yet</h3>
                        <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                            Get started by creating your first post. Share your thoughts, stories, and experiences with
                            your audience.
                        </p>
                        <Link href="/dashboard/posts/add">
                            <Button className="flex items-center gap-2">
                                <CirclePlus className="h-4 w-4" />
                                Create Your First Post
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </>
        );
    };

    return <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">{renderContent()}</div>;
}
