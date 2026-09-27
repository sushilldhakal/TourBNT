'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { getDestinationById } from '@/lib/api/destinations';

interface DestinationDetail {
    id?: string;
    _id?: string;
    name?: string;
    title?: string;
    description?: string;
    country?: string;
    region?: string;
    city?: string;
    image?: string;
    coverImage?: string;
    tours?: Array<{ _id?: string; id?: string; title?: string; slug?: string }>;
}

export default function SingleDestinationPage() {
    const params = useParams();
    const destinationId = typeof params.destinationId === 'string' ? params.destinationId : '';
    const [destination, setDestination] = useState<DestinationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!destinationId) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        getDestinationById(destinationId)
            .then((data: DestinationDetail) => {
                if (!cancelled) setDestination(data);
            })
            .catch(() => {
                if (!cancelled) setError('Destination not found');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [destinationId]);

    if (loading) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center text-muted-foreground">Loading...</div>
            </div>
        );
    }
    if (error || !destination) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-muted-foreground mb-4">{error ?? 'Destination not found'}</p>
                    <Link href="/destinations" className="text-primary hover:text-primary/80">← Back to Destinations</Link>
                </div>
            </div>
        );
    }

    const name = (destination as { name?: string }).name ?? (destination as { title?: string }).title ?? 'Destination';
    const img = (destination as { image?: string }).image ?? (destination as { coverImage?: string }).coverImage;
    const tours = (destination as { tours?: Array<{ _id?: string; id?: string; title?: string; slug?: string }> }).tours ?? [];

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <Link href="/destinations" className="text-primary hover:text-primary/80 mb-6 inline-block">
                ← Back to Destinations
            </Link>

            <div className="mb-12">
                <div className="aspect-[21/9] bg-muted rounded-lg overflow-hidden relative mb-6">
                    {img ? (
                        <Image
                            src={img}
                            alt={name}
                            fill
                            className="object-cover"
                            sizes="100vw"
                        />
                    ) : null}
                </div>
                <h1 className="text-4xl font-bold mb-4">{name}</h1>
                {(destination as { description?: string }).description && (
                    <p className="text-xl text-muted-foreground">{(destination as { description: string }).description}</p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2">
                    <div className="prose max-w-none">
                        <h2 className="text-2xl font-semibold mb-4">About this Destination</h2>
                        <p className="text-muted-foreground">
                            {(destination as { description?: string }).description ?? 'No description available.'}
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="font-semibold mb-4">Quick Facts</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Country:</span>
                                <span className="font-medium">{(destination as { country?: string }).country ?? '-'}</span>
                            </div>
                            {(destination as { region?: string }).region && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Region:</span>
                                    <span className="font-medium">{(destination as { region: string }).region}</span>
                                </div>
                            )}
                            {(destination as { city?: string }).city && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">City:</span>
                                    <span className="font-medium">{(destination as { city: string }).city}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-semibold mb-6">Tours in this Destination</h2>
                {tours.length === 0 ? (
                    <div className="text-center py-16 bg-card border border-border rounded-lg">
                        <p className="text-muted-foreground">No tours available for this destination yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tours.map((tour) => {
                            const tid = (tour as { id?: string }).id ?? (tour as { _id?: string })._id ?? '';
                            const tTitle = (tour as { title?: string }).title ?? 'Tour';
                            const slug = (tour as { slug?: string }).slug;
                            const href = slug ? `/tours/${slug}` : `/tours/${tid}`;
                            return (
                                <Link
                                    key={tid}
                                    href={href}
                                    className="block bg-card border border-border rounded-lg p-4 hover:shadow-md transition"
                                >
                                    <h3 className="font-semibold hover:text-primary">{tTitle}</h3>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
