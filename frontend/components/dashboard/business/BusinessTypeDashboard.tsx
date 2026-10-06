'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DatePickerField } from '@/components/ui/date-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, XCircle, Repeat2 } from 'lucide-react';
import {
    respondToItineraryRequest,
    withdrawConfirmedRequest,
    updateMyCapacity,
    setCapacityOverride,
    getAvailableCapacityForDate,
    getBusinessReviews,
    addBusinessReviewReply,
    updateMyBusinessPartner,
    updateBusinessPartnerTargeting,
    type BusinessPartner,
    type BusinessPartnerType,
    type ItineraryRequestStatus,
} from '@/lib/api/businessPartners';
import { AdCampaignsPanel } from '@/components/dashboard/ads/AdCampaignsPanel';
import { OpenDatesTab, WithdrawalNotice } from '@/components/dashboard/business/OpenDatesAndWithdrawal';
import { getApprovedCategories, getApprovedDestinations } from '@/lib/api/globalApi';
import {
    createUnitType,
    updateUnitType,
    deleteUnitType,
    setUnitTypeBlock,
    type BusinessPartnerUnitType,
    type UnitBlockChannel,
} from '@/lib/api/unitTypes';
import { createAvailabilityBlock, deleteAvailabilityBlock } from '@/lib/api/availability';
import { useMyBusinessPartners, useMyCapacity, useCapacityOverrides, useMyItineraryRequests, useUnitTypes, useUnitTypeInventory, useAvailabilityBlocks } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/queryKeys';
import type { DestinationTypes } from '@/types/types';
import AddDestination from '@/components/dashboard/tours/Destination/AddDestination';

const ADD_DESTINATION = '__add_destination__';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
    pending: { label: 'Pending Review', variant: 'secondary' },
    approved: { label: 'Approved', variant: 'default' },
    rejected: { label: 'Rejected', variant: 'destructive' },
};

const DETAILS_FIELDS: Record<BusinessPartnerType, Array<{ key: string; label: string; kind: 'text' | 'number' | 'list' | 'textarea' }>> = {
    hotel: [
        { key: 'roomCount', label: 'Number of rooms', kind: 'number' },
        { key: 'amenities', label: 'Amenities', kind: 'list' },
    ],
    guesthouse: [
        { key: 'roomCount', label: 'Number of rooms', kind: 'number' },
        { key: 'amenities', label: 'Amenities', kind: 'list' },
    ],
    restaurant: [
        { key: 'cuisine', label: 'Cuisine', kind: 'text' },
        { key: 'seatingCapacity', label: 'Seating capacity', kind: 'number' },
    ],
    guide: [
        { key: 'languages', label: 'Languages', kind: 'list' },
        { key: 'certifications', label: 'Certifications', kind: 'textarea' },
    ],
    transport: [
        { key: 'vehicleTypes', label: 'Vehicle types', kind: 'list' },
        { key: 'capacity', label: 'Passenger capacity', kind: 'number' },
    ],
    advertiser: [],
};

interface BusinessTypeDashboardProps {
    /** Which business_partner_type(s) this page manages — a user owning more than one of these picks the first. */
    types: BusinessPartnerType[];
    title: string;
    description: string;
    icon: LucideIcon;
    /** Hotels/restaurants/guides/transport get Capacity + Requests tabs; advertisers get Ads instead. */
    showLogistics?: boolean;
}

export function BusinessTypeDashboard({ types, title, description, icon, showLogistics = true }: BusinessTypeDashboardProps) {
    const { data: businesses, isLoading } = useMyBusinessPartners();
    const business = businesses?.find((b) => types.includes(b.type));

    if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

    if (!business) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <DashboardCardHeader variant="compact" icon={icon} badge="Business" title={title} description={description} />
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground mb-4">You don&apos;t have a {title.toLowerCase()} listing yet.</p>
                        <a href="/apply-partner" className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium">Apply as a Business Partner</a>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const status = STATUS_LABEL[business.approvalStatus];

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <DashboardCardHeader
                variant="compact"
                icon={icon}
                badge="Business"
                title={business.name}
                description={description}
                actions={
                    <div className="flex gap-2 items-center">
                        <Button asChild variant="outline" size="sm"><Link href="/dashboard/profile">Edit business profile</Link></Button>
                        <Badge variant="secondary" className="capitalize">{business.type}</Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                }
            />

            {business.approvalStatus === 'rejected' && business.rejectionReason && (
                <Card className="border-destructive">
                    <CardContent className="py-4 text-sm">
                        <span className="font-medium">Rejection reason:</span> {business.rejectionReason}
                    </CardContent>
                </Card>
            )}
            {business.approvalStatus === 'pending' && business.approvalHoldReason !== 'insufficient_withdrawal_evidence' && (
                <Card>
                    <CardContent className="py-4 text-sm text-muted-foreground">
                        Your application is being reviewed. You&apos;ll be notified once it&apos;s approved.
                    </CardContent>
                </Card>
            )}
            {showLogistics && <WithdrawalNotice businessPartnerId={business.id} />}

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {/* Advertisers aren't reviewed by travellers, so no rating for them. */}
                {business.type !== 'advertiser' && <span>★ {business.averageRating.toFixed(1)} ({business.approvedReviewCount} reviews)</span>}
                <span>{business.views} profile views</span>
            </div>

            <Tabs defaultValue={showLogistics ? 'capacity' : 'ads'}>
                <TabsList>
                    {showLogistics && <TabsTrigger value="capacity">Capacity</TabsTrigger>}
                    {showLogistics && <TabsTrigger value="requests">Requests</TabsTrigger>}
                    {showLogistics && <TabsTrigger value="open-dates">Open dates</TabsTrigger>}
                    {/* Hotels/restaurants/guides/transport surface through sellers' day-by-day itineraries — only advertisers need targeting. */}
                    {business.type === 'advertiser' && <TabsTrigger value="targeting">Visibility</TabsTrigger>}
                    {business.type !== 'advertiser' && <TabsTrigger value="reviews">Reviews</TabsTrigger>}
                    {!showLogistics && <TabsTrigger value="ads">Ad Campaigns</TabsTrigger>}
                </TabsList>

                {showLogistics && (
                    <TabsContent value="capacity" className="mt-4">
                        <CapacityTab businessPartnerId={business.id} businessType={business.type} />
                    </TabsContent>
                )}
                {showLogistics && (
                    <TabsContent value="requests" className="mt-4">
                        <RequestsTab businessPartnerId={business.id} />
                    </TabsContent>
                )}
                {showLogistics && (
                    <TabsContent value="open-dates" className="mt-4">
                        <OpenDatesTab businessPartnerId={business.id} />
                    </TabsContent>
                )}
                {business.type === 'advertiser' && (
                    <TabsContent value="targeting" className="mt-4">
                        <TargetingTab business={business} />
                    </TabsContent>
                )}
                {business.type !== 'advertiser' && (
                    <TabsContent value="reviews" className="mt-4">
                        <ReviewsTab business={business} />
                    </TabsContent>
                )}
                {!showLogistics && (
                    <TabsContent value="ads" className="mt-4">
                        <AdCampaignsPanel business={business} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

function parseListField(value: unknown): string {
    return Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';
}

/** One-time-setup business details, shown on /dashboard/profile for every business the user owns. */
export function BusinessProfileSection() {
    const { data: businesses } = useMyBusinessPartners();
    if (!businesses || businesses.length === 0) return null;
    return (
        <div className="space-y-4">
            {businesses.map((b) => (
                <div key={b.id} className="space-y-2">
                    <h2 className="text-lg font-semibold">Business profile — {b.name}</h2>
                    <ProfileTab business={b} />
                </div>
            ))}
        </div>
    );
}

function ProfileTab({ business }: { business: BusinessPartner }) {
    const queryClient = useQueryClient();
    const fields = DETAILS_FIELDS[business.type];
    const details = (business.details || {}) as Record<string, unknown>;

    const [form, setForm] = useState({
        name: business.name,
        description: business.description || '',
        email: business.email || '',
        phone: business.phone || '',
        website: business.website || '',
    });
    const [detailsForm, setDetailsForm] = useState<Record<string, string>>(
        Object.fromEntries(fields.map((f) => [f.key, f.kind === 'list' ? parseListField(details[f.key]) : String(details[f.key] ?? '')]))
    );
    const [destinationId, setDestinationId] = useState(business.destinationId || '');
    // Extra destinations (chains, guides, transport). A guesthouse is one building, so it only has a home destination.
    const multiDestination = business.type !== 'guesthouse' && business.type !== 'advertiser';
    const [extraDestinationIds, setExtraDestinationIds] = useState<string[]>(business.serviceDestinationIds ?? []);
    const [addDestinationOpen, setAddDestinationOpen] = useState(false);
    // A partner has no destination preferences of their own (that list belongs to sellers), so offer
    // every approved destination. One the partner just created is still pending approval and not in
    // that list yet, so it's kept locally so the select can show it.
    const [createdDestination, setCreatedDestination] = useState<{ _id: string; name: string } | null>(null);
    const { data: approvedDestinations = [], isLoading: destinationsLoading } = useQuery({
        queryKey: ['destinations', 'approved-options'],
        queryFn: async () => {
            const d = (await getApprovedDestinations()) as unknown;
            const r = d as { data?: unknown[]; items?: unknown[] };
            const list = (Array.isArray(d) ? d : (r?.data ?? r?.items ?? [])) as Array<Record<string, unknown>>;
            return list.map((x) => ({ ...x, _id: String(x._id ?? x.id ?? '') })) as unknown as DestinationTypes[];
        },
        staleTime: 5 * 60 * 1000,
    });
    const destinations = createdDestination && !approvedDestinations.some((d) => String(d._id) === createdDestination._id)
        ? [...approvedDestinations, createdDestination as unknown as DestinationTypes]
        : approvedDestinations;

    const mutation = useMutation({
        mutationFn: async (fd: FormData) => {
            const saved = await updateMyBusinessPartner(business.id, fd);
            if (multiDestination) {
                await updateBusinessPartnerTargeting(business.id, undefined, extraDestinationIds.filter((id) => id !== destinationId));
            }
            return saved;
        },
        onSuccess: () => {
            toast({ title: 'Profile updated' });
            queryClient.invalidateQueries({ queryKey: ['business-partners', 'mine'] });
        },
        onError: (error: Error) => toast({ title: 'Update failed', description: error.message, variant: 'destructive' }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const nextDetails: Record<string, unknown> = { ...details };
        for (const f of fields) {
            const raw = detailsForm[f.key];
            if (f.kind === 'list') nextDetails[f.key] = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
            else if (f.kind === 'number') nextDetails[f.key] = raw ? Number(raw) : undefined;
            else nextDetails[f.key] = raw || undefined;
        }

        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('details', JSON.stringify(nextDetails));
        fd.append('destinationId', destinationId);
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
                    <div>
                        <label className="block text-sm font-medium mb-1">{multiDestination ? 'Home destination' : 'Location'}</label>
                        <Select
                            value={destinationId || undefined}
                            onValueChange={(v) => {
                                if (v === ADD_DESTINATION) {
                                    setAddDestinationOpen(true);
                                    return;
                                }
                                setDestinationId(v);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Where are you based?" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                {destinationsLoading ? (
                                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">Loading destinations...</div>
                                ) : Array.isArray(destinations) && destinations.length > 0 ? (
                                    (destinations as DestinationTypes[]).map((dest) => {
                                        const id = dest._id != null ? String(dest._id) : '';
                                        if (!id) return null;
                                        return (
                                            <SelectItem disabled={dest.isActive === false} key={id} value={id}>
                                                {dest.name}
                                            </SelectItem>
                                        );
                                    })
                                ) : null}
                                {!destinationsLoading && (
                                    <SelectItem value={ADD_DESTINATION}>Add destination</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                            {business.type === 'guesthouse'
                                ? 'A guesthouse is in one destination. Tour operators can only pick you for days in this destination.'
                                : 'The destination you\'re based in — e.g. a Srinagar restaurant sets Srinagar here, the same destination tours tag when they include you.'}
                        </p>
                    </div>
                    {multiDestination && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Other destinations you serve</label>
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Other destinations you serve">
                                {(destinations as DestinationTypes[])
                                    .map((dest) => ({ id: dest._id != null ? String(dest._id) : '', name: dest.name, active: dest.isActive !== false }))
                                    .filter((dest) => dest.id && dest.active && dest.id !== destinationId)
                                    .map((dest) => {
                                        const on = extraDestinationIds.includes(dest.id);
                                        return (
                                            <button
                                                type="button"
                                                key={dest.id}
                                                aria-pressed={on}
                                                onClick={() => setExtraDestinationIds(on ? extraDestinationIds.filter((x) => x !== dest.id) : [...extraDestinationIds, dest.id])}
                                                className={`px-3 py-1.5 rounded-full text-sm border ${on ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                                            >
                                                {dest.name}
                                            </button>
                                        );
                                    })}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {business.type === 'transport'
                                    ? 'Every destination you run vehicles to or from. Tour operators only see you for days in these places.'
                                    : business.type === 'guide'
                                        ? 'Only the areas you actually guide in. Tour operators only see you for days in these places.'
                                        : 'Other destinations where you have a branch. Tour operators only see you for days in these places.'}
                            </p>
                        </div>
                    )}

                    {fields.length > 0 && (
                        <div className="space-y-4 pt-2 border-t">
                            <p className="text-sm font-medium pt-4">{business.type === 'guide' ? 'Guide details' : business.type === 'restaurant' ? 'Restaurant details' : business.type === 'transport' ? 'Transport details' : 'Property details'}</p>
                            {fields.map((f) => (
                                <div key={f.key}>
                                    <label className="block text-sm font-medium mb-1">{f.label}{f.kind === 'list' && ' (comma-separated)'}</label>
                                    {f.kind === 'textarea' ? (
                                        <Textarea rows={3} value={detailsForm[f.key] || ''} onChange={(e) => setDetailsForm({ ...detailsForm, [f.key]: e.target.value })} />
                                    ) : (
                                        <Input
                                            type={f.kind === 'number' ? 'number' : 'text'}
                                            value={detailsForm[f.key] || ''}
                                            onChange={(e) => setDetailsForm({ ...detailsForm, [f.key]: e.target.value })}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
                </form>
            </CardContent>

            <Dialog open={addDestinationOpen} onOpenChange={setAddDestinationOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add destination</DialogTitle>
                    </DialogHeader>
                    <AddDestination
                        onDestinationAdded={(created) => {
                            setAddDestinationOpen(false);
                            const id = created && typeof created === 'object' ? ((created as { _id?: string; id?: string })._id || (created as { _id?: string; id?: string }).id) : undefined;
                            if (id) {
                                setDestinationId(id);
                                setCreatedDestination({ _id: id, name: String((created as { name?: string }).name ?? 'New destination') });
                            }
                        }}
                    />
                </DialogContent>
            </Dialog>
        </Card>
    );
}

const CHANNEL_LABEL: Record<UnitBlockChannel, string> = {
    direct: 'Direct',
    private: 'Private',
    other: 'Other',
    maintenance: 'Maintenance',
};

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}
function addDaysISO(date: string, days: number) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days); // UTC to match toISOString; local setDate duplicates a day across DST
    return d.toISOString().slice(0, 10);
}

function UnitTypeInventoryTable({ businessPartnerId, unitType }: { businessPartnerId: string; unitType: BusinessPartnerUnitType }) {
    const queryClient = useQueryClient();
    const [from] = useState(todayISO());
    const [to] = useState(addDaysISO(todayISO(), 13));
    const { data: inventory, isLoading } = useUnitTypeInventory(businessPartnerId, unitType.id, from, to);
    const [blockDrafts, setBlockDrafts] = useState<Record<string, { channel: UnitBlockChannel; count: string }>>({});

    const blockMutation = useMutation({
        mutationFn: ({ date, channel, count }: { date: string; channel: UnitBlockChannel; count: number }) =>
            setUnitTypeBlock(businessPartnerId, unitType.id, date, channel, count),
        onSuccess: () => {
            toast({ title: 'Block saved' });
            queryClient.invalidateQueries({ queryKey: queryKeys.businessPartners.unitTypeInventory(businessPartnerId, unitType.id, from, to) });
        },
        onError: (error: Error) => toast({ title: 'Save failed', description: error.message, variant: 'destructive' }),
    });

    if (isLoading) return <p className="text-xs text-muted-foreground">Loading inventory...</p>;
    if (!inventory) return null;

    return (
        <div className="space-y-1.5">
            {inventory.map((day) => {
                const draft = blockDrafts[day.date] ?? { channel: 'direct' as UnitBlockChannel, count: '' };
                const breakdown = Object.entries(day.blockedByChannel)
                    .map(([ch, n]) => `${n} ${CHANNEL_LABEL[ch as UnitBlockChannel]}`)
                    .concat(day.reservedByTourBnt > 0 ? [`${day.reservedByTourBnt} TourBNT`] : [])
                    .join(' · ');
                return (
                    <div key={day.date} className="flex items-center justify-between gap-3 text-sm border rounded-md px-3 py-2 flex-wrap">
                        <div className="min-w-0">
                            <span className="font-medium">{day.date}</span>
                            <span className="text-muted-foreground"> · {day.total} total · {day.occupied} occupied · {day.available} available</span>
                            {breakdown && <p className="text-xs text-muted-foreground">{breakdown}</p>}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <select
                                className="h-8 text-xs border rounded-md px-1.5 bg-background"
                                value={draft.channel}
                                onChange={(e) => setBlockDrafts({ ...blockDrafts, [day.date]: { ...draft, channel: e.target.value as UnitBlockChannel } })}
                            >
                                {(Object.keys(CHANNEL_LABEL) as UnitBlockChannel[]).map((ch) => (
                                    <option key={ch} value={ch}>{CHANNEL_LABEL[ch]}</option>
                                ))}
                            </select>
                            <Input
                                type="number"
                                min={0}
                                className="h-8 w-16"
                                placeholder="qty"
                                value={draft.count}
                                onChange={(e) => setBlockDrafts({ ...blockDrafts, [day.date]: { ...draft, count: e.target.value } })}
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={blockMutation.isPending || draft.count === ''}
                                onClick={() => blockMutation.mutate({ date: day.date, channel: draft.channel, count: Number(draft.count) })}
                            >
                                Block
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

type UnitTypeBusinessType = 'hotel' | 'guesthouse' | 'restaurant' | 'transport';

const UNIT_TYPE_COPY: Record<UnitTypeBusinessType, { title: string; itemNoun: string; itemNounPlural: string; unitLabel: string; namePlaceholder: string; showTime: boolean }> = {
    hotel: { title: 'Room types', itemNoun: 'room type', itemNounPlural: 'room types', unitLabel: 'Total rooms', namePlaceholder: 'e.g. Deluxe', showTime: false },
    guesthouse: { title: 'Room types', itemNoun: 'room type', itemNounPlural: 'room types', unitLabel: 'Total rooms', namePlaceholder: 'e.g. Deluxe', showTime: false },
    restaurant: { title: 'Meal slots', itemNoun: 'meal slot', itemNounPlural: 'meal slots', unitLabel: 'Seats', namePlaceholder: 'e.g. Dinner', showTime: true },
    transport: { title: 'Vehicle types', itemNoun: 'vehicle type', itemNounPlural: 'vehicle types', unitLabel: 'Seats', namePlaceholder: 'e.g. Toyota Hiace', showTime: false },
};

function UnitTypesSection({ businessPartnerId, businessType }: { businessPartnerId: string; businessType: UnitTypeBusinessType }) {
    const copy = UNIT_TYPE_COPY[businessType];
    const queryClient = useQueryClient();
    const { data: unitTypes, isLoading } = useUnitTypes(businessPartnerId);
    const [newName, setNewName] = useState('');
    const [newTotal, setNewTotal] = useState('');
    const [newTime, setNewTime] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.businessPartners.unitTypes(businessPartnerId) });

    const createMutation = useMutation({
        mutationFn: () => createUnitType(businessPartnerId, { name: newName.trim(), totalUnits: Number(newTotal) || 0, defaultTime: newTime || undefined }),
        onSuccess: () => { toast({ title: `${copy.itemNoun} added` }); setNewName(''); setNewTotal(''); setNewTime(''); invalidate(); },
        onError: (error: Error & { statusCode?: number; data?: { message?: string } }) => toast({
            title: error.statusCode === 409 ? `"${newName.trim()}" already exists` : `Could not add ${copy.itemNoun}`,
            description: error.data?.message ?? error.message,
            variant: 'destructive',
        }),
    });

    const updateTotalMutation = useMutation({
        mutationFn: ({ id, totalUnits }: { id: string; totalUnits: number }) => updateUnitType(businessPartnerId, id, { totalUnits }),
        onSuccess: () => { toast({ title: 'Updated' }); invalidate(); },
        onError: (error: Error) => toast({ title: 'Update failed', description: error.message, variant: 'destructive' }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteUnitType(businessPartnerId, id),
        onSuccess: () => { toast({ title: `${copy.itemNoun} deleted` }); invalidate(); },
        onError: (error: Error) => toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{copy.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Sellers pick one of these when linking you to a tour day, so capacity is tracked per {copy.itemNoun} instead of one pooled number.
                </p>

                <div className="flex items-end gap-2 max-w-lg flex-wrap">
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <Input placeholder={copy.namePlaceholder} value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                    <div className="w-28">
                        <label className="block text-sm font-medium mb-1">{copy.unitLabel}</label>
                        <Input type="number" min={0} value={newTotal} onChange={(e) => setNewTotal(e.target.value)} />
                    </div>
                    {copy.showTime && (
                        <div className="w-32">
                            <label className="block text-sm font-medium mb-1">Default time</label>
                            <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                        </div>
                    )}
                    <Button disabled={createMutation.isPending || !newName.trim()} onClick={() => createMutation.mutate()}>
                        Add
                    </Button>
                </div>

                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : unitTypes && unitTypes.length > 0 ? (
                    <div className="space-y-2 pt-2">
                        {unitTypes.map((ut) => (
                            <div key={ut.id} className="border rounded-md">
                                <div className="flex items-center justify-between gap-3 px-3 py-2">
                                    <button type="button" className="font-medium text-sm text-left" onClick={() => setExpandedId(expandedId === ut.id ? null : ut.id)}>
                                        {ut.name}{ut.defaultTime && <span className="text-muted-foreground font-normal"> · {ut.defaultTime}</span>}
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            className="h-8 w-20"
                                            defaultValue={ut.totalUnits}
                                            onBlur={(e) => {
                                                const value = Number(e.target.value);
                                                if (value !== ut.totalUnits) updateTotalMutation.mutate({ id: ut.id, totalUnits: value });
                                            }}
                                        />
                                        <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === ut.id ? null : ut.id)}>
                                            {expandedId === ut.id ? 'Hide' : 'Inventory'}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(ut.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                                {expandedId === ut.id && (
                                    <div className="px-3 pb-3 pt-1 border-t">
                                        <UnitTypeInventoryTable businessPartnerId={businessPartnerId} unitType={ut} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No {copy.itemNounPlural} yet — add one above.</p>
                )}
            </CardContent>
        </Card>
    );
}

function GuideAvailabilitySection({ businessPartnerId }: { businessPartnerId: string }) {
    const queryClient = useQueryClient();
    const { data: blocks, isLoading } = useAvailabilityBlocks(businessPartnerId);
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [reason, setReason] = useState('');

    const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.businessPartners.availabilityBlocks(businessPartnerId) });

    const createMutation = useMutation({
        mutationFn: () => createAvailabilityBlock(businessPartnerId, date, startTime, endTime, reason || undefined),
        onSuccess: () => {
            toast({ title: 'Unavailable window added' });
            setDate(''); setStartTime(''); setEndTime(''); setReason('');
            invalidate();
        },
        onError: (error: Error) => toast({ title: 'Could not add', description: error.message, variant: 'destructive' }),
    });

    const deleteMutation = useMutation({
        mutationFn: (blockId: string) => deleteAvailabilityBlock(businessPartnerId, blockId),
        onSuccess: () => { toast({ title: 'Removed' }); invalidate(); },
        onError: (error: Error) => toast({ title: 'Could not remove', description: error.message, variant: 'destructive' }),
    });

    return (
        <Card>
            <CardHeader><CardTitle>Availability</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Mark windows you&apos;re unavailable (a day off, another booking) — sellers can request any window you haven&apos;t blocked or already accepted another tour for.
                </p>

                <div className="flex items-end gap-2 max-w-2xl flex-wrap">
                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <DatePickerField className="w-44" min={new Date()} value={date} onChange={setDate} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">From</label>
                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">To</label>
                        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                        <Input placeholder="e.g. Day off" value={reason} onChange={(e) => setReason(e.target.value)} />
                    </div>
                    <Button disabled={createMutation.isPending || !date || !startTime || !endTime} onClick={() => createMutation.mutate()}>
                        Add
                    </Button>
                </div>

                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : blocks && blocks.length > 0 ? (
                    <div className="space-y-1.5 pt-2">
                        {blocks.map((b) => (
                            <div key={b.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                                <span>{b.date} · {b.startTime}–{b.endTime}{b.reason && ` · ${b.reason}`}</span>
                                <Button size="sm" variant="ghost" className="text-destructive h-7" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(b.id)}>
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No unavailable windows — you&apos;re open for any date/time a seller requests.</p>
                )}
            </CardContent>
        </Card>
    );
}

function CapacityTab({ businessPartnerId, businessType }: { businessPartnerId: string; businessType: BusinessPartnerType }) {
    const queryClient = useQueryClient();
    const { data: capacity, isLoading: capacityLoading } = useMyCapacity(businessPartnerId);
    const { data: overrides } = useCapacityOverrides(businessPartnerId);
    const [unitLabel, setUnitLabel] = useState('');
    const [defaultDailyCapacity, setDefaultDailyCapacity] = useState('');
    const [overrideDate, setOverrideDate] = useState('');
    const [overrideCapacity, setOverrideCapacity] = useState('');
    const capacityKey = capacity ? `${capacity.unitLabel}:${capacity.defaultDailyCapacity}` : null;
    const [seededCapacity, setSeededCapacity] = useState<string | null>(null);

    if (capacity && capacityKey !== seededCapacity) {
        setSeededCapacity(capacityKey);
        setUnitLabel(capacity.unitLabel);
        setDefaultDailyCapacity(String(capacity.defaultDailyCapacity));
    }

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['business-partners', businessPartnerId, 'capacity'] });
        queryClient.invalidateQueries({ queryKey: ['business-partners', businessPartnerId, 'capacity-overrides'] });
    };

    const updateMutation = useMutation({
        mutationFn: () => updateMyCapacity(businessPartnerId, { unitLabel, defaultDailyCapacity: Number(defaultDailyCapacity) || 0 }),
        onSuccess: () => { toast({ title: 'Capacity updated' }); invalidate(); },
        onError: (error: Error) => toast({ title: 'Update failed', description: error.message, variant: 'destructive' }),
    });

    const overrideMutation = useMutation({
        mutationFn: () => setCapacityOverride(businessPartnerId, overrideDate, Number(overrideCapacity) || 0),
        onSuccess: () => {
            toast({ title: 'Override saved' });
            setOverrideDate('');
            setOverrideCapacity('');
            invalidate();
        },
        onError: (error: Error) => toast({ title: 'Save failed', description: error.message, variant: 'destructive' }),
    });

    if (capacityLoading) return <div className="text-muted-foreground text-sm">Loading...</div>;

    const showUnitTypes = businessType === 'hotel' || businessType === 'guesthouse' || businessType === 'restaurant' || businessType === 'transport';
    const unitTypeCopy = showUnitTypes ? UNIT_TYPE_COPY[businessType as UnitTypeBusinessType] : null;
    const isGuide = businessType === 'guide';

    return (
        <div className="space-y-6">
            {showUnitTypes && <UnitTypesSection businessPartnerId={businessPartnerId} businessType={businessType as UnitTypeBusinessType} />}
            {isGuide && <GuideAvailabilitySection businessPartnerId={businessPartnerId} />}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>{isGuide ? 'Group-size limit' : 'Default capacity'}</CardTitle>
                    {capacity && (
                        <Badge variant="secondary" className="text-sm">
                            Saved: {capacity.defaultDailyCapacity} {capacity.unitLabel || unitLabel || 'units'}{isGuide ? '' : ' / day'}
                        </Badge>
                    )}
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        {isGuide
                            ? 'The most tourists you can personally guide in one engagement. Checked in addition to the time-window availability above — leave at 0 for no limit.'
                            : unitTypeCopy
                                ? `Fallback capacity for any day a seller links you without picking one of your ${unitTypeCopy.itemNounPlural} above.`
                                : `How many ${unitLabel || 'units'} you can typically offer per day. Sellers see this as how much room they have to work with when planning an itinerary.`}
                    </p>
                    <div className="flex items-end gap-4 max-w-md">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Unit label</label>
                            <Input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="room / seat / slot" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Default daily capacity</label>
                            <Input type="number" min={0} value={defaultDailyCapacity} onChange={(e) => setDefaultDailyCapacity(e.target.value)} />
                        </div>
                        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Date-specific exceptions</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Set a different capacity for a specific date — e.g. already fully booked by another client that night.
                    </p>
                    <div className="flex items-end gap-3 max-w-md">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Date</label>
                            <DatePickerField className="w-44" min={new Date()} value={overrideDate} onChange={setOverrideDate} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Capacity</label>
                            <Input type="number" min={0} value={overrideCapacity} onChange={(e) => setOverrideCapacity(e.target.value)} />
                        </div>
                        <Button
                            onClick={() => overrideMutation.mutate()}
                            disabled={overrideMutation.isPending || !overrideDate}
                        >
                            Add
                        </Button>
                    </div>

                    {overrides && overrides.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                            {overrides.map((o) => (
                                <div key={o.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                                    <span>{o.date}</span>
                                    <span className="font-medium">{o.capacity} {unitLabel || 'units'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const REQUEST_STATUS_META: Record<ItineraryRequestStatus, { label: string; icon: LucideIcon; className: string }> = {
    pending: { label: 'Needs response', icon: Clock, className: 'status-pill status-pill--pending' },
    held: { label: 'Held by you', icon: Clock, className: 'status-pill status-pill--held' },
    confirmed: { label: 'Confirmed', icon: CheckCircle2, className: 'status-pill status-pill--confirmed' },
    countered: { label: 'Awaiting agency', icon: Repeat2, className: 'status-pill status-pill--countered' },
    declined: { label: 'Declined', icon: XCircle, className: 'status-pill status-pill--declined' },
    expired: { label: 'Expired', icon: XCircle, className: 'status-pill status-pill--expired' },
};

/** Live "X available on this date" hint shown while the partner is deciding — finally puts getAvailableCapacityForDate to use. */
function AvailableCapacityHint({ businessPartnerId, date, unitLabel, unitTypeId }: { businessPartnerId: string; date: string; unitLabel: string; unitTypeId?: string | null }) {
    const { data } = useQuery({
        queryKey: ['business-partners', businessPartnerId, 'capacity-available', date, unitTypeId ?? null],
        queryFn: () => getAvailableCapacityForDate(businessPartnerId, date, unitTypeId ?? undefined),
    });
    if (!data) return null;
    return <p className="text-xs text-muted-foreground">You have {data.available} {unitLabel} available on {date}.</p>;
}

function RequestsTab({ businessPartnerId }: { businessPartnerId: string }) {
    const [statusFilter, setStatusFilter] = useState<ItineraryRequestStatus>('pending');
    const queryClient = useQueryClient();
    const { data, isLoading } = useMyItineraryRequests(businessPartnerId, statusFilter);
    const requests = data?.data ?? [];

    const [unitsDrafts, setUnitsDrafts] = useState<Record<string, string>>({});
    const [counterDrafts, setCounterDrafts] = useState<Record<string, { units?: string; date?: string; time?: string; notes?: string }>>({});
    const [counterOpenFor, setCounterOpenFor] = useState<string | null>(null);
    const [withdrawFor, setWithdrawFor] = useState<string | null>(null);
    const [withdrawText, setWithdrawText] = useState('');

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['business-partners', businessPartnerId, 'requests'] });
        queryClient.invalidateQueries({ queryKey: ['business-partners', businessPartnerId, 'withdrawal-status'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.businessPartners.mine() });
    };

    const respondMutation = useMutation({
        mutationFn: ({ requestId, action, params }: { requestId: string; action: 'hold' | 'confirm' | 'decline' | 'counter'; params?: { units?: number; notes?: string; counterUnits?: number; counterDate?: string; counterTime?: string } }) =>
            respondToItineraryRequest(businessPartnerId, requestId, action, params),
        onSuccess: () => {
            toast({ title: 'Response saved' });
            setCounterOpenFor(null);
            invalidate();
        },
        onError: (error: Error) => toast({ title: 'Could not save response', description: error.message, variant: 'destructive' }),
    });

    const withdrawMutation = useMutation({
        mutationFn: (requestId: string) => withdrawConfirmedRequest(businessPartnerId, requestId, withdrawText),
        onSuccess: (result) => {
            toast({ title: result.accountPending ? 'Account set to pending approval' : 'Cancellation recorded', description: result.warning });
            setWithdrawFor(null);
            setWithdrawText('');
            invalidate();
        },
        onError: (error: Error) => toast({ title: 'Could not cancel the deal', description: error.message, variant: 'destructive' }),
    });

    return (
        <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
                {(['pending', 'held', 'countered', 'confirmed', 'declined', 'expired'] as const).map((s) => (
                    <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)} className="capitalize">
                        {s}
                    </Button>
                ))}
            </div>

            {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
            ) : requests.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No {statusFilter} requests.</CardContent></Card>
            ) : (
                requests.map((r) => {
                    const meta = REQUEST_STATUS_META[r.status];
                    const Icon = meta.icon;
                    const askLabel = r.unitsRequested > 0 ? `${r.unitsRequested} requested` : `${r.headcount} guests`;
                    return (
                        <Card key={r.id}>
                            <CardContent className="py-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{r.tour.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {r.serviceDate}{r.serviceTime && ` · ${r.serviceTime}${r.serviceEndTime ? `–${r.serviceEndTime}` : ''}`} · {askLabel}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className={`gap-1.5 shrink-0 ${meta.className}`}>
                                        <Icon className="h-3 w-3" />
                                        {meta.label}
                                    </Badge>
                                </div>

                                {r.status === 'pending' && (
                                    <>
                                        <AvailableCapacityHint businessPartnerId={businessPartnerId} date={r.serviceDate} unitLabel="units" unitTypeId={r.unitTypeId} />
                                        <div className="flex items-center gap-2 flex-wrap pt-1">
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="Units to commit"
                                                className="max-w-[160px]"
                                                value={unitsDrafts[r.id] ?? ''}
                                                onChange={(e) => setUnitsDrafts({ ...unitsDrafts, [r.id]: e.target.value })}
                                            />
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={respondMutation.isPending || !unitsDrafts[r.id]}
                                                onClick={() => respondMutation.mutate({ requestId: r.id, action: 'hold', params: { units: Number(unitsDrafts[r.id]) } })}
                                            >
                                                Hold
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={respondMutation.isPending || !unitsDrafts[r.id]}
                                                onClick={() => respondMutation.mutate({ requestId: r.id, action: 'confirm', params: { units: Number(unitsDrafts[r.id]) } })}
                                            >
                                                Confirm
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={respondMutation.isPending}
                                                onClick={() => respondMutation.mutate({ requestId: r.id, action: 'decline' })}
                                            >
                                                Decline
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={respondMutation.isPending}
                                                onClick={() => setCounterOpenFor(counterOpenFor === r.id ? null : r.id)}
                                            >
                                                Counter-offer
                                            </Button>
                                        </div>
                                        {counterOpenFor === r.id && (
                                            <div className="flex items-end gap-2 flex-wrap pt-1 border-t mt-2 pt-2">
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Units</Label>
                                                    <Input type="number" min={0} className="h-8 w-24" value={counterDrafts[r.id]?.units ?? ''} onChange={(e) => setCounterDrafts({ ...counterDrafts, [r.id]: { ...counterDrafts[r.id], units: e.target.value } })} />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Date</Label>
                                                    <DatePickerField className="h-8" min={new Date()} value={counterDrafts[r.id]?.date ?? ''} onChange={(v) => setCounterDrafts({ ...counterDrafts, [r.id]: { ...counterDrafts[r.id], date: v } })} />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Time</Label>
                                                    <Input type="time" className="h-8" value={counterDrafts[r.id]?.time ?? ''} onChange={(e) => setCounterDrafts({ ...counterDrafts, [r.id]: { ...counterDrafts[r.id], time: e.target.value } })} />
                                                </div>
                                                <Input
                                                    placeholder="e.g. Can provide 6 Deluxe + 4 Standard"
                                                    className="h-8 flex-1 min-w-[200px]"
                                                    value={counterDrafts[r.id]?.notes ?? ''}
                                                    onChange={(e) => setCounterDrafts({ ...counterDrafts, [r.id]: { ...counterDrafts[r.id], notes: e.target.value } })}
                                                />
                                                <Button
                                                    size="sm"
                                                    disabled={respondMutation.isPending}
                                                    onClick={() => {
                                                        const draft = counterDrafts[r.id] || {};
                                                        respondMutation.mutate({
                                                            requestId: r.id,
                                                            action: 'counter',
                                                            params: {
                                                                counterUnits: draft.units ? Number(draft.units) : undefined,
                                                                counterDate: draft.date || undefined,
                                                                counterTime: draft.time || undefined,
                                                                notes: draft.notes || undefined,
                                                            },
                                                        });
                                                    }}
                                                >
                                                    Send
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                                {r.status === 'held' && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm text-muted-foreground">
                                            Holding {r.capacityConfirmed} for this date{r.holdExpiresAt && ` — expires ${new Date(r.holdExpiresAt).toLocaleString()} if not confirmed`}.
                                        </p>
                                        <Button size="sm" disabled={respondMutation.isPending} onClick={() => respondMutation.mutate({ requestId: r.id, action: 'confirm', params: { units: r.capacityConfirmed ?? 0 } })}>
                                            Confirm
                                        </Button>
                                        <Button size="sm" variant="destructive" disabled={respondMutation.isPending} onClick={() => respondMutation.mutate({ requestId: r.id, action: 'decline' })}>
                                            Decline
                                        </Button>
                                    </div>
                                )}
                                {r.status === 'countered' && (
                                    <p className="text-sm text-muted-foreground">Waiting for the agency to accept or decline your counter-offer.</p>
                                )}
                                {r.status === 'confirmed' && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">Committed {r.capacityConfirmed} for this date.</p>
                                        {withdrawFor !== r.id ? (
                                            <Button type="button" size="sm" variant="destructive" onClick={() => { setWithdrawFor(r.id); setWithdrawText(''); }}>
                                                Cancel this approved deal
                                            </Button>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label className="text-xs">Why you are cancelling a deal that was already approved</Label>
                                                <Textarea
                                                    rows={3}
                                                    value={withdrawText}
                                                    onChange={(e) => setWithdrawText(e.target.value)}
                                                    placeholder="A short note is not enough. Describe what happened and why the booking cannot be kept."
                                                />
                                                <div className="flex gap-2">
                                                    <Button type="button" size="sm" variant="destructive" disabled={withdrawMutation.isPending || !withdrawText.trim()} onClick={() => withdrawMutation.mutate(r.id)}>
                                                        Withdraw approval
                                                    </Button>
                                                    <Button type="button" size="sm" variant="outline" onClick={() => setWithdrawFor(null)}>Keep the deal</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {r.status === 'expired' && (
                                    <p className="text-sm text-muted-foreground">This request went unanswered and expired.</p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );
}

function TargetingTab({ business }: { business: BusinessPartner }) {
    const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
    const [destinations, setDestinations] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [categoriesTouched, setCategoriesTouched] = useState(false);
    const [selectedDestinations, setSelectedDestinations] = useState<string[]>(business.serviceDestinationIds ?? []);

    useEffect(() => {
        getApprovedCategories().then((d: unknown) => {
            const r = d as { data?: unknown[]; items?: unknown[] };
            setCategories((r?.data ?? r?.items ?? d ?? []) as Array<{ id: string; name: string }>);
        }).catch(() => setCategories([]));
        getApprovedDestinations().then((d: unknown) => {
            const r = d as { data?: unknown[]; items?: unknown[] };
            setDestinations((r?.data ?? r?.items ?? d ?? []) as Array<{ id: string; name: string }>);
        }).catch(() => setDestinations([]));
    }, []);

    const mutation = useMutation({
        mutationFn: () => updateBusinessPartnerTargeting(business.id, categoriesTouched ? selectedCategories : undefined, selectedDestinations),
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
                                onClick={() => { setCategoriesTouched(true); toggle(selectedCategories, setSelectedCategories, c.id); }}
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
    const [reviews, setReviews] = useState<Array<{ id: string; user?: { name?: string }; rating: number; comment: string; replies?: Array<{ id: string; user?: { name?: string }; comment: string }> }>>([]);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

    useEffect(() => {
        getBusinessReviews(business.id, 'approved').then((d: unknown) => {
            const r = (d as { data?: { reviews?: typeof reviews } })?.data?.reviews ?? [];
            setReviews(r);
        }).catch(() => setReviews([]));
    }, [business.id]);

    const replyMutation = useMutation({
        mutationFn: ({ reviewId, comment }: { reviewId: string; comment: string }) => addBusinessReviewReply(reviewId, comment),
        onSuccess: () => {
            toast({ title: 'Reply posted' });
            queryClient.invalidateQueries({ queryKey: ['business-reviews', business.id] });
        },
        onError: (error: Error) => toast({ title: 'Reply failed', description: error.message, variant: 'destructive' }),
    });

    return (
        <div className="space-y-4">
            {reviews.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No reviews yet.</CardContent></Card>}
            {reviews.map((review) => (
                <Card key={review.id}>
                    <CardContent className="py-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">{review.user?.name || 'Anonymous'}</span>
                            <span className="text-sm">★ {review.rating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                        {review.replies?.map((reply) => (
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

