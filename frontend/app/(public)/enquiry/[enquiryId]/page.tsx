'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import {
    getConversation,
    getConversationMessages,
    sendConversationMessage,
    type Conversation,
    type ConversationMessage,
} from '@/lib/api/conversations';
import { ContentContainer } from '@/components/layout/PublicLayoutClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function SingleEnquiryPage() {
    const params = useParams();
    const enquiryId = typeof params.enquiryId === 'string' ? params.enquiryId : '';
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reply, setReply] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!enquiryId) return;
        let cancelled = false;
        getConversation(enquiryId)
            .then((c) => {
                if (cancelled) return;
                setConversation(c);
                return getConversationMessages(enquiryId);
            })
            .then((msgs) => {
                if (!cancelled) setMessages(msgs ?? []);
            })
            .catch(() => {
                if (!cancelled) setError('Enquiry not found or you don’t have access.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [enquiryId]);

    const handleSendReply = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!enquiryId || !reply.trim() || !conversation) return;

        try {
            setIsSending(true);
            const updatedMessages = await sendConversationMessage(enquiryId, reply.trim());
            if (Array.isArray(updatedMessages) && updatedMessages.length > 0) {
                setMessages(updatedMessages);
            } else {
                // Fallback: append optimistic reply if API returns empty
                setMessages((prev) => [
                    ...prev,
                    {
                        id: String(Date.now()),
                        conversationId: enquiryId,
                        role: 'customer',
                        content: reply.trim(),
                        createdAt: new Date().toISOString(),
                    },
                ]);
            }
            setReply('');
            toast({
                title: 'Reply sent',
                description: 'Your message has been added to this enquiry.',
            });
        } catch (err) {
            toast({
                title: 'Failed to send reply',
                description:
                    err instanceof Error ? err.message : 'Something went wrong while sending your reply.',
                variant: 'destructive',
            });
        } finally {
            setIsSending(false);
        }
    };

    const statusBadge = useMemo(() => {
        if (!conversation) return null;
        const label =
            conversation.status === 'open'
                ? 'Open'
                : conversation.status === 'replied'
                ? 'Replied'
                : 'Closed';
        const variant =
            conversation.status === 'open'
                ? 'secondary'
                : conversation.status === 'replied'
                ? 'default'
                : 'outline';
        return (
            <Badge variant={variant} className="text-xs">
                {label}
            </Badge>
        );
    }, [conversation]);

    if (loading) {
        return (
            <>
                <div
                    className="relative h-[120px] sm:h-[150px] md:h-[180px] bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage:
                            "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop')",
                    }}
                    role="banner"
                    aria-label="Enquiry details banner"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
                    <div className="relative h-full flex items-center justify-center px-4">
                        <h1 className="text-xl sm:text-xl font-semibold text-white text-center">
                            Enquiry details
                        </h1>
                    </div>
                </div>
                <section className="w-full py-8 pt-0">
                    <ContentContainer className="px-4 md:px-6 lg:px-8">
                        <div className="flex items-center justify-center py-12">
                            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                <span>Loading enquiry…</span>
                            </div>
                        </div>
                    </ContentContainer>
                </section>
            </>
        );
    }

    if (error || !conversation) {
        return (
            <>
                <div
                    className="relative h-[120px] sm:h-[150px] md:h-[180px] bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage:
                            "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop')",
                    }}
                    role="banner"
                    aria-label="Enquiry not found"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
                    <div className="relative h-full flex items-center justify-center px-4">
                        <h1 className="text-xl sm:text-xl font-semibold text-white text-center">
                            Enquiry not found
                        </h1>
                    </div>
                </div>
                <section className="w-full py-8 pt-0">
                    <ContentContainer className="px-4 md:px-6 lg:px-8">
                        <Card className="max-w-2xl mx-auto">
                            <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
                                <p className="text-sm sm:text-base text-muted-foreground">
                                    {error ?? 'This enquiry could not be found or you do not have access.'}
                                </p>
                                <Button asChild variant="outline" size="sm" className="gap-2 mt-2">
                                    <Link href="/enquiry">
                                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                        Back to enquiries
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </ContentContainer>
                </section>
            </>
        );
    }

    const createdAtLabel = new Date(conversation.createdAt).toLocaleString();
    const tour = conversation.tourId;
    const tourCode = tour?.code;
    const tourSlug = tour?.slug ?? tour?.id;
    const isTourEnquiry = conversation.type === 'enquiry' && !!tour;

    return (
        <>
            {/* Hero banner */}
            <div
                className="relative h-[150px] sm:h-[180px] md:h-[200px] bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop')",
                }}
                role="banner"
                aria-label="Enquiry details banner"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
                <div className="relative h-full flex items-center justify-center px-4">
                    <h1 className="text-xl sm:text-xl font-semibold text-white text-center">
                        Enquiry details
                    </h1>
                </div>
            </div>

            <section className="w-full py-8 pt-0">
                {/* Breadcrumb strip – aligned with ToursBreadcrumb */}
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
                            <Link
                                href="/enquiry"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Enquiries
                            </Link>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <span className="text-foreground font-medium line-clamp-1">
                                {conversation.subject}
                            </span>
                        </nav>
                    </ContentContainer>
                </div>

                <ContentContainer className="px-4 md:px-6 lg:px-8 space-y-6 pb-10">
                    {/* Meta + thread */}
                    <Card className="max-w-4xl mx-auto border border-border/80 shadow-sm pt-0">
                        <CardHeader className="space-y-3 pb-3 bg-muted/60 pt-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                                        <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <span className="line-clamp-2">{conversation.subject}</span>
                                    </CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground">
                                        {createdAtLabel}
                                        {isTourEnquiry && tourCode && ` · Code: ${tourCode}`}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2">
                                    {statusBadge}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 text-xs"
                                        >
                                            <Link href="/enquiry">
                                                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                                                Back to enquiries
                                            </Link>
                                        </Button>
                                        {tourSlug && (
                                            <Button
                                                asChild
                                                size="sm"
                                                className="gap-2 text-xs"
                                            >
                                                <Link href={`/tours/${tourSlug}`}>
                                                    View tour
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-5">
                            {messages.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No messages yet. When our team responds, the conversation will appear
                                    here.
                                </p>
                            ) : (
                                <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
                                    {messages.map((m) => {
                                        const id =
                                            (m as { id?: string }).id ??
                                            (m as { _id?: string })._id ??
                                            '';
                                        const isSupport = m.role === 'support';
                                        const label = isSupport ? 'Support' : 'You';

                                        const alignmentClass = isSupport ? 'justify-start' : 'justify-end';
                                        const bubbleColorClass = isSupport
                                            ? 'bg-muted text-foreground'
                                            : 'bg-primary text-primary-foreground';

                                        return (
                                            <div key={id} className={`flex ${alignmentClass}`}>
                                                <div
                                                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${bubbleColorClass}`}
                                                >
                                                    <div
                                                        className={`mb-1 flex gap-1 text-[11px] ${
                                                            isSupport
                                                                ? 'justify-start text-left'
                                                                : 'justify-end text-right'
                                                        }`}
                                                    >
                                                        <span
                                                            className={
                                                                'font-medium ' +
                                                                (isSupport
                                                                    ? 'text-muted-foreground'
                                                                    : 'text-primary-foreground')
                                                            }
                                                        >
                                                            {label}
                                                        </span>
                                                        <span
                                                            className={
                                                                isSupport
                                                                    ? 'text-muted-foreground/90'
                                                                    : 'text-primary-foreground/80'
                                                            }
                                                        >
                                                            {new Date(m.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap leading-relaxed">
                                                        {m.content}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>

                        {/* Reply section */}
                        <CardFooter className="border-t bg-muted/20 px-4 py-4 sm:px-6 sm:py-5">
                            <form
                                onSubmit={handleSendReply}
                                className="flex flex-col gap-3 w-full"
                                aria-label="Reply to this enquiry"
                            >
                                <label
                                    htmlFor="reply"
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    Add a reply
                                </label>
                                <Textarea
                                    id="reply"
                                    placeholder="Write your reply here…"
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    rows={4}
                                    className="text-sm"
                                />
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground max-w-md">
                                        Replies are sent to our support team and attached to this enquiry.
                                        You&apos;ll see their responses in this thread.
                                    </p>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={isSending || !reply.trim()}
                                        className="min-w-[120px]"
                                        aria-label="Send reply"
                                    >
                                        {isSending ? (
                                            <>
                                                <Loader2
                                                    className="h-4 w-4 mr-2 animate-spin"
                                                    aria-hidden="true"
                                                />
                                                Sending…
                                            </>
                                        ) : (
                                            <>
                                                <MessageCircle
                                                    className="h-4 w-4 mr-2"
                                                    aria-hidden="true"
                                                />
                                                Send reply
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardFooter>
                    </Card>
                </ContentContainer>
            </section>
        </>
    );
}
