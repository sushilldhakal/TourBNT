'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, useMyTours } from '@/lib/queries';
import { deleteTour } from '@/lib/api/tours';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import {
    CirclePlus,
    ArrowUpDown,
    AlertCircle,
    MapPin,
    User,
    Calendar,
    Edit3,
    Trash2,
    Eye,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { DataTable } from '@/components/dashboard/DataTable';
import { ActionDropdown } from '@/components/dashboard/shared/ActionDropdown';
import Image from 'next/image';
import { ColumnDef } from '@tanstack/react-table';
import { Tour } from '@/types/types';

export default function ToursPage() {
    const { toast } = useToast();
    const { invalidateTours } = useCacheManager();
    const [page, setPage] = useState(0); // 0-indexed page
    const [pageSize, setPageSize] = useState(10); // Items per page

    const { data, isLoading, isError } = useMyTours({ page, pageSize });
    const deleteMutation = useMutation({
        mutationFn: deleteTour,
        onSuccess: () => {
            invalidateTours();
            toast({
                title: 'Tour deleted successfully',
                description: 'The tour has been deleted successfully.',
            });
        },
        onError: () => {
            toast({
                title: 'Failed to delete tour',
                description: `An error occurred while deleting the tour. Please try again later.`,
                variant: 'destructive',
            });
        },
    });

    const handleDeleteTour = async (tourId: string) => {
        await deleteMutation.mutateAsync(tourId);
    };

    // Extract tours array from paginated response
    const tableData = data?.data ?? (Array.isArray(data) ? data : []); // Standard list format: data

    const columns: ColumnDef<Tour>[] = [
        {
            accessorKey: 'title',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="flex items-center gap-2"
                >
                    <MapPin className="h-4 w-4" />
                    Tour Title
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="max-w-xs">
                    <div className="image-area flex items-center gap-3">
                        <div className="relative group shrink-0">
                            <Image
                                width={48}
                                height={48}
                                className="h-12 w-12 object-cover rounded-lg border shadow-xs transition-transform group-hover:scale-105"
                                src={row.original.coverImage || '/placeholder-image.jpg'}
                                alt={row.original.title || 'Tour cover'}
                                onError={(e) => {
                                    e.currentTarget.src = '/placeholder-image.jpg';
                                }}
                            />
                        </div>

                        <Link
                            href={`/dashboard/tours/edit/${row.original.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                        >
                            {row.getValue('title')}
                        </Link>
                    </div>
                </div>

            ),
        },
        {
            accessorKey: 'author',
            header: () => (
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Author</span>
                </div>
            ),
            cell: ({ row }) => {
                const authors = row.original.author ?? [];
                return (
                    <div className="text-sm">
                        {authors.length > 0 ? (
                            authors.map((a, i) => (
                                <div className="flex items-center gap-2 font-medium text-muted-foreground" key={a.id || i}>
                                    <User className="h-3 w-3" />
                                    {a.name}
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center gap-2 font-medium text-muted-foreground">
                                <User className="h-3 w-3" />
                                Unknown Author
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Price',
            cell: ({ row }) => {
                const pricingOptions = row.original.pricingOptions;
                const price =
                    pricingOptions && pricingOptions.length > 0
                        ? pricingOptions[0].price || 0
                        : row.original.price || 0;
                const formatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }).format(price);
                return <div className="text-left font-medium">{formatted}</div>;
            },
        },
        {
            accessorKey: 'tourStatus',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="capitalize">{row.getValue('tourStatus')}</div>,
        },
        {
            accessorKey: 'code',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Code
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="capitalize">{row.getValue('code')}</div>,
        },
        {
            accessorKey: 'createdAt',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="flex items-center gap-2"
                >
                    <Calendar className="h-4 w-4" />
                    Created Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const createdAt = row.getValue('createdAt');
                const updatedAt = row.original.updatedAt; // Get from original data
                return (
                    <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                            <span className="font-medium">Created:</span>{' '}
                            {createdAt ? format(new Date(createdAt.toString()), 'MMM dd, yyyy') : '--'}
                        </div>
                        {updatedAt && (
                            <div>
                                <span className="font-medium">Updated:</span>{' '}
                                {format(new Date(updatedAt.toString()), 'MMM dd, yyyy')}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => (
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span>Actions</span>
                </div>
            ),
            enableHiding: true,
            cell: ({ row }) => {
                const tour = row.original;
                return (
                    <ActionDropdown
                        actions={[
                            {
                                label: 'Edit Tour',
                                icon: <Edit3 className="h-3 w-3" />,
                                href: `/dashboard/tours/edit/${tour.id}`,
                            },
                            {
                                label: 'Delete Tour',
                                icon: <Trash2 className="h-3 w-3" />,
                                onClick: () => {
                                    if (!tour.id) {
                                        toast({
                                            title: 'Error',
                                            description: 'Tour ID is missing. Cannot delete tour.',
                                            variant: 'destructive',
                                        });
                                        return;
                                    }
                                    handleDeleteTour(tour.id);
                                },
                                variant: 'destructive',
                            },
                        ]}
                    />
                );
            },
        },
    ];

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <Skeleton className="h-8" />
                        <Skeleton className="h-8" />
                        <Skeleton className="h-8" />
                        <Skeleton className="h-8" />
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-4 gap-4">
                            <Skeleton className="h-12" />
                            <Skeleton className="h-12" />
                            <Skeleton className="h-12" />
                            <Skeleton className="h-12" />
                        </div>
                    ))}
                </div>
            );
        }

        if (isError) {
            return (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
                    <div className="mx-auto w-fit rounded-full bg-destructive/10 p-3 mb-4">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Unable to Load Tours</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        We encountered an issue while fetching your tours. Please check your connection and try again.
                    </p>
                    <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            );
        }

        if (data && tableData && Array.isArray(tableData) && tableData.length > 0) {
            const totalTours = data?.totalTours || data?.pagination?.totalTours || 0;
            return (
                <DataTable
                    data={tableData}
                    columns={columns}
                    place="Filter Tours..."
                    column="title"
                    initialColumnVisibility={{ actions: false }}
                    serverSidePagination={{
                        totalCount: totalTours,
                        pageIndex: page,
                        pageSize: pageSize,
                        onPageChange: (newPage) => {
                            setPage(newPage);
                        },
                        onPageSizeChange: (newPageSize) => {
                            // If "All" is selected (10000), fetch all items
                            setPageSize(newPageSize);
                            setPage(0); // Reset to first page when changing page size
                        },
                    }}
                />
            );
        }

        return (
            <div className="text-center py-16 px-8">
                <div className="mx-auto w-fit rounded-full bg-muted/50 p-4 mb-6">
                    <MapPin className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No Tours Yet</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Start building your travel business by creating your first tour. Add destinations, itineraries, and
                    pricing to get started.
                </p>
                <Link href="/dashboard/tours/add">
                    <Button size="lg" className="gap-2">
                        <CirclePlus className="h-5 w-5" />
                        Create Your First Tour
                    </Button>
                </Link>
            </div>
        );
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={MapPin}
                badge="Tours"
                title="Tour Management"
                description="Manage your tours, itineraries, and destinations with ease"
                actions={
                    <Link href="/dashboard/tours/add">
                        <Button className="gap-2">
                            <CirclePlus className="h-4 w-4" />
                            Add New Tour
                        </Button>
                    </Link>
                }
            />

            {/* Main content */}
            <Card>
                <CardContent className="p-6">{renderContent()}</CardContent>
            </Card>
        </div>
    );
}
