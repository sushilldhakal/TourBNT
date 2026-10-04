import Link from 'next/link';
import Image from 'next/image';
import { getAllDestinations } from '@/lib/api/destinations';
import { listFrom } from '@/lib/api/apiClient';

// Serve cached HTML and refresh it in the background at most once a minute (ISR).
export const revalidate = 60;

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

// Server component: the HTML arrives with the data in it, no client-side fetch round trip.
export default async function DestinationsPage() {
    let destinations: DestinationItem[] = [];
    try {
        destinations = listFrom<DestinationItem>(await getAllDestinations(), 'data', 'items');
    } catch {
        destinations = [];
    }

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Explore Destinations</h1>
                <p className="text-xl text-muted-foreground">
                    Discover amazing places around the world
                </p>
            </div>

            {destinations.length === 0 ? (
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
