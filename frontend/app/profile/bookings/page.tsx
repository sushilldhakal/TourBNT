'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Calendar,
    Search,
    SlidersHorizontal,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
} from 'lucide-react';
import { BookingCard } from '@/components/booking/BookingCard';

interface Booking {
    id: string;
    referenceNumber: string;
    tour: {
        id: string;
        title: string;
        coverImage: string;
        destination: string;
    };
    date: Date;
    status: 'upcoming' | 'past' | 'cancelled';
    travelers: number;
    totalPrice: number;
    createdAt: Date;
}

export default function MyBookingsPage() {
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'price' | 'created'>('date');

    // Fetch bookings
    const { data: bookings, isLoading, error, refetch } = useQuery({
        queryKey: ['bookings', activeTab],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/bookings/my-bookings?status=${activeTab}`);
            // return response.json();

            // Mock data for now
            await new Promise(resolve => setTimeout(resolve, 1000));
            const mockBookings: Booking[] = [
                {
                    id: '1',
                    referenceNumber: 'BK-ABC123',
                    tour: {
                        id: '1',
                        title: 'Amazing Mountain Trek',
                        coverImage: '/images/tours/default.jpg',
                        destination: 'Swiss Alps',
                    },
                    date: new Date('2024-06-15'),
                    status: 'upcoming',
                    travelers: 2,
                    totalPrice: 998,
                    createdAt: new Date('2024-01-15'),
                },
                {
                    id: '2',
                    referenceNumber: 'BK-DEF456',
                    tour: {
                        id: '2',
                        title: 'Beach Paradise Getaway',
                        coverImage: '/images/tours/default.jpg',
                        destination: 'Maldives',
                    },
                    date: new Date('2024-07-20'),
                    status: 'upcoming',
                    travelers: 4,
                    totalPrice: 2396,
                    createdAt: new Date('2024-02-01'),
                },
            ];

            return mockBookings.filter(b => b.status === activeTab);
        },
    });

    // Filter and sort bookings
    const filteredBookings = bookings
        ?.filter(booking =>
            booking.tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            booking.tour.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
            booking.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'price':
                    return b.totalPrice - a.totalPrice;
                case 'created':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                default:
                    return 0;
            }
        });

    const getTabIcon = (tab: string) => {
        switch (tab) {
            case 'upcoming':
                return <Clock className="h-4 w-4" />;
            case 'past':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            default:
                return null;
        }
    };

    const getTabCount = (tab: string) => {
        // In a real app, this would come from the API
        return bookings?.length || 0;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Calendar className="h-8 w-8 text-primary" />
                        My Bookings
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage all your tour bookings
                    </p>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by tour name, destination, or reference..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="date">Travel Date</SelectItem>
                                        <SelectItem value="price">Price</SelectItem>
                                        <SelectItem value="created">Booking Date</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="upcoming" className="flex items-center gap-2">
                            {getTabIcon('upcoming')}
                            Upcoming
                            {getTabCount('upcoming') > 0 && (
                                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                    {getTabCount('upcoming')}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="past" className="flex items-center gap-2">
                            {getTabIcon('past')}
                            Past
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="flex items-center gap-2">
                            {getTabIcon('cancelled')}
                            Cancelled
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-6">
                        {/* Loading State */}
                        {isLoading && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <Card key={i}>
                                        <CardContent className="pt-6">
                                            <div className="space-y-3">
                                                <Skeleton className="h-48 w-full" />
                                                <Skeleton className="h-4 w-3/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Failed to load bookings. Please try again.
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => refetch()}
                                        className="ml-4"
                                    >
                                        Retry
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Empty State */}
                        {!isLoading && !error && filteredBookings?.length === 0 && (
                            <Card>
                                <CardContent className="pt-12 pb-12 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="rounded-full bg-muted p-4">
                                            <Calendar className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                {searchQuery
                                                    ? 'No bookings found'
                                                    : `No ${activeTab} bookings`}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {searchQuery
                                                    ? 'Try adjusting your search criteria'
                                                    : `You don't have any ${activeTab} bookings yet`}
                                            </p>
                                        </div>
                                        {!searchQuery && activeTab === 'upcoming' && (
                                            <Button asChild>
                                                <a href="/tours">Browse Tours</a>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Bookings Grid */}
                        {!isLoading && !error && filteredBookings && filteredBookings.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {filteredBookings.map((booking) => (
                                    <BookingCard key={booking.id} booking={booking} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
