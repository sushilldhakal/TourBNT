'use client';

import { Bookmark } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { addWishlistTour, getWishlist, removeWishlistTour } from '@/lib/api/account';
import { useRole } from '@/lib/hooks/useRole';

const wishlistKey = ['account', 'wishlist'] as const;

/** Saves or removes this tour from the signed-in traveller's bookmarks. */
export function SaveTourButton({ tourId }: { tourId: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const { isAuthenticated, isHydrated } = useRole();
    const queryClient = useQueryClient();
    const wishlist = useQuery({
        queryKey: wishlistKey,
        queryFn: getWishlist,
        enabled: isHydrated && isAuthenticated,
    });
    const saved = (wishlist.data ?? []).some((tour) => tour.tourId === tourId);

    const toggle = useMutation({
        mutationFn: () => (saved ? removeWishlistTour(tourId) : addWishlistTour(tourId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wishlistKey });
            toast({ title: saved ? 'Removed from bookmarks' : 'Saved to bookmarks' });
        },
        onError: (error: Error) => toast({ title: 'Could not update bookmarks', description: error.message, variant: 'destructive' }),
    });

    const onClick = () => {
        if (!isAuthenticated) {
            router.push(`/auth/login?redirect=${encodeURIComponent(`/tours/${tourId}`)}`);
            return;
        }
        toggle.mutate();
    };

    return (
        <Button type="button" variant={saved ? 'default' : 'outline'} size="sm" onClick={onClick} disabled={toggle.isPending}>
            <Bookmark className="mr-1.5 h-4 w-4" />
            {saved ? 'Saved' : 'Save'}
        </Button>
    );
}
