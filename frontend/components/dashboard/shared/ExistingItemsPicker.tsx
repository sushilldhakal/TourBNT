'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ChevronDown, FolderPlus, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

export interface PickerItem {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
}

export interface PickerPage {
    items: PickerItem[];
    totalItems: number;
    totalPages: number;
}

interface Props {
    /** Singular/plural noun for copy, e.g. "category" / "categories". */
    noun: string;
    nounPlural: string;
    /** Used in the react-query key so categories and destinations don't share cache. */
    queryKey: string;
    fetchPage: (params: { search: string; page: number; limit: number }) => Promise<PickerPage>;
    /** Either explicit ids, or `all` (everything matching the search) in ONE request. */
    bulkAdd: (payload: { ids?: string[]; all?: boolean; search?: string }) => Promise<{ added: number }>;
    /** Called after a successful add (refresh lists, close dialogs...). `ids` is set when exactly the picked ids were added. */
    onAdded: (result: { added: number; ids?: string[] }) => void;
}

const PAGE_SIZE = 20;

/**
 * "Add existing" picker: server-side search + paging, tick any rows or select
 * everything that matches, then add them all in a single request — no matter
 * whether that is 3 rows or 50,000.
 */
export function ExistingItemsPicker({ noun, nounPlural, queryKey, fetchPage, bulkAdd, onAdded }: Props) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [allMatching, setAllMatching] = useState(false);
    const q = useDebouncedValue(search.trim());
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // A new search starts from page 1 with nothing selected (adjusted while rendering).
    const [searchedFor, setSearchedFor] = useState(q);
    if (q !== searchedFor) {
        setSearchedFor(q);
        setPage(1);
        setAllMatching(false);
        setActive(0);
    }

    const list = useQuery({
        queryKey: ['existing-picker', queryKey, { q, page }],
        queryFn: () => fetchPage({ search: q, page, limit: PAGE_SIZE }),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
    });

    const items = list.data?.items ?? [];
    const total = list.data?.totalItems ?? 0;
    const totalPages = Math.max(list.data?.totalPages ?? 1, 1);

    const pageAllSelected = items.length > 0 && items.every((i) => allMatching || selected.has(i.id));
    const pageSomeSelected = !pageAllSelected && items.some((i) => selected.has(i.id));
    const selectedCount = allMatching ? total : selected.size;

    const togglePage = (checked: boolean) => {
        if (allMatching) { setAllMatching(false); setSelected(new Set()); return; }
        setSelected((prev) => {
            const next = new Set(prev);
            items.forEach((i) => (checked ? next.add(i.id) : next.delete(i.id)));
            return next;
        });
    };

    const toggleOne = (id: string, checked: boolean) => {
        if (allMatching) {
            // Leaving "all matching" mode: fall back to the visible page minus this row.
            setAllMatching(false);
            setSelected(new Set(items.map((i) => i.id).filter((i) => i !== id || checked)));
            return;
        }
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id); else next.delete(id);
            return next;
        });
    };

    const addMutation = useMutation({
        mutationFn: () => allMatching ? bulkAdd({ all: true, search: q || undefined }) : bulkAdd({ ids: [...selected] }),
        onSuccess: (res) => {
            const ids = allMatching ? undefined : [...selected];
            toast({ title: res.added ? `Added ${res.added} ${res.added === 1 ? noun : nounPlural}` : `Nothing new to add` });
            setSelected(new Set());
            setAllMatching(false);
            list.refetch();
            onAdded({ added: res.added, ids });
        },
        onError: (error: Error) => toast({ title: `Could not add ${nounPlural}`, description: error.message, variant: 'destructive' }),
    });

    const showSelectAllBanner = useMemo(() => pageAllSelected && !allMatching && total > items.length, [pageAllSelected, allMatching, total, items.length]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0))); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            const item = items[active];
            if (open && item) toggleOne(item.id, !(allMatching || selected.has(item.id)));
        }
        else if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div ref={rootRef} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-start gap-2">
                <FolderPlus className="h-5 w-5 text-primary mt-0.5" />
                <div>
                    <h3 className="text-sm font-medium">Add existing {nounPlural}</h3>
                    <p className="text-xs text-muted-foreground">
                        Click the box to browse approved {nounPlural} you don&apos;t have yet, or type to filter. Tick as many as you like, then add them in one go.
                    </p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    className="pl-8 pr-9"
                    placeholder={`Search ${nounPlural}…`}
                    value={search}
                    role="combobox"
                    aria-expanded={open}
                    onFocus={() => setOpen(true)}
                    onClick={() => setOpen(true)}
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                    onKeyDown={onKeyDown}
                />
                <button type="button" tabIndex={-1} aria-label="Toggle list" className="absolute right-2 top-2 text-muted-foreground" onClick={() => setOpen((o) => !o)}>
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-md border bg-popover shadow-lg">
                        <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={pageAllSelected ? true : pageSomeSelected ? 'indeterminate' : false}
                                    onCheckedChange={(c) => togglePage(c === true)}
                                    disabled={items.length === 0}
                                />
                                <span>Select all on this page</span>
                            </label>
                            <span className="text-muted-foreground tabular-nums">
                                {list.isLoading ? 'Loading…' : `${total.toLocaleString()} available`}
                            </span>
                        </div>

                        {showSelectAllBanner && (
                            <div className="bg-primary/10 px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap">
                                <span>All {items.length} on this page are selected.</span>
                                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setAllMatching(true)}>
                                    Select all {total.toLocaleString()} {q ? `matching “${q}”` : nounPlural}
                                </Button>
                            </div>
                        )}
                        {allMatching && (
                            <div className="bg-primary/10 px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap">
                                <span>All {total.toLocaleString()} {q ? `matching “${q}” ` : ''}{nounPlural} are selected.</span>
                                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => { setAllMatching(false); setSelected(new Set()); }}>
                                    Clear selection
                                </Button>
                            </div>
                        )}

                        <div className="max-h-64 overflow-y-auto divide-y" role="listbox">
                            {list.isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none" />)
                            ) : items.length === 0 ? (
                                <p className="p-6 text-center text-sm text-muted-foreground">
                                    {q ? `No ${nounPlural} match “${q}”.` : `You already have every approved ${noun}.`}
                                </p>
                            ) : (
                                items.map((item, idx) => {
                                    const checked = allMatching || selected.has(item.id);
                                    return (
                                        <label
                                            key={item.id}
                                            role="option"
                                            aria-selected={checked}
                                            onMouseEnter={() => setActive(idx)}
                                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${idx === active ? 'bg-muted' : 'hover:bg-muted/50'}`}
                                        >
                                            <Checkbox checked={checked} onCheckedChange={(c) => toggleOne(item.id, c === true)} />
                                            {item.imageUrl ? (
                                                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                                                    <Image src={item.imageUrl} alt="" fill sizes="36px" className="object-cover" />
                                                </div>
                                            ) : (
                                                <div className="h-9 w-9 shrink-0 rounded-md bg-muted" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{item.title}</p>
                                                {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                            <div className="flex items-center gap-1">
                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="px-2 text-xs text-muted-foreground tabular-nums">Page {page} of {totalPages}</span>
                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>Done</Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                    {selectedCount > 0 ? `${selectedCount.toLocaleString()} selected` : 'Nothing selected yet'}
                </span>
                <Button type="button" disabled={selectedCount === 0 || addMutation.isPending} onClick={() => addMutation.mutate()}>
                    {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedCount > 0 ? `Add ${selectedCount.toLocaleString()} selected` : 'Add selected'}
                </Button>
            </div>
        </div>
    );
}
