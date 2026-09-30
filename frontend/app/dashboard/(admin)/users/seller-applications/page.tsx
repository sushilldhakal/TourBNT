'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ClipboardCheck, Search, Mail, Phone, Globe, MapPin, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { PaginationControls } from '@/components/dashboard/shared/PaginationControls';
import { EmptyState } from '@/components/dashboard/shared/EmptyState';
import { ErrorState } from '@/components/dashboard/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
    getBusinessApplicationCounts,
    getBusinessApplicationsPage,
    getSellerApplicationsPage,
    type ApplicationStatus,
    type SellerApplication,
} from '@/lib/api/adminLists';
import { approveBusinessPartner, rejectBusinessPartner, type BusinessPartner, type BusinessPartnerType } from '@/lib/api/businessPartners';
import { approveSellerApplication, rejectSellerApplication } from '@/lib/api/users';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

type Kind = 'seller' | BusinessPartnerType;

const TABS: Array<{ key: Kind; label: string }> = [
    { key: 'seller', label: 'Tour Sellers' },
    { key: 'hotel', label: 'Hotels' },
    { key: 'guesthouse', label: 'Guesthouses' },
    { key: 'restaurant', label: 'Restaurants' },
    { key: 'guide', label: 'Guides' },
    { key: 'transport', label: 'Transport' },
    { key: 'advertiser', label: 'Advertisers' },
];

const STATUSES: Array<{ key: ApplicationStatus; label: string; icon: typeof Clock }> = [
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'approved', label: 'Approved', icon: CheckCircle2 },
    { key: 'rejected', label: 'Rejected', icon: XCircle },
];

// Unified card model so sellers and business partners share one renderer.
interface ApplicationCard {
    id: string;
    kind: Kind;
    title: string;
    subtitle: string;
    status: ApplicationStatus;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    location?: string | null;
    description?: string | null;
    submittedAt?: string;
    rejectionReason?: string | null;
    facts: Array<[string, string]>;
    documents: Array<{ label: string; url: string }>;
}

const fromSeller = (a: SellerApplication): ApplicationCard => {
    const s = a.sellerInfo ?? {};
    const addr = s.businessAddress;
    return {
        id: a.id,
        kind: 'seller',
        title: s.companyName || a.name,
        subtitle: `${a.name}${s.sellerType ? ` · ${s.sellerType.replace(/_/g, ' ')}` : ''}`,
        status: a.sellerApplicationStatus,
        email: a.email,
        phone: a.phone ?? null,
        website: s.website ?? null,
        location: addr ? [addr.address, addr.city, addr.country].filter(Boolean).join(', ') : null,
        description: s.businessDescription ?? null,
        submittedAt: s.appliedAt ?? a.createdAt,
        rejectionReason: a.rejectionReason ?? null,
        facts: [
            ['Reg. no.', s.companyRegistrationNumber ?? '—'],
            ['Company type', s.companyType ?? '—'],
            ['Tax ID', s.taxId ?? '—'],
        ],
        documents: (s.documents ?? []).filter((d) => d.url).map((d) => ({ label: (d.type ?? 'document').replace(/_/g, ' '), url: d.url! })),
    };
};

const fromPartner = (p: BusinessPartner): ApplicationCard => {
    const details = (p.details ?? {}) as Record<string, unknown>;
    const facts: Array<[string, string]> = Object.entries(details)
        .filter(([, v]) => ['string', 'number'].includes(typeof v) || Array.isArray(v))
        .slice(0, 4)
        .map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), Array.isArray(v) ? v.join(', ') : String(v)]);
    return {
        id: p.id,
        kind: p.type,
        title: p.name,
        subtitle: p.type,
        status: p.approvalStatus,
        email: p.email,
        phone: p.phone,
        website: p.website,
        location: p.address ? [p.address.address, p.address.city, p.address.country].filter(Boolean).join(', ') : null,
        description: p.description,
        submittedAt: (p as any).submittedAt ?? p.createdAt,
        rejectionReason: p.rejectionReason,
        facts,
        documents: (p.documents ?? []).map((d) => ({ label: d.docType.replace(/_/g, ' '), url: d.url })),
    };
};

const STATUS_STYLE: Record<ApplicationStatus, string> = {
    pending: 'bg-amber-500/15 border-amber-500/30 !text-amber-700 dark:!text-amber-300',
    approved: 'bg-emerald-500/15 border-emerald-500/30 !text-emerald-700 dark:!text-emerald-300',
    rejected: 'bg-red-500/15 border-red-500/30 !text-red-700 dark:!text-red-300',
};

export default function ApplicationsPage() {
    const queryClient = useQueryClient();
    const [kind, setKind] = useState<Kind>('seller');
    const [status, setStatus] = useState<ApplicationStatus>('pending');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [rejectTarget, setRejectTarget] = useState<ApplicationCard | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const q = useDebouncedValue(search.trim());

    const partnerCounts = useQuery({ queryKey: ['applications', 'counts', 'partners'], queryFn: getBusinessApplicationCounts, staleTime: 15_000 });

    const list = useQuery({
        queryKey: ['applications', 'page', { kind, status, q, page, limit }],
        queryFn: async () => {
            if (kind === 'seller') {
                const r = await getSellerApplicationsPage({ status, q, page, limit });
                return { ...r, cards: r.items.map(fromSeller) };
            }
            const r = await getBusinessApplicationsPage({ type: kind, status, q, page, limit });
            return { ...r, cards: r.items.map(fromPartner) };
        },
        placeholderData: keepPreviousData,
    });

    // Seller counts come back with the seller list itself; keep the last ones so the badges don't flicker on other tabs.
    const sellerCounts = useQuery({
        queryKey: ['applications', 'counts', 'sellers'],
        queryFn: () => getSellerApplicationsPage({ status: 'pending', page: 1, limit: 1 }).then((r) => r.counts),
        staleTime: 15_000,
    });

    const countsFor = (k: Kind): Record<ApplicationStatus, number> | undefined =>
        k === 'seller' ? (sellerCounts.data as Record<ApplicationStatus, number> | undefined) : partnerCounts.data?.[k];

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['applications'] });

    const approve = useMutation({
        mutationFn: (card: ApplicationCard) => (card.kind === 'seller' ? approveSellerApplication(card.id) : approveBusinessPartner(card.id)),
        onSuccess: () => { toast({ title: 'Application approved' }); refresh(); queryClient.invalidateQueries({ queryKey: ['users'] }); },
        onError: (e: Error) => toast({ title: 'Failed to approve', description: e.message, variant: 'destructive' }),
    });

    const reject = useMutation({
        mutationFn: ({ card, reason }: { card: ApplicationCard; reason: string }) =>
            card.kind === 'seller' ? rejectSellerApplication(card.id, reason) : rejectBusinessPartner(card.id, reason),
        onSuccess: () => { toast({ title: 'Application rejected' }); setRejectTarget(null); setRejectReason(''); refresh(); },
        onError: (e: Error) => toast({ title: 'Failed to reject', description: e.message, variant: 'destructive' }),
    });

    const cards = list.data?.cards ?? [];
    const pagination = list.data?.pagination;

    return (
        <AdminGuard>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <DashboardCardHeader
                    variant="compact"
                    icon={ClipboardCheck}
                    badge="Users"
                    title="Applications"
                    description="Review onboarding requests from tour sellers, hotels, restaurants, guides, transport companies and advertisers"
                />

                <Tabs value={kind} onValueChange={(v) => { setKind(v as Kind); setPage(1); }}>
                    <TabsList className="h-auto flex-wrap justify-start gap-1">
                        {TABS.map((t) => {
                            const pending = countsFor(t.key)?.pending;
                            return (
                                <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                                    {t.label}
                                    {pending ? <span className="rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white tabular-nums">{pending}</span> : null}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </Tabs>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {STATUSES.map(({ key, label, icon: Icon }) => {
                            const n = countsFor(kind)?.[key];
                            return (
                                <Button key={key} size="sm" variant={status === key ? 'default' : 'outline'} onClick={() => { setStatus(key); setPage(1); }} className="gap-1.5">
                                    <Icon className="h-4 w-4" />
                                    {label}
                                    {n !== undefined && <span className="tabular-nums opacity-80">({n})</span>}
                                </Button>
                            );
                        })}
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search by name…" className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                </div>

                {list.isError ? (
                    <ErrorState title="Error loading applications" description={list.error instanceof Error ? list.error.message : 'Please try again.'} onRetry={() => list.refetch()} />
                ) : list.isLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>
                ) : cards.length === 0 ? (
                    <Card>
                        <CardContent className="py-6">
                            <EmptyState icon={<ClipboardCheck className="h-16 w-16" />} title={`No ${status} applications`} description={q ? 'Try a different search term.' : 'Nothing to review here right now.'} />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {cards.map((c) => (
                            <Card key={c.id}>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
                                    <div className="min-w-0">
                                        <CardTitle className="text-lg truncate">{c.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground capitalize truncate">{c.subtitle}</p>
                                    </div>
                                    <Badge variant="outline" className={`capitalize shrink-0 ${STATUS_STYLE[c.status]}`}>{c.status}</Badge>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        {c.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{c.email}</div>}
                                        {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{c.phone}</div>}
                                        {c.website && <div className="flex items-center gap-1.5 truncate"><Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{c.website}</div>}
                                        {c.location && <div className="flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{c.location}</div>}
                                    </div>
                                    {c.facts.length > 0 && (
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                            {c.facts.map(([k, v]) => (
                                                <div key={k} className="flex gap-1.5 min-w-0"><dt className="text-muted-foreground shrink-0">{k}:</dt><dd className="truncate">{v}</dd></div>
                                            ))}
                                        </dl>
                                    )}
                                    {c.documents.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                            {c.documents.map((d, i) => (
                                                <a key={i} href={d.url} target="_blank" rel="noreferrer" className="text-xs underline text-primary capitalize">{d.label}</a>
                                            ))}
                                        </div>
                                    )}
                                    {c.status === 'rejected' && c.rejectionReason && (
                                        <p className="text-sm rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-700 dark:text-red-300">Rejected: {c.rejectionReason}</p>
                                    )}
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-xs text-muted-foreground">{c.submittedAt ? `Applied ${format(new Date(c.submittedAt), 'MMM dd, yyyy')}` : ''}</span>
                                        <div className="flex gap-2">
                                            {c.status !== 'approved' && (
                                                <Button size="sm" onClick={() => approve.mutate(c)} disabled={approve.isPending}>Approve</Button>
                                            )}
                                            {c.status !== 'rejected' && (
                                                <Button size="sm" variant="destructive" onClick={() => setRejectTarget(c)}>Reject</Button>
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
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        limit={pagination.limit}
                        limitOptions={[6, 10, 20]}
                        onPageChange={setPage}
                        onLimitChange={(l) => { setLimit(l); setPage(1); }}
                        isFetching={list.isFetching && !list.isLoading}
                    />
                )}

                <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject {rejectTarget?.title}</DialogTitle>
                            <DialogDescription>The applicant is notified with this reason.</DialogDescription>
                        </DialogHeader>
                        <Textarea placeholder="Reason for rejection…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                disabled={!rejectReason.trim() || reject.isPending}
                                onClick={() => rejectTarget && reject.mutate({ card: rejectTarget, reason: rejectReason.trim() })}
                            >
                                Reject application
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminGuard>
    );
}
