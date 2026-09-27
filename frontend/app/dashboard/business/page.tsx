'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
    getMyBusinessPartners,
    updateMyBusinessPartner,
    updateBusinessPartnerTargeting,
    getBusinessReviews,
    addBusinessReviewReply,
    BusinessPartner,
} from '@/lib/api/businessPartners';
import { getMyAdCampaigns, createAdCampaign, updateAdTargeting, getAdStats, Advertisement, AdPlacementSlot } from '@/lib/api/ads';
import { getApprovedCategories } from '@/lib/api/globalApi';
import { getApprovedDestinations } from '@/lib/api/globalApi';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
    pending: { label: 'Pending Review', variant: 'secondary' },
    approved: { label: 'Approved', variant: 'default' },
    rejected: { label: 'Rejected', variant: 'destructive' },
};

const AD_SLOTS: { value: AdPlacementSlot; label: string }[] = [
    { value: 'tour_detail', label: 'Tour Detail Page' },
    { value: 'tour_sidebar', label: 'Tour Sidebar' },
    { value: 'hotel_page', label: 'Hotel / Guesthouse Page' },
    { value: 'search_results', label: 'Search Results' },
    { value: 'homepage', label: 'Homepage' },
];

export default function BusinessDashboardPage() {
    const queryClient = useQueryClient();
    const { data: businesses, isLoading } = useQuery({ queryKey: ['my-businesses'], queryFn: getMyBusinessPartners });
    const business = businesses?.[0];

    if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

    if (!business) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground mb-4">You don&apos;t have a business listing yet.</p>
                        <a href="/apply-partner" className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium">Apply as a Business Partner</a>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const status = STATUS_LABEL[business.approvalStatus];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">{business.name}</h1>
                    <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize">{business.type}</Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                </div>
                <div className="text-sm text-muted-foreground text-right">
                    <div>★ {business.averageRating.toFixed(1)} ({business.approvedReviewCount} reviews)</div>
                    <div>{business.views} profile views</div>
                </div>
            </div>

            {business.approvalStatus === 'rejected' && business.rejectionReason && (
                <Card className="border-destructive">
                    <CardContent className="py-4 text-sm">
                        <span className="font-medium">Rejection reason:</span> {business.rejectionReason}
                    </CardContent>
                </Card>
            )}
            {business.approvalStatus === 'pending' && (
                <Card>
                    <CardContent className="py-4 text-sm text-muted-foreground">
                        Your application is being reviewed. You&apos;ll be notified once it&apos;s approved.
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="profile">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="targeting">Visibility</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    <TabsTrigger value="ads">Ad Campaigns</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-4">
                    <ProfileTab business={business} />
                </TabsContent>
                <TabsContent value="targeting" className="mt-4">
                    <TargetingTab business={business} />
                </TabsContent>
                <TabsContent value="reviews" className="mt-4">
                    <ReviewsTab business={business} />
                </TabsContent>
                <TabsContent value="ads" className="mt-4">
                    <AdsTab business={business} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ProfileTab({ business }: { business: BusinessPartner }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        name: business.name,
        description: business.description || '',
        email: business.email || '',
        phone: business.phone || '',
        website: business.website || '',
    });

    const mutation = useMutation({
        mutationFn: (fd: FormData) => updateMyBusinessPartner(business.id, fd),
        onSuccess: () => {
            toast({ title: 'Profile updated' });
            queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
        },
        onError: (error: Error) => toast({ title: 'Update failed', description: error.message, variant: 'destructive' }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        mutation.mutate(fd);
    };

    return (
        <Card>
            <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Website</label>
                        <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                    </div>
                    <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
                </form>
            </CardContent>
        </Card>
    );
}

function TargetingTab({ business }: { business: BusinessPartner }) {
    const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
    const [destinations, setDestinations] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);

    useEffect(() => {
        getApprovedCategories().then((d: any) => setCategories(d?.data ?? d?.items ?? d ?? [])).catch(() => setCategories([]));
        getApprovedDestinations().then((d: any) => setDestinations(d?.data ?? d?.items ?? d ?? [])).catch(() => setDestinations([]));
    }, []);

    const mutation = useMutation({
        mutationFn: () => updateBusinessPartnerTargeting(business.id, selectedCategories, selectedDestinations),
        onSuccess: () => toast({ title: 'Visibility preferences saved' }),
        onError: (error: Error) => toast({ title: 'Save failed', description: error.message, variant: 'destructive' }),
    });

    const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
        setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Where you show up</CardTitle>
                <p className="text-sm text-muted-foreground">Choose which categories and destinations your listing appears under, so travelers see you on relevant pages only.</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-medium mb-2">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                            <button
                                type="button"
                                key={c.id}
                                onClick={() => toggle(selectedCategories, setSelectedCategories, c.id)}
                                className={`px-3 py-1.5 rounded-full text-sm border ${selectedCategories.includes(c.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-medium mb-2">Destinations</h3>
                    <div className="flex flex-wrap gap-2">
                        {destinations.map((d) => (
                            <button
                                type="button"
                                key={d.id}
                                onClick={() => toggle(selectedDestinations, setSelectedDestinations, d.id)}
                                className={`px-3 py-1.5 rounded-full text-sm border ${selectedDestinations.includes(d.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                            >
                                {d.name}
                            </button>
                        ))}
                    </div>
                </div>
                <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save Preferences'}</Button>
            </CardContent>
        </Card>
    );
}

function ReviewsTab({ business }: { business: BusinessPartner }) {
    const queryClient = useQueryClient();
    const { data } = useQuery({ queryKey: ['business-reviews', business.id], queryFn: () => getBusinessReviews(business.id, 'approved') });
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

    const replyMutation = useMutation({
        mutationFn: ({ reviewId, comment }: { reviewId: string; comment: string }) => addBusinessReviewReply(reviewId, comment),
        onSuccess: () => {
            toast({ title: 'Reply posted' });
            queryClient.invalidateQueries({ queryKey: ['business-reviews', business.id] });
        },
        onError: (error: Error) => toast({ title: 'Reply failed', description: error.message, variant: 'destructive' }),
    });

    const reviews = (data as any)?.data?.reviews ?? [];

    return (
        <div className="space-y-4">
            {reviews.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No reviews yet.</CardContent></Card>}
            {reviews.map((review: any) => (
                <Card key={review.id}>
                    <CardContent className="py-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">{review.user?.name || 'Anonymous'}</span>
                            <span className="text-sm">★ {review.rating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                        {review.replies?.map((reply: any) => (
                            <div key={reply.id} className="ml-4 pl-3 border-l-2 border-border text-sm">
                                <span className="font-medium">{reply.user?.name}: </span>{reply.comment}
                            </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                            <Input
                                placeholder="Write a reply..."
                                value={replyDrafts[review.id] || ''}
                                onChange={(e) => setReplyDrafts({ ...replyDrafts, [review.id]: e.target.value })}
                            />
                            <Button
                                size="sm"
                                disabled={!replyDrafts[review.id]?.trim() || replyMutation.isPending}
                                onClick={() => replyMutation.mutate({ reviewId: review.id, comment: replyDrafts[review.id] })}
                            >
                                Reply
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function AdsTab({ business }: { business: BusinessPartner }) {
    const queryClient = useQueryClient();
    const { data: ads } = useQuery({ queryKey: ['my-ads'], queryFn: getMyAdCampaigns });
    const myAds = (ads ?? []).filter((ad) => ad.businessPartnerId === business.id);

    const [form, setForm] = useState({ title: '', description: '', ctaLabel: '', ctaUrl: '', placementSlot: 'tour_detail' as AdPlacementSlot });
    const [image, setImage] = useState<File | null>(null);

    const createMutation = useMutation({
        mutationFn: (fd: FormData) => createAdCampaign(fd),
        onSuccess: () => {
            toast({ title: 'Ad campaign submitted for review' });
            queryClient.invalidateQueries({ queryKey: ['my-ads'] });
            setForm({ title: '', description: '', ctaLabel: '', ctaUrl: '', placementSlot: 'tour_detail' });
            setImage(null);
        },
        onError: (error: Error) => toast({ title: 'Failed to submit ad', description: error.message, variant: 'destructive' }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('businessPartnerId', business.id);
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        if (image) fd.append('image', image);
        createMutation.mutate(fd);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>New Ad Campaign</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
                        <Input placeholder="Ad title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        <Textarea placeholder="Short description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input placeholder="CTA label (e.g. Shop Now)" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
                            <Input placeholder="CTA URL" required type="url" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} />
                        </div>
                        <select
                            value={form.placementSlot}
                            onChange={(e) => setForm({ ...form, placementSlot: e.target.value as AdPlacementSlot })}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                        >
                            {AD_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <input type="file" accept="image/jpeg,image/png" onChange={(e) => setImage(e.target.files?.[0] || null)} className="text-sm" />
                        <p className="text-xs text-muted-foreground">Set which categories/destinations this ad targets after it&apos;s approved, from the campaign list below.</p>
                        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Submitting...' : 'Submit for Review'}</Button>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {myAds.map((ad) => <AdCampaignCard key={ad.id} ad={ad} />)}
            </div>
        </div>
    );
}

function AdCampaignCard({ ad }: { ad: Advertisement }) {
    const [categoryIds, setCategoryIds] = useState('');
    const [destinationIds, setDestinationIds] = useState('');
    const { data: stats } = useQuery({ queryKey: ['ad-stats', ad.id], queryFn: () => getAdStats(ad.id), enabled: ad.approvalStatus === 'approved' });

    const targetingMutation = useMutation({
        mutationFn: () => updateAdTargeting(
            ad.id,
            categoryIds.split(',').map((s) => s.trim()).filter(Boolean),
            destinationIds.split(',').map((s) => s.trim()).filter(Boolean)
        ),
        onSuccess: () => toast({ title: 'Ad targeting updated' }),
        onError: (error: Error) => toast({ title: 'Update failed', description: error.message, variant: 'destructive' }),
    });

    const statusVariant = ad.approvalStatus === 'approved' ? 'default' : ad.approvalStatus === 'rejected' ? 'destructive' : 'secondary';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{ad.title}</CardTitle>
                <div className="flex gap-2">
                    <Badge variant="secondary" className="capitalize">{ad.placementSlot.replace('_', ' ')}</Badge>
                    <Badge variant={statusVariant}>{ad.approvalStatus}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                {ad.rejectionReason && <p className="text-destructive">Rejected: {ad.rejectionReason}</p>}
                {stats && <p className="text-muted-foreground">{stats.totalImpressions} impressions · {stats.totalClicks} clicks</p>}
                <p className="text-xs text-muted-foreground">Enter the category and/or destination IDs this ad should target (comma-separated) — pages must match every dimension you set. Without any targeting set, it only shows on general placements like the homepage.</p>
                <div className="flex gap-2">
                    <Input placeholder="Category IDs (comma-separated)" value={categoryIds} onChange={(e) => setCategoryIds(e.target.value)} />
                    <Input placeholder="Destination IDs (comma-separated)" value={destinationIds} onChange={(e) => setDestinationIds(e.target.value)} />
                    <Button size="sm" onClick={() => targetingMutation.mutate()} disabled={targetingMutation.isPending}>Save</Button>
                </div>
            </CardContent>
        </Card>
    );
}
