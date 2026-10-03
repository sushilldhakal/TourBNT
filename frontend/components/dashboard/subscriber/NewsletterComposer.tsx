'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Send, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { listNewsletters, sendNewsletter, sendTestNewsletter } from '@/lib/api/newsletters';
import { NEWSLETTERS_KEY } from './NewsletterHistory';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export function NewsletterComposer() {
    const qc = useQueryClient();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [testEmail, setTestEmail] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const { data } = useQuery({ queryKey: NEWSLETTERS_KEY, queryFn: listNewsletters });
    const active = data?.activeSubscribers ?? 0;

    // Same limits the server enforces, so the buttons only light up for something it will accept.
    const ready = subject.trim().length >= 3 && subject.trim().length <= 150 && body.trim().length >= 10;

    const test = useMutation({
        mutationFn: () => sendTestNewsletter({ subject: subject.trim(), body: body.trim(), testEmail: testEmail.trim() }),
        onSuccess: () => toast.success(`Test sent to ${testEmail.trim()}`),
        onError: (e: Error) => toast.error(e.message),
    });

    const send = useMutation({
        mutationFn: () => sendNewsletter({ subject: subject.trim(), body: body.trim() }),
        onSuccess: (n) => {
            toast.success(`Sending to ${n.recipientCount} subscriber(s). Progress shows in the history below.`);
            setSubject('');
            setBody('');
            setConfirmOpen(false);
            qc.invalidateQueries({ queryKey: NEWSLETTERS_KEY });
        },
        onError: (e: Error) => {
            setConfirmOpen(false);
            toast.error(e.message);
        },
    });

    const busy = test.isPending || send.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" aria-hidden="true" />
                    Send a newsletter
                </CardTitle>
                <CardDescription>
                    {data ? `${active} active subscriber${active === 1 ? '' : 's'} will receive it.` : 'Loading subscriber count…'}{' '}
                    Each email ends with that subscriber&apos;s own unsubscribe link.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="nl-subject">Subject</Label>
                    <Input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} disabled={busy} placeholder="New autumn treks are open" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="nl-body">Message</Label>
                    <Textarea id="nl-body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} disabled={busy} placeholder="Plain text. Leave a blank line to start a new paragraph." />
                    <p className="text-sm text-muted-foreground">Plain text. A blank line starts a new paragraph.</p>
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="nl-test">Send a test copy first</Label>
                        <Input id="nl-test" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} disabled={busy} placeholder="you@yourcompany.com" />
                    </div>
                    <Button variant="outline" onClick={() => test.mutate()} disabled={!ready || !isValidEmail(testEmail) || busy}>
                        {test.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> : <FlaskConical className="h-4 w-4 mr-2" aria-hidden="true" />}
                        Send test
                    </Button>
                    <Button onClick={() => setConfirmOpen(true)} disabled={!ready || active === 0 || busy}>
                        <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                        Send to {active} subscriber{active === 1 ? '' : 's'}
                    </Button>
                </div>
            </CardContent>

            <AlertDialog open={confirmOpen} onOpenChange={(o) => !send.isPending && setConfirmOpen(o)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send to {active} subscriber{active === 1 ? '' : 's'}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{subject.trim()}&rdquo; goes out to everyone who hasn&apos;t unsubscribed. This can&apos;t be stopped once it starts.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={send.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); send.mutate(); }}
                            disabled={send.isPending}
                        >
                            {send.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                            Send now
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
