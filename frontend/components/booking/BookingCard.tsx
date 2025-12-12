'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MapPin,
    Calendar,
    Users,
    DollarSign,
    Eye,
    Download,
    XCircle,
    MoreVertical,
    CheckCircle2,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

interface BookingCardProps {
    booking: Booking;
    onCancel?: (bookingId: string) => void;
    onDownloadVoucher?: (bookingId: string) => void;
}

export function BookingCard({ booking, onCancel, onDownloadVoucher }: BookingCardProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'upcoming':
                return (
                    <Badge variant="default" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Upcoming
                    </Badge>
                );
            case 'past':
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Cancelled
                    </Badge>
                );
            default:
                return null;
        }
    };

    const canCancel = () => {
        if (booking.status !== 'upcoming') return false;
        const now = new Date();
        const bookingDate = new Date(booking.date);
        const hoursDiff = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursDiff > 48; // Can cancel if more than 48 hours away
    };

    const handleCancel = () => {
        if (onCancel && canCancel()) {
            onCancel(booking.id);
        }
    };

    const handleDownloadVoucher = () => {
        if (onDownloadVoucher) {
            onDownloadVoucher(booking.id);
        }
    };

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48 w-full">
                <Image
                    src={booking.tour.coverImage}
                    alt={booking.tour.title}
                    fill
                    className="object-cover"
                />
                <div className="absolute top-4 right-4">
                    {getStatusBadge(booking.status)}
                </div>
            </div>

            <CardContent className="p-4 space-y-4">
                {/* Tour Title and Destination */}
                <div>
                    <h3 className="font-semibold text-lg line-clamp-1">
                        {booking.tour.title}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4" />
                        {booking.tour.destination}
                    </div>
                </div>

                {/* Booking Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Travel Date</p>
                            <p className="font-medium">{format(new Date(booking.date), 'MMM d, yyyy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Travelers</p>
                            <p className="font-medium">{booking.travelers}</p>
                        </div>
                    </div>
                </div>

                {/* Reference and Price */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                        <p className="text-xs text-muted-foreground">Reference</p>
                        <p className="text-sm font-mono font-medium">{booking.referenceNumber}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-primary flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {booking.totalPrice.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                    >
                        <Link href={`/profile/bookings/${booking.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                        </Link>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleDownloadVoucher}>
                                <Download className="h-4 w-4 mr-2" />
                                Download Voucher
                            </DropdownMenuItem>
                            {canCancel() && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleCancel}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancel Booking
                                    </DropdownMenuItem>
                                </>
                            )}
                            {!canCancel() && booking.status === 'upcoming' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled>
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        Cannot cancel (within 48h)
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Cancellation Warning */}
                {!canCancel() && booking.status === 'upcoming' && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>
                            Cancellation is not available within 48 hours of departure
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
