'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllDestinations } from '@/lib/api/destinations';

interface DestinationItem {
    id?: string;
    _id?: string;
    name?: string;
    title?: string;
    description?: string;
    country?: string;
    image?: string;
    coverImage?: string;
}

export default function DestinationsPage() {
    const [destinations, setDestinations] = useState<DestinationItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getAllDestinations()
            .then((res: { data?: DestinationItem[]; items?: DestinationItem[] } | DestinationItem[]) => {
                if (cancelled) return;
                const raw = Array.isArray(res) ? res : (res as { data?: DestinationItem[]; items?: DestinationItem[] });
                const list = raw?.data ?? raw?.items ?? (Array.isArray(res) ? res : []);
                setDestinations(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (!cancelled) setDestinations([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Explore Destinations</h1>
                <p className="text-xl text-muted-foreground">
                    Discover amazing places around the world
                </p>
            </div>

            {loading ? (
                <div className="text-center py-16 text-muted-foreground">Loading...</div>
            ) : destinations.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-xl text-muted-foreground mb-4">No destinations available at the moment</p>
                    <Link href="/" className="text-primary hover:text-primary/80">
                        Return to Home
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {destinations.map((dest) => {
                        const id = (dest as { id?: string }).id ?? (dest as { _id?: string })._id ?? '';
                        const name = (dest as { name?: string }).name ?? (dest as { title?: string }).title ?? 'Destination';
                        const img = (dest as { image?: string }).image ?? (dest as { coverImage?: string }).coverImage;
                        return (
                            <Link
                                key={id}
                                href={`/destinations/${id}`}
                                className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition"
                            >
                                <div className="aspect-[4/3] bg-muted relative">
                                    {img ? (
                                        <Image
                                            src={img}
                                            alt={name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition"
                                            sizes="(max-width: 768px) 100vw, 25vw"
                                        />
                                    ) : (
                                        <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                            No image
                                        </span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h2 className="font-semibold text-lg group-hover:text-primary">{name}</h2>
                                    {(dest as { country?: string }).country && (
                                        <p className="text-sm text-muted-foreground mt-1">{(dest as { country: string }).country}</p>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
