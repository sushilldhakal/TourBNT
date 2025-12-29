'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mail, Search, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { getSubscribers, unsubscribeEmail, Subscriber, SubscribersResponse } from '@/lib/api/subscribers';
import { DataTable } from '@/components/dashboard/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LoadingState } from '@/components/dashboard/shared/LoadingState';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { ErrorState } from '@/components/dashboard/shared/ErrorState';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function SubscriberList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteEmail, setDeleteEmail] = useState<string | null>(null);
    const observerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Infinite query for subscribers
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
    } = useInfiniteQuery({
        queryKey: ['subscribers', 'infinite'],
        queryFn: ({ pageParam }: { pageParam: number }) => {
            return getSubscribers({ page: pageParam, limit: 50 });
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: SubscribersResponse) => {
            if (lastPage.pagination) {
                // API returns pagination.page (not currentPage)
                const currentPage = lastPage.pagination.page || lastPage.pagination.currentPage || 1;
                if (currentPage < lastPage.pagination.totalPages) {
                    return currentPage + 1;
                }
            }
            return undefined;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Load more pages initially for table view
    useEffect(() => {
        if (infiniteData && hasNextPage && !isFetchingNextPage) {
            const loadedPages = infiniteData.pages.length;
            if (loadedPages < 3) {
                fetchNextPage();
            }
        }
    }, [infiniteData, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Flatten all pages from infinite query
    const allSubscribers: Subscriber[] = useMemo(() => {
        if (!infiniteData) return [];
        return infiniteData.pages.flatMap((page: SubscribersResponse) => {
            // API returns { data: Subscriber[], pagination: {...} }
            // Check data array first (primary format)
            if (page.data && Array.isArray(page.data)) {
                return page.data;
            }
            // Fallback: check for items array (alternative format)
            if (page.items && Array.isArray(page.items)) {
                return page.items;
            }
            // If page itself is an array (direct response)
            if (Array.isArray(page)) {
                return page;
            }
            return [];
        });
    }, [infiniteData]);

    // Filter subscribers based on search term
    const filteredSubscribers = useMemo(() => {
        if (!searchTerm) return allSubscribers;
        const term = searchTerm.toLowerCase();
        return allSubscribers.filter(
            (subscriber) =>
                subscriber.email?.toLowerCase().includes(term)
        );
    }, [allSubscribers, searchTerm]);

    // Extract total subscribers from pagination
    const totalSubscribers = useMemo(() => {
        if (!infiniteData || infiniteData.pages.length === 0) return 0;
        // Check all pages to find the highest total value
        let maxTotal = 0;
        for (const page of infiniteData.pages) {
            if (page.pagination) {
                const total = page.pagination.total || page.pagination.totalItems || 0;
                if (total > maxTotal) maxTotal = total;
            }
        }
        // Return the max total found, or fallback to count of loaded subscribers
        return maxTotal > 0 ? maxTotal : allSubscribers.length;
    }, [infiniteData, allSubscribers]);

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (email: string) => unsubscribeEmail(email),
        onSuccess: () => {
            toast.success('Subscriber removed successfully');
            setDeleteEmail(null);
            queryClient.invalidateQueries({ queryKey: ['subscribers'] });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.error?.message || error?.message || 'Failed to remove subscriber';
            toast.error(message);
        },
    });

    // Table columns
    const columns: ColumnDef<Subscriber>[] = useMemo(
        () => [
            {
                accessorKey: 'email',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="h-8 px-2 lg:px-3"
                    >
                        Email
                    </Button>
                ),
                cell: ({ row }) => {
                    const subscriber = row.original;
                    return (
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{subscriber.email}</span>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'subscribedAt',
                header: 'Subscribed At',
                cell: ({ row }) => {
                    const subscriber = row.original;
                    const date = subscriber.subscribedAt || subscriber.createdAt;
                    return (
                        <div className="text-sm">
                            {date ? format(new Date(date), 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const subscriber = row.original;
                    return (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteEmail(subscriber.email)}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    );
                },
            },
        ],
        []
    );

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

    useEffect(() => {
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
    }, [handleObserver]);

    if (isLoading) {
        return <LoadingState type="table" rows={6} />;
    }

    if (isError) {
        return (
            <ErrorState
                title="Error Loading Subscribers"
                description={error instanceof Error ? error.message : 'We encountered an error while fetching subscribers. Please try again.'}
                onRetry={() => window.location.reload()}
            />
        );
    }

    const hasMoreSubscribers = totalSubscribers > allSubscribers.length;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Mail className="h-6 w-6 text-primary" />
                                Subscribers ({filteredSubscribers.length})
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Manage newsletter subscribers
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 w-full md:w-[300px]"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {hasMoreSubscribers && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Showing {allSubscribers.length} of {totalSubscribers} subscribers.{' '}
                                {hasNextPage && (
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

                    {filteredSubscribers.length === 0 ? (
                        <EmptyState
                            icon={<Mail className="h-16 w-16" />}
                            title={searchTerm ? 'No Subscribers Found' : 'No Subscribers Yet'}
                            description={
                                searchTerm
                                    ? 'Try adjusting your search terms or clear the search to see all subscribers.'
                                    : 'Get started by adding your first subscriber to the newsletter.'
                            }
                        />
                    ) : (
                        <>
                            <DataTable
                                data={filteredSubscribers}
                                columns={columns}
                                place="Search subscribers by email..."
                                colum="email"
                            />
                            {/* Infinite scroll trigger */}
                            {hasNextPage && (
                                <div ref={observerRef} className="h-10 flex items-center justify-center py-4">
                                    {isFetchingNextPage && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 className="animate-spin h-5 w-5" />
                                            <span>Loading more subscribers...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteEmail} onOpenChange={(open) => !open && setDeleteEmail(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Subscriber</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <strong>{deleteEmail}</strong> from the newsletter subscription list?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteEmail(null)}
                            disabled={deleteMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteEmail && deleteMutation.mutate(deleteEmail)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                'Remove'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

