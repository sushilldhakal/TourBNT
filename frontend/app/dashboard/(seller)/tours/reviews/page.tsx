'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Star, Search, MessageSquareReply, ThumbsUp, Check, X } from 'lucide-react';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { PaginationControls } from '@/components/dashboard/shared/PaginationControls';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { getManagedReviewsPage, type ManagedReview } from '@/lib/api/adminLists';
import { addReviewReply, updateReviewStatus } from '@/lib/api/reviews';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

type Tab = 'all' | 'pending' | 'approved' | 'rejected';
const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
];

const STATUS_STYLE: Record<ManagedReview['status'], string> = {
    pending: 'bg-amber-500/15 border-amber-500/30 !text-amber-700 dark:!text-amber-300',
    approved: 'bg-emerald-500/15 border-emerald-500/30 !text-emerald-700 dark:!text-emerald-300',
    rejected: 'bg-red-500/15 border-red-500/30 !text-red-700 dark:!text-red-300',
};

function Stars({ rating }: { rating: number }) {
    return (
        <span className="inline-flex" aria-label={`${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`h-4 w-4 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`} />
            ))}
        </span>
    );
}

export default function TourReviewsPage() {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<Tab>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [replyFor, setReplyFor] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const q = useDebouncedValue(search.trim());

    const list = useQuery({
        queryKey: ['reviews', 'manage', { tab, q, page, limit }],
        queryFn: () => getManagedReviewsPage({ status: tab, q, page, limit }),
        placeholderData: keepPreviousData,
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['reviews'] });
    const statusMutation = useMutation({
        mutationFn: ({ r, status }: { r: ManagedReview; status: 'approved' | 'rejected' }) => updateReviewStatus(r.tourId, r.id, status),
        onSuccess: () => { toast({ title: 'Review updated' }); refresh(); },
        onError: (e: Error) => toast({ title: 'Could not update review', description: e.message, variant: 'destructive' }),
    });
    const replyMutation = useMutation({
        mutationFn: ({ r, comment }: { r: ManagedReview; comment: string }) => addReviewReply(r.tourId, r.id, comment),
        onSuccess: () => { toast({ title: 'Reply posted' }); setReplyFor(null); setReplyText(''); refresh(); },
        onError: (e: Error) => toast({ title: 'Could not post reply', description: e.message, variant: 'destructive' }),
    });

    const counts = list.data?.counts;
    const countFor = (k: Tab) => (!counts ? undefined : k === 'all' ? counts.pending + counts.approved + counts.rejected : counts[k]);
    const items = list.data?.items ?? [];
    const pagination = list.data?.pagination;

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={Star}
                badge="Tours"
                title="Tour Reviews"
                description="Moderate traveller reviews and reply to them"
            />

            <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setPage(1); }}>
                <TabsList className="h-auto flex-wrap justify-start gap-1">
                    {TABS.map((t) => (
                        <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                            {t.label}
                            {countFor(t.key) !== undefined && <span className="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">{countFor(t.key)}</span>}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search review, traveller or tour…" className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>

            {list.isError ? (
                <p className="text-sm text-destructive">{list.error instanceof Error ? list.error.message : 'Failed to load reviews.'}</p>
            ) : list.isLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
            ) : items.length === 0 ? (
                <Card><CardContent className="py-6"><EmptyState icon={<Star className="h-14 w-14" />} title="No reviews found" description="Try a different tab or search." /></CardContent></Card>
            ) : (
                <div className="space-y-4">
                    {items.map((r) => (
                        <Card key={r.id}>
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="h-10 w-10 border">
                                            <AvatarImage src={r.user?.avatar ?? undefined} alt={r.user?.name} />
                                            <AvatarFallback>{(r.user?.name ?? 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="font-medium truncate">{r.user?.name ?? 'Former user'}</div>
                                            <div className="text-xs text-muted-foreground truncate">{r.tourTitle}{r.tourCode ? ` · ${r.tourCode}` : ''} · {format(new Date(r.createdAt), 'MMM dd, yyyy')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Stars rating={r.rating} />
                                        <Badge variant="outline" className={`capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</Badge>
                                    </div>
                                </div>

                                <p className="text-sm">{r.comment}</p>

                                {r.replies.length > 0 && (
                                    <div className="space-y-2 border-l-2 pl-3">
                                        {r.replies.map((rep) => (
                                            <div key={rep.id} className="text-sm">
                                                <span className="font-medium">{rep.user?.name ?? 'Team'}</span>
                                                <span className="text-xs text-muted-foreground"> · {format(new Date(rep.createdAt), 'MMM dd, yyyy')}</span>
                                                <p className="text-muted-foreground">{rep.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {replyFor === r.id && (
                                    <div className="space-y-2">
                                        <Textarea rows={3} placeholder="Write a reply…" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="outline" onClick={() => { setReplyFor(null); setReplyText(''); }}>Cancel</Button>
                                            <Button size="sm" disabled={!replyText.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate({ r, comment: replyText.trim() })}>Post reply</Button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-1">
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ThumbsUp className="h-3.5 w-3.5" />{r.likes}</span>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setReplyFor(replyFor === r.id ? null : r.id); setReplyText(''); }}>
                                            <MessageSquareReply className="h-4 w-4" />Reply
                                        </Button>
                                        {r.status !== 'approved' && (
                                            <Button size="sm" className="gap-1.5" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ r, status: 'approved' })}><Check className="h-4 w-4" />Approve</Button>
                                        )}
                                        {r.status !== 'rejected' && (
                                            <Button size="sm" variant="destructive" className="gap-1.5" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ r, status: 'rejected' })}><X className="h-4 w-4" />Reject</Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {pagination && (
                <PaginationControls
                    page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} limit={pagination.limit}
                    limitOptions={[5, 10, 20]} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} isFetching={list.isFetching && !list.isLoading}
                />
            )}
        </div>
    );
}
