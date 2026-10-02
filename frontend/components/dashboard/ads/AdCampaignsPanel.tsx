'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { useApprovedCategories, useApprovedDestinations } from '@/lib/queries';
import {
    createAdCampaign,
    formatPrice,
    getAdPricing,
    getMyAdCampaigns,
    quoteAd,
    updateAdCampaign,
    updateAdTargeting,
    type AdBillingModel,
    type Advertisement,
} from '@/lib/api/ads';
import { AdStatsPanel, AdStatusBadges, describePlan } from './AdStatsPanel';

type Option = { id: string; name: string };

function toOptions(data: unknown): Option[] {
    const list = Array.isArray(data) ? data : ((data as { data?: unknown[]; items?: unknown[] })?.data ?? (data as { items?: unknown[] })?.items ?? []);
    return (list as Array<{ id?: string; _id?: string; name?: string }>)
        .map((d) => ({ id: d.id ?? d._id ?? '', name: d.name ?? '' }))
        .filter((d) => d.id && d.name);
}

function usePickerOptions() {
    const { data: cats } = useApprovedCategories();
    const { data: dests } = useApprovedDestinations();
    return { categories: useMemo(() => toOptions(cats), [cats]), destinations: useMemo(() => toOptions(dests), [dests]) };
}

/** Searchable chip multi-select. */
function ChipPicker({ label, hint, options, value, onChange, locked = [] }: {
    label: string;
    hint?: string;
    options: Option[];
    value: string[];
    onChange: (ids: string[]) => void;
    /** Shown as always-included (e.g. the business's own town). */
    locked?: Option[];
}) {
    const [query, setQuery] = useState('');
    const lockedIds = new Set(locked.map((l) => l.id));
    const term = query.trim().toLowerCase();
    const matches = options
        .filter((o) => !lockedIds.has(o.id) && !value.includes(o.id))
        .filter((o) => !term || o.name.toLowerCase().includes(term))
        .slice(0, 12);
    const byId = new Map(options.map((o) => [o.id, o]));

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            <div className="flex flex-wrap gap-2">
                {locked.map((o) => (
                    <Badge key={o.id} variant="secondary" title="Included automatically">{o.name} · auto</Badge>
                ))}
                {value.map((id) => (
                    <Badge key={id} className="gap-1">
                        {byId.get(id)?.name ?? id}
                        <button type="button" aria-label={`Remove ${byId.get(id)?.name ?? id}`} onClick={() => onChange(value.filter((v) => v !== id))} className="ml-1">×</button>
                    </Badge>
                ))}
                {locked.length === 0 && value.length === 0 && <span className="text-xs text-muted-foreground">None selected</span>}
            </div>
            <Input placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
            {term && (
                <div className="flex flex-wrap gap-2">
                    {matches.length === 0 && <span className="text-xs text-muted-foreground">No matches</span>}
                    {matches.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            onClick={() => { onChange([...value, o.id]); setQuery(''); }}
                            className="px-3 py-1 rounded-full border text-sm hover:bg-muted"
                        >
                            + {o.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

interface BusinessLike {
    id: string;
    name: string;
    destinationId?: string | null;
}

/** An advertiser's campaigns for one business: create, target, track, pause/resume. */
export function AdCampaignsPanel({ business }: { business: BusinessLike }) {
    const queryClient = useQueryClient();
    const { data: ads = [] } = useQuery({ queryKey: ['my-ads'], queryFn: getMyAdCampaigns });
    const myAds = ads.filter((ad) => ad.businessPartnerId === business.id);

    return (
        <div className="space-y-6">
            <NewCampaignForm business={business} onCreated={() => queryClient.invalidateQueries({ queryKey: ['my-ads'] })} />
            {myAds.length > 0 && <h3 className="font-semibold">Your campaigns</h3>}
            <div className="space-y-4">
                {myAds.map((ad) => <CampaignCard key={ad.id} ad={ad} business={business} />)}
            </div>
        </div>
    );
}

function NewCampaignForm({ business, onCreated }: { business: BusinessLike; onCreated: () => void }) {
    const { categories, destinations } = usePickerOptions();
    const { data: pricing } = useQuery({ queryKey: ['ad-pricing'], queryFn: getAdPricing, staleTime: 5 * 60 * 1000 });

    const empty = { title: '', description: '', ctaLabel: '', ctaUrl: '' };
    const [form, setForm] = useState(empty);
    const [billingModel, setBillingModel] = useState<AdBillingModel>('monthly');
    const [durationMonths, setDurationMonths] = useState(1);
    const [viewQuota, setViewQuota] = useState(10000);
    const [destinationIds, setDestinationIds] = useState<string[]>([]);
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [image, setImage] = useState<File | null>(null);

    const home = destinations.find((d) => d.id === business.destinationId);
    const roundedViews = Math.ceil(Math.max(viewQuota, 100) / 100) * 100;
    const price = pricing ? quoteAd(pricing, billingModel, durationMonths, roundedViews) : null;
    const noPlace = !home && destinationIds.length === 0 && categoryIds.length === 0;

    const createMutation = useMutation({
        mutationFn: (fd: FormData) => createAdCampaign(fd),
        onSuccess: () => {
            toast({ title: 'Ad campaign submitted', description: 'An admin will review it. It goes live once approved and paid.' });
            setForm(empty);
            setDestinationIds([]);
            setCategoryIds([]);
            setImage(null);
            onCreated();
        },
        onError: (error: Error) => toast({ title: 'Failed to submit ad', description: error.message, variant: 'destructive' }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('businessPartnerId', business.id);
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('placementSlot', 'tour_sidebar');
        fd.append('billingModel', billingModel);
        fd.append('durationMonths', String(durationMonths));
        if (billingModel === 'per_view') fd.append('viewQuota', String(roundedViews));
        fd.append('destinationIds', JSON.stringify(destinationIds));
        fd.append('categoryIds', JSON.stringify(categoryIds));
        if (image) fd.append('image', image);
        createMutation.mutate(fd);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>New ad campaign</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Your ad appears on tour pages, tour listings and search results that are connected to your places
                    and tour types — for example, a tour that stops in your town. It never shows on unrelated pages.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
                    <div className="space-y-2">
                        <Label htmlFor="ad-title">Title</Label>
                        <Input id="ad-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Handmade pashmina in Lakeside" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ad-desc">Short description</Label>
                        <Textarea id="ad-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ad-cta">Button label</Label>
                            <Input id="ad-cta" placeholder="e.g. Visit store" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ad-url">Link</Label>
                            <Input id="ad-url" required type="url" placeholder="https://" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ad-image">Image (JPG or PNG)</Label>
                        <input id="ad-image" type="file" accept="image/jpeg,image/png" onChange={(e) => setImage(e.target.files?.[0] || null)} className="text-sm" />
                    </div>

                    <ChipPicker
                        label="Places"
                        hint="Tours that go to these places — as the main destination or as an itinerary stop — will show your ad."
                        options={destinations}
                        value={destinationIds}
                        onChange={setDestinationIds}
                        locked={home ? [home] : []}
                    />
                    <ChipPicker
                        label="Tour types (optional)"
                        hint="If you pick any, your ad shows only on tours of these types (in your places)."
                        options={categories}
                        value={categoryIds}
                        onChange={setCategoryIds}
                    />

                    <fieldset className="space-y-3">
                        <legend className="text-sm font-medium">Plan</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <PlanOption
                                checked={billingModel === 'monthly'}
                                onSelect={() => setBillingModel('monthly')}
                                title="Monthly"
                                detail={pricing ? `${formatPrice(pricing.monthlyPrice, pricing.currency)} per month, unlimited views` : 'Flat price per month'}
                            />
                            <PlanOption
                                checked={billingModel === 'per_view'}
                                onSelect={() => setBillingModel('per_view')}
                                title="Pay per views"
                                detail={pricing ? `${formatPrice(pricing.pricePer100Views, pricing.currency)} per 100 views` : 'Buy a bundle of views'}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ad-months">{billingModel === 'monthly' ? 'Months' : 'Show within (months)'}</Label>
                                <Input id="ad-months" type="number" min={1} max={12} value={durationMonths} onChange={(e) => setDurationMonths(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 12))} />
                            </div>
                            {billingModel === 'per_view' && (
                                <div className="space-y-2">
                                    <Label htmlFor="ad-views">Views</Label>
                                    <Input id="ad-views" type="number" min={100} step={100} value={viewQuota} onChange={(e) => setViewQuota(parseInt(e.target.value) || 100)} />
                                    {roundedViews !== viewQuota && <p className="text-xs text-muted-foreground">Rounded up to {roundedViews.toLocaleString('en-IN')} views</p>}
                                </div>
                            )}
                        </div>
                        {price != null && pricing && (
                            <p className="text-sm">
                                Total: <span className="font-semibold">{formatPrice(price, pricing.currency)}</span>
                                <span className="text-muted-foreground"> — payable after approval; your ad goes live once payment is confirmed.</span>
                            </p>
                        )}
                    </fieldset>

                    {noPlace && (
                        <p className="text-sm text-amber-600">
                            Add at least one place, or set your business location / &ldquo;Where you show up&rdquo; destinations —
                            an ad with no places or tour types has nowhere relevant to show.
                        </p>
                    )}
                    <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Submitting…' : 'Submit for review'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function PlanOption({ checked, onSelect, title, detail }: { checked: boolean; onSelect: () => void; title: string; detail: string }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={onSelect}
            className={`text-left rounded-lg border p-3 transition ${checked ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
        >
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
        </button>
    );
}

function CampaignCard({ ad, business }: { ad: Advertisement; business: BusinessLike }) {
    const queryClient = useQueryClient();
    const { categories, destinations } = usePickerOptions();
    const [editing, setEditing] = useState(false);
    const [destinationIds, setDestinationIds] = useState<string[]>(ad.targets?.destinations.map((d) => d.id) ?? []);
    const [categoryIds, setCategoryIds] = useState<string[]>(ad.targets?.categories.map((c) => c.id) ?? []);
    const home = destinations.find((d) => d.id === business.destinationId);

    const targetingMutation = useMutation({
        mutationFn: () => updateAdTargeting(ad.id, categoryIds, destinationIds),
        onSuccess: () => {
            toast({ title: 'Targeting saved' });
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ['my-ads'] });
        },
        onError: (error: Error) => toast({ title: 'Update failed', description: error.message, variant: 'destructive' }),
    });

    const statusMutation = useMutation({
        mutationFn: (campaignStatus: 'active' | 'paused') => {
            const fd = new FormData();
            fd.append('campaignStatus', campaignStatus);
            return updateAdCampaign(ad.id, fd);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-ads'] }),
        onError: (error: Error) => toast({ title: 'Update failed', description: error.message, variant: 'destructive' }),
    });

    const canToggle = ad.approvalStatus === 'approved' && ad.isPaid && ad.campaignStatus !== 'ended';
    const places = [...(home ? [home.name] : []), ...(ad.targets?.destinations.map((d) => d.name) ?? [])];
    const types = ad.targets?.categories.map((c) => c.name) ?? [];

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-base">{ad.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{describePlan(ad)}</p>
                </div>
                <AdStatusBadges ad={ad} />
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                {ad.rejectionReason && <p className="text-destructive">Rejected: {ad.rejectionReason}</p>}
                {ad.approvalStatus === 'approved' && !ad.isPaid && (
                    <p className="text-amber-600">Approved — pay {formatPrice(ad.priceAmount, ad.currency)} to go live. The admin will confirm your payment.</p>
                )}

                <AdStatsPanel adId={ad.id} />

                {editing ? (
                    <div className="space-y-4 rounded-lg border p-3">
                        <ChipPicker label="Places" options={destinations} value={destinationIds} onChange={setDestinationIds} locked={home ? [home] : []} />
                        <ChipPicker label="Tour types (optional)" options={categories} value={categoryIds} onChange={setCategoryIds} />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => targetingMutation.mutate()} disabled={targetingMutation.isPending}>Save targeting</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1 text-muted-foreground">
                        <p><span className="text-foreground font-medium">Places:</span> {places.length ? places.join(', ') : 'none'}</p>
                        <p><span className="text-foreground font-medium">Tour types:</span> {types.length ? types.join(', ') : 'any'}</p>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit targeting</Button>}
                    {canToggle && (
                        ad.campaignStatus === 'active'
                            ? <Button size="sm" variant="outline" onClick={() => statusMutation.mutate('paused')} disabled={statusMutation.isPending}>Pause</Button>
                            : <Button size="sm" onClick={() => statusMutation.mutate('active')} disabled={statusMutation.isPending}>Resume</Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
