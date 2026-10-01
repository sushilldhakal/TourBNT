'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, Mail, MapPin, MessageSquare, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { getTourBusiness } from '@/lib/api/tours';
import { createConversation } from '@/lib/api/conversations';

/**
 * "Who runs this tour" card, under the reviews: the business (never the individual), its overall
 * rating across everything it runs, and ways to reach it. A message becomes the same enquiry
 * conversation the booking widget creates, so it lands in the agency's dashboard messages.
 */
export function TourBusinessCard({ tourId, tourTitle }: { tourId: string; tourTitle?: string }) {
    const { isAuthenticated, isHydrated } = useAuth();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const { data: business } = useQuery({
        queryKey: ['tour-business', tourId],
        queryFn: () => getTourBusiness(tourId),
        staleTime: 5 * 60_000,
    });
    if (!business) return null;

    const send = async () => {
        if (!message.trim()) {
            toast({ variant: 'destructive', title: 'Message required', description: 'Please write your message first.' });
            return;
        }
        setSending(true);
        try {
            await createConversation({
                type: 'enquiry',
                subject: tourTitle ? `Enquiry: ${tourTitle}` : 'Tour enquiry',
                message: message.trim(),
                tourId,
            });
            toast({ title: 'Message sent', description: `${business.name} will reply here — check My Enquiries.` });
            setMessage('');
            setOpen(false);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Could not send message', description: (err as { message?: string })?.message ?? 'Please try again.' });
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="rounded-2xl border bg-card p-5 sm:p-6" aria-label="About the tour operator">
            <h2 className="mb-4 text-lg font-semibold sm:text-xl">About the operator</h2>

            <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold sm:text-lg">
                        <Link href={`/agencies/${business.id}`} className="hover:text-primary hover:underline">{business.name}</Link>
                    </h3>
                    {business.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{business.location}</p>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm">
                        {business.rating != null ? (
                            <>
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                                <span className="font-semibold">{business.rating.toFixed(1)}</span>
                                <span className="text-muted-foreground">
                                    from {business.reviewCount} review{business.reviewCount === 1 ? '' : 's'} across {business.tourCount} tour{business.tourCount === 1 ? '' : 's'}
                                </span>
                            </>
                        ) : (
                            <span className="text-muted-foreground">No reviews yet · {business.tourCount} tour{business.tourCount === 1 ? '' : 's'}</span>
                        )}
                    </p>
                </div>
            </div>

            {business.description && <p className="mt-4 text-sm text-muted-foreground">{business.description}</p>}
            <Link href={`/agencies/${business.id}`} className="mt-2 inline-block text-sm text-primary hover:underline">View all tours by {business.name} →</Link>

            <div className="mt-5 flex flex-wrap gap-2">
                {business.phone && (
                    <Button asChild variant="outline" size="sm">
                        <a href={`tel:${business.phone.replace(/\s+/g, '')}`}><Phone className="mr-2 h-4 w-4" />{business.phone}</a>
                    </Button>
                )}
                <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${business.email}`}><Mail className="mr-2 h-4 w-4" />{business.email}</a>
                </Button>
                <Button size="sm" onClick={() => setOpen(true)}><MessageSquare className="mr-2 h-4 w-4" />Message</Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Message {business.name}</DialogTitle>
                        <DialogDescription>Your message goes to their inbox and they reply to you here on TourBNT.</DialogDescription>
                    </DialogHeader>
                    {!isHydrated ? (
                        <div className="py-6 text-center text-muted-foreground">Loading…</div>
                    ) : !isAuthenticated ? (
                        <div className="space-y-4 rounded-lg border bg-muted/30 p-5 text-center">
                            <p className="text-sm text-muted-foreground">Create a free account or sign in to message {business.name}, so they can reply to you.</p>
                            <div className="flex flex-wrap justify-center gap-3">
                                <Button asChild><Link href="/auth/signup">Create account</Link></Button>
                                <Button asChild variant="outline"><Link href="/auth/login">Sign in</Link></Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask about dates, pricing, group size…" />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
                                <Button onClick={send} disabled={sending}>
                                    {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : 'Send message'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}
