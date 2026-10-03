'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MailX, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { unsubscribeWithToken } from '@/lib/api/subscribers';

/**
 * Confirm-then-unsubscribe, rather than unsubscribing on page load: mail scanners open links in emails, and that
 * would quietly unsubscribe people. (Mail apps' own "Unsubscribe" button posts to the API directly.)
 */
export default function UnsubscribeClient({ token }: { token: string }) {
    const unsubscribe = useMutation({ mutationFn: () => unsubscribeWithToken(token) });

    let icon = <MailX className="h-10 w-10 text-muted-foreground" aria-hidden="true" />;
    let title = 'Unsubscribe from the TourBNT newsletter?';
    let text = 'You will stop getting our newsletter emails. Booking confirmations and other emails about your trips are not affected.';

    if (!token) {
        icon = <XCircle className="h-10 w-10 text-destructive" aria-hidden="true" />;
        title = 'This unsubscribe link is incomplete';
        text = 'Open the "Unsubscribe" link at the bottom of one of our newsletters again, or contact us and we will remove you.';
    } else if (unsubscribe.isSuccess) {
        icon = <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden="true" />;
        title = 'You have been unsubscribed';
        text = 'You will not receive any more newsletters from us. If you change your mind, you can subscribe again at the bottom of any page.';
    } else if (unsubscribe.isError) {
        icon = <XCircle className="h-10 w-10 text-destructive" aria-hidden="true" />;
        title = 'We could not unsubscribe you';
        text = unsubscribe.error.message;
    }

    return (
        <div className="container mx-auto px-4 py-16 flex justify-center">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                    {icon}
                    <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                    <p className="text-sm text-muted-foreground" role={unsubscribe.isError ? 'alert' : undefined}>{text}</p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {token && !unsubscribe.isSuccess && (
                            <Button onClick={() => unsubscribe.mutate()} disabled={unsubscribe.isPending}>
                                {unsubscribe.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                                {unsubscribe.isError ? 'Try again' : 'Unsubscribe'}
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <Link href={unsubscribe.isError || !token ? '/contact' : '/'}>{unsubscribe.isError || !token ? 'Contact us' : 'Back to TourBNT'}</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
