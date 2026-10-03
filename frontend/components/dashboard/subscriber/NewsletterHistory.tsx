'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { LoadingState } from '@/components/dashboard/shared/LoadingState';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { ErrorState } from '@/components/dashboard/shared/ErrorState';
import { listNewsletters, type Newsletter } from '@/lib/api/newsletters';

export const NEWSLETTERS_KEY = ['newsletters'];

const STATUS: Record<Newsletter['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    sending: { label: 'Sending', variant: 'outline' },
    sent: { label: 'Sent', variant: 'default' },
    failed: { label: 'Failed', variant: 'destructive' },
};

export function NewsletterHistory() {
    const [openId, setOpenId] = useState<string | null>(null);
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: NEWSLETTERS_KEY,
        queryFn: listNewsletters,
        // While a send is in progress the server updates its counts every 20 emails; keep the table current.
        refetchInterval: (q) => (q.state.data?.items.some((n) => n.status === 'sending') ? 5000 : false),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" aria-hidden="true" />
                    Sent newsletters
                </CardTitle>
                <CardDescription>The last 50 sends. Test copies are not recorded.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingState type="table" rows={3} columns={5} />
                ) : isError ? (
                    <ErrorState title="Could not load newsletters" description={(error as Error).message} onRetry={() => refetch()} />
                ) : !data?.items.length ? (
                    <EmptyState icon={<History className="h-10 w-10" aria-hidden="true" />} title="Nothing sent yet" description="Newsletters you send will be listed here with their delivery counts." />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8" />
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Delivered</TableHead>
                                    <TableHead className="text-right">Failed</TableHead>
                                    <TableHead>Sent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((n) => {
                                    const open = openId === n.id;
                                    const s = STATUS[n.status] ?? STATUS.sending;
                                    return (
                                        <Fragment key={n.id}>
                                            <TableRow>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpenId(open ? null : n.id)} aria-label={open ? 'Hide message' : 'Show message'} aria-expanded={open}>
                                                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-medium max-w-xs truncate">{n.subject}</TableCell>
                                                <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                                                <TableCell className="text-right tabular-nums">{n.sentCount} / {n.recipientCount}</TableCell>
                                                <TableCell className="text-right tabular-nums">{n.failedCount}</TableCell>
                                                <TableCell className="text-sm whitespace-nowrap">{format(new Date(n.sentAt ?? n.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                                            </TableRow>
                                            {open && (
                                                <TableRow>
                                                    <TableCell />
                                                    <TableCell colSpan={5} className="whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
