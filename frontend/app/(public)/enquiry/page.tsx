'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { getConversations } from '@/lib/api/conversations';
import type { Conversation } from '@/lib/api/conversations';
import { ContentContainer } from '@/components/layout/PublicLayoutClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function EnquiriesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getConversations({ limit: 50 })
            .then((res) => {
                if (cancelled) return;
                setConversations(res.items ?? []);
                setAuthError(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setConversations([]);
                    setAuthError(true);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const enquiries = useMemo(
        () => conversations.filter((c) => c.type === 'enquiry' || c.type === 'contact'),
        [conversations]
    );

    return (
        <>
            {/* Skip to main content for keyboard users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground"
            >
                Skip to main content
            </a>

            {/* Hero banner – full width, matches public tours listing style */}
            <div
                className="relative h-[150px] sm:h-[180px] md:h-[200px] bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop')",
                }}
                role="banner"
                aria-label="Enquiries page banner"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
                <div className="relative h-full flex items-center justify-center px-4">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-white text-center">
                        My Enquiries
                    </h1>
                </div>
            </div>

            <section
                id="main-content"
                className="w-full py-8 pt-0"
                aria-label="My enquiries list"
            >
                {/* Breadcrumb strip – same structure as ToursBreadcrumb */}
                <div className="border-b border-border bg-background mb-6">
                    <ContentContainer className="px-4 py-3 md:px-6 lg:px-8">
                        <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
                            <Link
                                href="/"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Home
                            </Link>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <span className="text-foreground font-medium">Enquiries</span>
                        </nav>
                    </ContentContainer>
                </div>

                <ContentContainer className="px-4 md:px-6 lg:px-8 space-y-6">

                    {/* Header + CTA card */}
                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                                    Enquiries
                                </CardTitle>
                                <CardDescription className="text-sm text-muted-foreground max-w-2xl">
                                    View and manage your tour enquiries. Replies from sellers or admins appear
                                    in the timeline for each enquiry.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs">
                                    {enquiries.length} enquiry{enquiries.length === 1 ? '' : 'ies'}
                                </Badge>
                                <Button asChild size="sm" className="gap-2">
                                    <Link href="/contact" aria-label="Create a new enquiry">
                                        <Mail className="h-4 w-4" aria-hidden="true" />
                                        New enquiry
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Content state */}
                    {authError ? (
                        <Card className="border-destructive/40">
                            <CardContent className="py-10 flex flex-col items-center text-center gap-3">
                                <p className="text-base font-medium text-foreground">
                                    Sign in to view your enquiries
                                </p>
                                <p className="text-sm text-muted-foreground max-w-md">
                                    Your enquiries are linked to your account. Please sign in to see and reply
                                    to previous conversations.
                                </p>
                                <Button asChild variant="outline" className="mt-2">
                                    <Link href="/auth/login?redirect=/enquiry">Sign in</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                <span>Loading your enquiries…</span>
                            </div>
                        </div>
                    ) : enquiries.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="py-12 flex flex-col items-center text-center gap-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                                    <MessageCircle className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-semibold text-foreground">
                                        You don&apos;t have any enquiries yet
                                    </p>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        Have a question about a tour or booking? Send us an enquiry and we&apos;ll
                                        get back to you as soon as possible.
                                    </p>
                                </div>
                                <Button asChild className="mt-2" variant="outline">
                                    <Link href="/contact">Submit an enquiry</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {enquiries.map((c) => {
                                const id =
                                    (c as { id?: string }).id ??
                                    (c as { _id?: string })._id ??
                                    '';

                                const tour =
                                    c.tourId && typeof c.tourId === 'object'
                                        ? (c.tourId as {
                                              _id?: string;
                                              id?: string;
                                              slug?: string;
                                              title?: string;
                                              code?: string;
                                              coverImage?: string;
                                              images?: string[];
                                          })
                                        : null;

                                const tourTitle = tour?.title;
                                const tourCode = tour?.code;
                                const tourSlug = tour?.slug || tour?._id || tour?.id;
                                const tourCover =
                                    tour?.coverImage ||
                                    (Array.isArray(tour?.images) ? tour?.images[0] : undefined);

                                const statusLabel =
                                    c.status === 'open'
                                        ? 'Open'
                                        : c.status === 'replied'
                                        ? 'Replied'
                                        : 'Closed';
                                const statusVariant =
                                    c.status === 'open'
                                        ? 'secondary'
                                        : c.status === 'replied'
                                        ? 'default'
                                        : 'outline';

                                return (
                                    <Card
                                        key={id}
                                        className="border hover:border-primary/40 hover:shadow-md transition-all duration-200"
                                    >
                                        <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                <div className="space-y-1">
                                                    <h2 className="text-base sm:text-lg font-semibold text-foreground line-clamp-2">
                                                        {c.subject}
                                                    </h2>
                                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                                        {tourTitle || c.type === 'enquiry'
                                                            ? 'Tour enquiry'
                                                            : 'Contact'}
                                                        {tourCode && (
                                                            <span className="ml-2">
                                                                · Code: {tourCode}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Updated{' '}
                                                        {new Date(c.updatedAt).toLocaleDateString()}
                                                    </p>

                                                    {tour && tourSlug && (
                                                        <Link
                                                            href={`/tours/${tourSlug}`}
                                                            className="mt-3 flex items-center gap-3 group"
                                                            aria-label={`View tour ${tourTitle ?? ''}`}
                                                        >
                                                            <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                                                {tourCover ? (
                                                                    <Image
                                                                        src={tourCover}
                                                                        alt={tourTitle || 'Tour cover image'}
                                                                        width={48}
                                                                        height={48}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="h-full w-full bg-gradient-to-br from-muted to-muted/80" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                                                    {tourTitle ?? 'View related tour'}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground truncate">
                                                                    View tour details
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-start sm:items-end gap-2">
                                                    <Badge variant={statusVariant as any} className="text-xs">
                                                        {statusLabel}
                                                    </Badge>
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1 text-xs"
                                                    >
                                                        <Link
                                                            href={`/enquiry/${id}`}
                                                            aria-label={`View enquiry ${c.subject}`}
                                                        >
                                                            View thread
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </ContentContainer>
            </section>
        </>
    );
}
