"use client";

import { useHomeFeed } from "@/lib/queries/useHome";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, Building } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import RichTextRenderer from "@/components/RichTextRenderer";
import { ContentContainer } from "@/components/layout/PublicLayoutClient";
import { Destination } from "@/types/types";
import Image from "next/image";



export default function DestinationTour() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);

    const { data: feed, isPending } = useHomeFeed();

    const sortedDestinations = useMemo(() => {
        const items = feed?.destinations ?? [];
        return [...items]
            .sort((a: Destination, b: Destination) => {
                if (a.popularity && b.popularity) {
                    return b.popularity - a.popularity;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .slice(0, 8);
    }, [feed?.destinations]);

    // Some APIs return DestinationTypes shape (with id/region/city). We keep runtime-safe access here.
    type DestinationUi = Destination & {
        id?: string;
        region?: string;
        city?: string;
    };
    const uiDestinations = sortedDestinations as unknown as DestinationUi[];

    useEffect(() => {
        if (!uiDestinations.length) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % uiDestinations.length);
            setAnimationKey((prev) => prev + 1);
        }, 5000);

        return () => clearInterval(interval);
    }, [uiDestinations.length]);

    if (isPending) {
        return (
            <div className="py-16 w-full">
                <ContentContainer className="px-4 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Popular Destinations</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-muted rounded-lg h-64"></div>
                        ))}
                    </div>
                </ContentContainer>
            </div>
        );
    }

    return (
        <div className="py-16 bg-secondary/10 w-full">
            <ContentContainer className="px-4 transition-all duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <Globe className="text-primary h-6 w-6" />
                        <h2 className="text-2xl font-bold">Explore Destinations</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/destinations">
                            <Button variant="default" size="sm">
                                View All Destinations
                            </Button>
                        </Link>
                    </div>
                </div>

                {uiDestinations.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1: list (3) */}
                        <div className="space-y-3">
                            {uiDestinations.slice(0, 3).map((destination, idx) => {
                                const index = idx;
                                const isActive = index === activeIndex;
                                return (
                                    <button
                                        key={destination.id ?? destination.id ?? `${destination.name}-${idx}`}
                                        type="button"
                                        onClick={() => {
                                            setActiveIndex(index);
                                            setAnimationKey((prev) => prev + 1);
                                        }}
                                        className={`w-full text-left rounded-xl border bg-background p-4 transition-all ${isActive ? "ring-2 ring-primary/50 shadow-sm" : "hover:shadow-sm"}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-foreground line-clamp-1">
                                                    {destination.name}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                    <RichTextRenderer
                                                        content={destination.description}
                                                        className="[&>p]:mb-0 [&>p]:leading-relaxed"
                                                    />
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {destination.country}
                                                    </span>
                                                    {destination.city && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Building className="h-3 w-3" />
                                                            {destination.city}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {destination.featuredTours?.length ? (
                                                <Badge variant="secondary" className="shrink-0">
                                                    {destination.featuredTours.length} tours
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Column 2: list (3) */}
                        <div className="space-y-3">
                            {uiDestinations.slice(3, 6).map((destination, idx) => {
                                const index = idx + 3;
                                const isActive = index === activeIndex;
                                return (
                                    <button
                                        key={destination.id ?? destination.id ?? `${destination.name}-${idx}-b`}
                                        type="button"
                                        onClick={() => {
                                            setActiveIndex(index);
                                            setAnimationKey((prev) => prev + 1);
                                        }}
                                        className={`w-full text-left rounded-xl border bg-background p-4 transition-all ${isActive ? "ring-2 ring-primary/50 shadow-sm" : "hover:shadow-sm"}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-foreground line-clamp-1">
                                                    {destination.name}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                    <RichTextRenderer
                                                        content={destination.description}
                                                        className="[&>p]:mb-0 [&>p]:leading-relaxed"
                                                    />
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {destination.country}
                                                    </span>
                                                    {destination.region && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Globe className="h-3 w-3" />
                                                            {destination.region}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {destination.featuredTours?.length ? (
                                                <Badge variant="secondary" className="shrink-0">
                                                    {destination.featuredTours.length} tours
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Column 3: image slider */}
                        <Card className="overflow-hidden p-0 border-0 shadow-lg">
                            <div className="relative h-[360px] lg:h-full min-h-[360px]">
                                <div
                                    key={animationKey}
                                    className="absolute inset-0 transition-opacity duration-500"
                                >
                                    <Image
                                        src={uiDestinations[activeIndex]?.coverImage}
                                        alt={uiDestinations[activeIndex]?.name ?? "Destination"}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 33vw"
                                        priority={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-white font-semibold text-lg line-clamp-1">
                                                {uiDestinations[activeIndex]?.name}
                                            </div>
                                            <div className="mt-1 text-white/80 text-sm line-clamp-2">
                                                <RichTextRenderer
                                                    content={uiDestinations[activeIndex]?.description}
                                                    className="text-sm [&>p]:mb-0 [&>p]:leading-relaxed [&>p]:text-white/80"
                                                />
                                            </div>
                                        </div>
                                        <Link
                                            href={`/destinations/${uiDestinations[activeIndex]?.id ?? uiDestinations[activeIndex]?.id}`}
                                            className="shrink-0"
                                        >
                                            <Button variant="secondary" className="backdrop-blur-sm">
                                                Explore
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </ContentContainer>
        </div>
    );
}
