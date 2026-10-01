'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Building2, MapPin, Search, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAgencies } from '@/lib/api/tours';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

export default function AgenciesPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebouncedValue(search.trim());

    const { data, isLoading, isError } = useQuery({
        queryKey: ['agencies', { q, page }],
        queryFn: () => getAgencies({ search: q || undefined, page, limit: 24 }),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });
    const agencies = data?.items ?? [];

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Tour Agencies</h1>
                <p className="text-xl text-muted-foreground">The local operators behind our tours</p>
            </div>

            <div className="relative mb-8 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search agencies…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-muted-foreground">Loading...</div>
            ) : isError || agencies.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-xl text-muted-foreground mb-4">{q ? `No agencies match “${q}”` : 'No agencies available at the moment'}</p>
                    <Link href="/" className="text-primary hover:text-primary/80">Return to Home</Link>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {agencies.map((a) => (
                            <Link key={a.id} href={`/agencies/${a.id}`} className="group bg-card border border-border rounded-lg p-5 hover:shadow-md transition">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Building2 className="h-6 w-6" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-semibold group-hover:text-primary truncate">{a.name}</h2>
                                        {a.location && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{a.location}</p>}
                                    </div>
                                </div>
                                {a.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{a.description}</p>}
                                <div className="mt-4 flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-1">
                                        {a.rating != null ? (<><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span className="font-semibold">{a.rating.toFixed(1)}</span><span className="text-muted-foreground">({a.reviewCount})</span></>) : <span className="text-muted-foreground">No reviews yet</span>}
                                    </span>
                                    <span className="text-muted-foreground">{a.tourCount} tour{a.tourCount === 1 ? '' : 's'}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {(data?.totalPages ?? 1) > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-3">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                            <span className="text-sm text-muted-foreground">Page {page} of {data?.totalPages}</span>
                            <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
