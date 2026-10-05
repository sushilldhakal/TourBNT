'use client';

import { useRef, useState } from 'react';
import { Search, Link2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { searchBusinessPartners, BusinessPartner, BusinessPartnerType } from '@/lib/api/businessPartners';
import { useUnitTypes } from '@/lib/queries';
import { useTourContext } from '@/providers/TourProvider';
import type { EditorItineraryPartner, ItineraryPartnerRole } from '@/types/tourEditor';

type ItineraryPartner = EditorItineraryPartner;

const ROLE_TO_TYPES: Record<ItineraryPartnerRole, BusinessPartnerType[]> = {
    transport: ['transport'],
    accommodation: ['hotel', 'guesthouse'],
    guide: ['guide'],
    meals: ['restaurant'],
    other: ['guide', 'hotel', 'guesthouse', 'restaurant', 'transport', 'advertiser'],
};

/** Roles where "how many rooms/seats/covers" is a meaningful, separate ask from traveler headcount. Guide/other are time- or ad-hoc-based instead. */
const ROLES_WITH_QUANTITY: ItineraryPartnerRole[] = ['accommodation', 'meals', 'transport'];
const QUANTITY_LABEL: Record<string, string> = {
    accommodation: 'Rooms',
    meals: 'Covers',
    transport: 'Seats',
};

const OPEN_AUDIENCE: Record<ItineraryPartnerRole, string> = {
    accommodation: 'any free hotel or guesthouse',
    meals: 'any free restaurant',
    guide: 'any free guide',
    transport: 'any free transport provider',
    other: 'any free partner',
};

const OPEN_NAME: Record<ItineraryPartnerRole, string> = {
    accommodation: 'Open for any hotel or guesthouse',
    meals: 'Open for any restaurant',
    guide: 'Open for any guide',
    transport: 'Open for any transport provider',
    other: 'Open for any partner',
};

interface BusinessPartnerPickerProps {
    /** react-hook-form path to this day's itinerary item, e.g. `itinerary.options.0.3` */
    basePath: `itinerary.options.0.${number}`;
    role: ItineraryPartnerRole;
    label: string;
    placeholder: string;
}

/**
 * Lets a tour agent attach a transport/accommodation/guide/meals provider to
 * an itinerary day — either linked to a registered TourBNT business (so
 * travelers can click through to reviews) or as a plain free-typed name
 * when the provider isn't on the platform.
 */
export function BusinessPartnerPicker({ basePath, role, label, placeholder }: BusinessPartnerPickerProps) {
    const { form } = useTourContext();
    const { getValues, setValue, watch } = form;
    const partnersPath = `${basePath}.partners` as const;
    const partners: ItineraryPartner[] = watch(partnersPath) ?? [];
    const current = partners.find((p) => p?.role === role);

    // Real, partner-configured unit types (hotel room types, restaurant meal
    // slots, transport vehicle types) for the linked partner — when they've
    // set any up, the agency picks from this list instead of typing a
    // free-text guess.
    const { data: unitTypes } = useUnitTypes(role === 'accommodation' || role === 'meals' || role === 'transport' ? current?.businessPartnerId : undefined);

    const [query, setQuery] = useState(current?.openForAll ? '' : (current?.name || ''));
    const [results, setResults] = useState<BusinessPartner[]>([]);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Linking a different partner shows its name in the search box (adjusted while rendering).
    const [shownPartnerId, setShownPartnerId] = useState(current?.businessPartnerId);
    const [shownOpen, setShownOpen] = useState(!!current?.openForAll);
    if (current?.businessPartnerId !== shownPartnerId || !!current?.openForAll !== shownOpen) {
        setShownPartnerId(current?.businessPartnerId);
        setShownOpen(!!current?.openForAll);
        setQuery(current?.openForAll ? '' : (current?.name || ''));
    }

    const upsert = (patch: Partial<ItineraryPartner> | null) => {
        const existing: ItineraryPartner[] = getValues(partnersPath) ?? [];
        const withoutRole = existing.filter((p) => p?.role !== role);
        if (patch === null) {
            setValue(partnersPath, withoutRole, { shouldDirty: true });
            return;
        }
        setValue(partnersPath, [...withoutRole, { role, name: '', ...patch }], { shouldDirty: true });
    };

    const setOpenForAll = (open: boolean) => {
        if (!open) {
            setQuery('');
            upsert(null);
            return;
        }
        setQuery('');
        setResults([]);
        setOpen(false);
        upsert({
            openForAll: true,
            name: OPEN_NAME[role],
            time: current?.time,
            endTime: current?.endTime,
            unitsRequested: current?.unitsRequested,
            notes: current?.notes,
        });
    };

    const handleQueryChange = (value: string) => {
        setQuery(value);
        // Typing clears any previous link — becomes a free-text name until a suggestion is picked.
        if (value.trim()) {
            upsert({ name: value, openForAll: false });
        } else {
            upsert(null);
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.trim().length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                const types = ROLE_TO_TYPES[role];
                const responses = await Promise.all(types.map((type) => searchBusinessPartners({ type, q: value, limit: 5 })));
                const merged = responses.flatMap((r) => r.data);
                setResults(merged);
                setOpen(merged.length > 0);
            } catch {
                setResults([]);
            }
        }, 300);
    };

    const handleSelect = (partner: BusinessPartner) => {
        upsert({ businessPartnerId: partner.id, name: partner.name, openForAll: false, time: current?.time, endTime: current?.endTime, unitsRequested: current?.unitsRequested });
        setQuery(partner.name);
        setOpen(false);
        setResults([]);
    };

    const clearLink = () => {
        upsert(query.trim() ? { name: query } : null);
    };

    const setTime = (time: string) => {
        if (!current) return;
        upsert({ ...current, time: time || undefined });
    };

    const setEndTime = (endTime: string) => {
        if (!current) return;
        upsert({ ...current, endTime: endTime || undefined });
    };

    const setUnitsRequested = (value: string) => {
        if (!current) return;
        const parsed = value === '' ? undefined : Math.max(0, Number(value));
        upsert({ ...current, unitsRequested: Number.isFinite(parsed) ? parsed : undefined });
    };

    const setUnitType = (value: string) => {
        if (!current) return;
        upsert({ ...current, unitType: value || undefined, unitTypeId: undefined });
    };

    const setUnitTypeById = (unitTypeId: string) => {
        if (!current) return;
        const picked = unitTypes?.find((t) => t.id === unitTypeId);
        // Default the sitting time from the slot's own default (still
        // editable via the Sitting time input below) — never overwrites a
        // time the agency already chose deliberately.
        const time = role === 'meals' && picked?.defaultTime && !current.time ? picked.defaultTime : current.time;
        upsert({ ...current, unitTypeId: unitTypeId || undefined, unitType: picked?.name, time });
    };

    return (
        <div className="space-y-2 relative">
            <Label>{label}</Label>
            <label className="flex items-start gap-2 text-sm">
                <Checkbox
                    checked={!!current?.openForAll}
                    onCheckedChange={(checked) => setOpenForAll(checked === true)}
                    className="mt-0.5"
                />
                <span>
                    Leave open for {OPEN_AUDIENCE[role]}
                    <span className="block text-xs text-muted-foreground">They apply for a date they are free. You choose one. Or assign a business yourself below.</span>
                </span>
            </label>
            <div className="relative">
                <Input
                    placeholder={current?.openForAll ? 'Open — applications will come in' : placeholder}
                    value={query}
                    disabled={!!current?.openForAll}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                />
                {current?.businessPartnerId ? (
                    <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 gap-1 text-xs">
                        <Link2 className="h-3 w-3" /> Linked
                        <button type="button" onClick={clearLink} className="ml-1"><X className="h-3 w-3" /></button>
                    </Badge>
                ) : (
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                )}
            </div>
            {open && results.length > 0 && (
                <div className="absolute z-10 w-full bg-popover border border-border rounded-md shadow-md mt-1 max-h-48 overflow-auto">
                    {results.map((r) => (
                        <button
                            type="button"
                            key={r.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(r)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                        >
                            <span>{r.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{r.type} · ★{r.averageRating.toFixed(1)}</span>
                        </button>
                    ))}
                </div>
            )}
            {current?.openForAll && (
                <p className="text-xs text-muted-foreground">Open for this day. Approved businesses who are free on a departure date can apply, and you pick one.</p>
            )}
            {!current?.businessPartnerId && !current?.openForAll && query.trim() && (
                <p className="text-xs text-muted-foreground">Not registered on TourBNT — will be shown as plain text with no link.</p>
            )}
            {role === 'meals' && current && (
                <div className="flex items-center gap-2 pt-1">
                    <Label className="text-xs text-muted-foreground shrink-0">Sitting time</Label>
                    <Input
                        type="time"
                        className="h-8 w-32"
                        value={current.time || ''}
                        onChange={(e) => setTime(e.target.value)}
                    />
                    {current.businessPartnerId && (
                        <span className="text-xs text-muted-foreground">Lets {current.name} know exactly when to expect the group.</span>
                    )}
                </div>
            )}
            {role === 'guide' && current && (
                <div className="flex items-center gap-2 pt-1">
                    <Label className="text-xs text-muted-foreground shrink-0">From</Label>
                    <Input type="time" className="h-8 w-32" value={current.time || ''} onChange={(e) => setTime(e.target.value)} />
                    <Label className="text-xs text-muted-foreground shrink-0">To</Label>
                    <Input type="time" className="h-8 w-32" value={current.endTime || ''} onChange={(e) => setEndTime(e.target.value)} />
                    {current.businessPartnerId && (
                        <span className="text-xs text-muted-foreground">A real time window lets {current.name} take other bookings outside it.</span>
                    )}
                </div>
            )}
            {ROLES_WITH_QUANTITY.includes(role) && current && (
                <div className="flex items-center gap-2 pt-1">
                    <Label className="text-xs text-muted-foreground shrink-0">{QUANTITY_LABEL[role]}</Label>
                    <Input
                        type="number"
                        min={0}
                        className="h-8 w-20"
                        placeholder="e.g. 10"
                        value={current.unitsRequested ?? ''}
                        onChange={(e) => setUnitsRequested(e.target.value)}
                    />
                    {unitTypes && unitTypes.length > 0 ? (
                        <select
                            className="h-8 flex-1 text-sm border rounded-md px-2 bg-background"
                            value={current.unitTypeId || ''}
                            onChange={(e) => setUnitTypeById(e.target.value)}
                        >
                            <option value="">Select a room type...</option>
                            {unitTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.name} ({t.totalUnits} total)</option>
                            ))}
                        </select>
                    ) : (
                        <Input
                            className="h-8 flex-1"
                            placeholder="e.g. Deluxe room (optional)"
                            value={current.unitType || ''}
                            onChange={(e) => setUnitType(e.target.value)}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
