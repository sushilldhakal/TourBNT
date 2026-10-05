'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Bookmark, Calendar, CreditCard, Lock, MessageSquare, Star, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { changeMyPassword } from '@/lib/api/users';
import {
    getAccountBookings,
    getMyComments,
    getMyReviews,
    getSavedCards,
    getWishlist,
    removeWishlistTour,
    saveCards,
    type AccountBooking,
    type CardBrand,
    type SavedCard,
} from '@/lib/api/account';
import { useRole } from '@/lib/hooks/useRole';
import useUserStore from '@/lib/store/useUserStore';

const TABS = ['bookings', 'bookmarks', 'activity', 'payments', 'cards', 'password'] as const;
type AccountTab = (typeof TABS)[number];

const keys = {
    bookings: ['account', 'bookings'] as const,
    wishlist: ['account', 'wishlist'] as const,
    reviews: ['account', 'reviews'] as const,
    comments: ['account', 'comments'] as const,
    cards: ['account', 'cards'] as const,
};

function isTab(value: string | null): value is AccountTab {
    return TABS.some((tab) => tab === value);
}

function when(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return format(date, 'MMM d, yyyy');
}

function money(amount: number | null | undefined, currency = 'USD'): string {
    if (amount == null || Number.isNaN(amount)) return '—';
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

function labelOf(value: string): string {
    return value.replace(/_/g, ' ');
}

function Empty({ children }: { children: string }) {
    return <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

function Problem({ message }: { message: string }) {
    return <p className="text-sm text-destructive">{message}</p>;
}

export function TravelerAccount() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, isHydrated } = useRole();
    const name = useUserStore((state) => state.user.name);
    const requested = searchParams.get('tab');
    const [tab, setTab] = useState<AccountTab>(isTab(requested) ? requested : 'bookings');
    const [seenRequest, setSeenRequest] = useState(requested);

    if (requested !== seenRequest) {
        setSeenRequest(requested);
        if (isTab(requested)) setTab(requested);
    }

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.replace('/auth/login?redirect=/account');
        }
    }, [isHydrated, isAuthenticated, router]);

    if (!isHydrated) {
        return <div className="py-24 text-center text-sm text-muted-foreground">Loading your account…</div>;
    }

    if (!isAuthenticated) {
        return <div className="py-24 text-center text-sm text-muted-foreground">Redirecting to sign in…</div>;
    }

    const selectTab = (next: string) => {
        if (!isTab(next)) return;
        setTab(next);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', next);
        router.replace(`/account?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="py-10">
            <div className="mb-8">
                <p className="text-sm font-medium text-primary">Your account</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">Hello{name ? `, ${name}` : ''}</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                    Bookings, saved tours, reviews, payments, and the card and password on this account.
                </p>
            </div>

            <Tabs value={tab} onValueChange={selectTab}>
                <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1">
                    <TabsTrigger value="bookings"><Calendar className="mr-1.5 h-4 w-4" />Bookings</TabsTrigger>
                    <TabsTrigger value="bookmarks"><Bookmark className="mr-1.5 h-4 w-4" />Bookmarks</TabsTrigger>
                    <TabsTrigger value="activity"><MessageSquare className="mr-1.5 h-4 w-4" />Reviews</TabsTrigger>
                    <TabsTrigger value="payments"><Wallet className="mr-1.5 h-4 w-4" />Payments</TabsTrigger>
                    <TabsTrigger value="cards"><CreditCard className="mr-1.5 h-4 w-4" />Cards</TabsTrigger>
                    <TabsTrigger value="password"><Lock className="mr-1.5 h-4 w-4" />Password</TabsTrigger>
                </TabsList>

                <TabsContent value="bookings"><BookingsPanel /></TabsContent>
                <TabsContent value="bookmarks"><BookmarksPanel /></TabsContent>
                <TabsContent value="activity"><ActivityPanel /></TabsContent>
                <TabsContent value="payments"><PaymentsPanel /></TabsContent>
                <TabsContent value="cards"><CardsPanel /></TabsContent>
                <TabsContent value="password"><PasswordPanel /></TabsContent>
            </Tabs>
        </div>
    );
}

function BookingsPanel() {
    const query = useQuery({ queryKey: keys.bookings, queryFn: getAccountBookings });
    if (query.isLoading) return <Empty>Loading bookings…</Empty>;
    if (query.isError) return <Problem message={query.error instanceof Error ? query.error.message : 'Could not load bookings'} />;
    const bookings = query.data ?? [];
    if (bookings.length === 0) {
        return <Empty>You have no bookings yet. When you book a tour, it will show up here.</Empty>;
    }
    return (
        <ul className="space-y-3">
            {bookings.map((booking) => (
                <li key={booking.id}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{booking.tourTitle}</CardTitle>
                            <CardDescription>
                                {booking.bookingReference} · Departs {when(booking.departureDate)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                            <p className="capitalize text-muted-foreground">
                                {labelOf(booking.status)} · {labelOf(booking.paymentStatus)} · {money(booking.pricing?.totalPrice, booking.pricing?.currency)}
                            </p>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/booking/${booking.id}`}>View booking</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </li>
            ))}
        </ul>
    );
}

function BookmarksPanel() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const query = useQuery({ queryKey: keys.wishlist, queryFn: getWishlist });
    const remove = useMutation({
        mutationFn: removeWishlistTour,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: keys.wishlist });
        },
        onError: (error: Error) => toast({ title: 'Could not remove bookmark', description: error.message, variant: 'destructive' }),
    });

    if (query.isLoading) return <Empty>Loading bookmarks…</Empty>;
    if (query.isError) return <Problem message={query.error instanceof Error ? query.error.message : 'Could not load bookmarks'} />;
    const tours = query.data ?? [];
    if (tours.length === 0) return <Empty>Tours you save from a tour page will be listed here.</Empty>;

    return (
        <ul className="grid gap-3 sm:grid-cols-2">
            {tours.map((tour) => (
                <li key={tour.tourId}>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                <Link href={`/tours/${tour.tourId}`} className="hover:underline">{tour.title}</Link>
                            </CardTitle>
                            <CardDescription>{tour.code} · Saved {when(tour.savedAt)}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{money(tour.price)}</p>
                            <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(tour.tourId)}>
                                Remove
                            </Button>
                        </CardContent>
                    </Card>
                </li>
            ))}
        </ul>
    );
}

function ActivityPanel() {
    const reviews = useQuery({ queryKey: keys.reviews, queryFn: getMyReviews });
    const comments = useQuery({ queryKey: keys.comments, queryFn: getMyComments });
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Star className="h-4 w-4" />Reviews</h2>
                {reviews.isLoading ? <Empty>Loading reviews…</Empty> : reviews.isError ? (
                    <Problem message={reviews.error instanceof Error ? reviews.error.message : 'Could not load reviews'} />
                ) : (reviews.data ?? []).length === 0 ? (
                    <Empty>Reviews you leave on a tour will show up here.</Empty>
                ) : (
                    <ul className="space-y-3">
                        {(reviews.data ?? []).map((review) => (
                            <li key={review.id} className="rounded-lg border border-border p-4">
                                <p className="font-medium">
                                    <Link href={`/tours/${review.tourId}`} className="hover:underline">{review.tourTitle}</Link>
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">{review.rating} / 5 · {labelOf(review.status)} · {when(review.createdAt)}</p>
                                <p className="mt-2 text-sm">{review.comment}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><MessageSquare className="h-4 w-4" />Comments</h2>
                {comments.isLoading ? <Empty>Loading comments…</Empty> : comments.isError ? (
                    <Problem message={comments.error instanceof Error ? comments.error.message : 'Could not load comments'} />
                ) : (comments.data ?? []).length === 0 ? (
                    <Empty>Comments you leave on a story will show up here.</Empty>
                ) : (
                    <ul className="space-y-3">
                        {(comments.data ?? []).map((comment) => (
                            <li key={comment.id} className="rounded-lg border border-border p-4">
                                <p className="font-medium">
                                    <Link href={`/blog/${comment.postId}`} className="hover:underline">{comment.postTitle}</Link>
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">{comment.approve ? 'Visible' : 'Waiting for approval'} · {when(comment.createdAt)}</p>
                                <p className="mt-2 text-sm">{comment.text}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function PaymentsPanel() {
    const query = useQuery({ queryKey: keys.bookings, queryFn: getAccountBookings });
    if (query.isLoading) return <Empty>Loading payments…</Empty>;
    if (query.isError) return <Problem message={query.error instanceof Error ? query.error.message : 'Could not load payments'} />;
    const rows = (query.data ?? []).filter((booking) => booking.paidAmount > 0 || booking.paymentStatus !== 'unpaid');
    if (rows.length === 0) return <Empty>Payments for your bookings will be listed here.</Empty>;
    return (
        <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Booking</th>
                        <th className="px-4 py-3 font-medium">Method</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Paid</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((booking) => (
                        <PaymentRow key={booking.id} booking={booking} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function PaymentRow({ booking }: { booking: AccountBooking }) {
    return (
        <tr className="border-t border-border">
            <td className="px-4 py-3 whitespace-nowrap">{when(booking.createdAt)}</td>
            <td className="px-4 py-3">
                <Link href={`/booking/${booking.id}/invoice`} className="font-medium hover:underline">{booking.tourTitle}</Link>
                <p className="text-xs text-muted-foreground">{booking.bookingReference} · {labelOf(booking.paymentType)}</p>
            </td>
            <td className="px-4 py-3 capitalize">{booking.paymentMethod ? labelOf(booking.paymentMethod) : '—'}</td>
            <td className="px-4 py-3 capitalize">{labelOf(booking.paymentStatus)}</td>
            <td className="px-4 py-3 text-right whitespace-nowrap">{money(booking.paidAmount, booking.pricing?.currency)}</td>
        </tr>
    );
}

const BRANDS: { value: CardBrand; label: string }[] = [
    { value: 'visa', label: 'Visa' },
    { value: 'mastercard', label: 'Mastercard' },
    { value: 'amex', label: 'American Express' },
    { value: 'other', label: 'Other' },
];

function CardsPanel() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const query = useQuery({ queryKey: keys.cards, queryFn: getSavedCards });
    const [draft, setDraft] = useState({ cardholderName: '', brand: 'visa' as CardBrand, last4: '', expiryMonth: '', expiryYear: '' });

    const persist = useMutation({
        mutationFn: saveCards,
        onSuccess: (cards) => {
            queryClient.setQueryData(keys.cards, cards);
            setDraft({ cardholderName: '', brand: 'visa', last4: '', expiryMonth: '', expiryYear: '' });
            toast({ title: 'Card saved', description: 'Only the last four digits are kept.' });
        },
        onError: (error: Error) => toast({ title: 'Could not save card', description: error.message, variant: 'destructive' }),
    });

    const cards = query.data ?? [];

    const addCard = () => {
        const next: SavedCard = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `card-${Date.now()}`,
            brand: draft.brand,
            last4: draft.last4.trim(),
            expiryMonth: Number(draft.expiryMonth),
            expiryYear: Number(draft.expiryYear),
            cardholderName: draft.cardholderName.trim(),
        };
        persist.mutate([...cards, next]);
    };

    const removeCard = (id: string) => persist.mutate(cards.filter((card) => card.id !== id));

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Saved cards</CardTitle>
                    <CardDescription>We store the brand, the name, the expiry, and the last four digits. Never the full number or the security code.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {query.isLoading ? <Empty>Loading cards…</Empty> : query.isError ? (
                        <Problem message={query.error instanceof Error ? query.error.message : 'Could not load cards'} />
                    ) : cards.length === 0 ? (
                        <Empty>No card saved yet.</Empty>
                    ) : cards.map((card) => (
                        <div key={card.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                            <div>
                                <p className="font-medium capitalize">{card.brand} ···· {card.last4}</p>
                                <p className="text-sm text-muted-foreground">{card.cardholderName} · {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}</p>
                            </div>
                            <Button variant="outline" size="sm" disabled={persist.isPending} onClick={() => removeCard(card.id)}>Remove</Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Add a card</CardTitle>
                    <CardDescription>Type only the last four digits of the card you want to recognize at checkout.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="card-name">Name on card</Label>
                        <Input id="card-name" value={draft.cardholderName} onChange={(event) => setDraft({ ...draft, cardholderName: event.target.value })} autoComplete="cc-name" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="card-brand">Brand</Label>
                        <select
                            id="card-brand"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={draft.brand}
                            onChange={(event) => setDraft({ ...draft, brand: event.target.value as CardBrand })}
                        >
                            {BRANDS.map((brand) => <option key={brand.value} value={brand.value}>{brand.label}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="card-last4">Last 4</Label>
                            <Input id="card-last4" inputMode="numeric" maxLength={4} value={draft.last4} onChange={(event) => setDraft({ ...draft, last4: event.target.value.replace(/\D/g, '').slice(0, 4) })} autoComplete="off" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="card-month">Month</Label>
                            <Input id="card-month" inputMode="numeric" placeholder="MM" maxLength={2} value={draft.expiryMonth} onChange={(event) => setDraft({ ...draft, expiryMonth: event.target.value.replace(/\D/g, '').slice(0, 2) })} autoComplete="cc-exp-month" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="card-year">Year</Label>
                            <Input id="card-year" inputMode="numeric" placeholder="YYYY" maxLength={4} value={draft.expiryYear} onChange={(event) => setDraft({ ...draft, expiryYear: event.target.value.replace(/\D/g, '').slice(0, 4) })} autoComplete="cc-exp-year" />
                        </div>
                    </div>
                    <Button type="button" disabled={persist.isPending || cards.length >= 5} onClick={addCard}>Save card</Button>
                </CardContent>
            </Card>
        </div>
    );
}

function PasswordPanel() {
    const { toast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const change = useMutation({
        mutationFn: changeMyPassword,
        onSuccess: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            toast({ title: 'Password updated' });
        },
        onError: (error: Error) => toast({ title: 'Could not change password', description: error.message, variant: 'destructive' }),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (newPassword.length < 8) {
            toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: 'Passwords do not match', variant: 'destructive' });
            return;
        }
        change.mutate({ currentPassword, newPassword });
    };

    return (
        <Card className="max-w-md">
            <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>Enter the password you use now, then choose a new one.</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={submit}>
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current password</Label>
                        <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New password</Label>
                        <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm new password</Label>
                        <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
                    </div>
                    <Button type="submit" disabled={change.isPending}>{change.isPending ? 'Saving…' : 'Update password'}</Button>
                </form>
            </CardContent>
        </Card>
    );
}
