"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronLeft, ChevronRight, Globe, Building } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useLayout } from '@/providers/LayoutProvider';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import RichTextRenderer from "@/components/RichTextRenderer";
import { getApprovedDestinations } from "@/lib/api/globalApi";

interface Destination {
    _id: string;
    name: string;
    coverImage: string;
    description: string;
    country: string;
    region?: string;
    city?: string;
    popularity?: number;
    featuredTours?: any[];
    createdAt: string;
}

export default function DestinationTour() {
    const { isFullWidth } = useLayout();
    const [api, setApi] = useState<CarouselApi | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['approvedDestinations'],
        queryFn: getApprovedDestinations,
        staleTime: 5 * 60 * 1000,
    });

    const sortedDestinations = useMemo(() => {
        if (!data?.data || !Array.isArray(data.data)) return [];
        return [...data.data]
            .sort((a: Destination, b: Destination) => {
                if (a.popularity && b.popularity) {
                    return b.popularity - a.popularity;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .slice(0, 8);
    }, [data?.data]);

    useEffect(() => {
        if (!api) return;
        const handleSelect = () => { };
        api.on("select", handleSelect);
        return () => {
            api.off("select", handleSelect);
        };
    }, [api]);

    if (isLoading) {
        return (
            <div className="py-16">
                <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Popular Destinations</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-muted rounded-lg h-64"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-16 bg-secondary/10">
            <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
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
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => api?.scrollPrev()}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => api?.scrollNext()}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <Carousel
                    setApi={setApi}
                    className="w-full"
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                >
                    <CarouselContent className="-ml-2 md:-ml-4">
                        {sortedDestinations.map((destination: Destination) => (
                            <CarouselItem key={destination._id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/4">
                                <Card className="overflow-hidden p-0 h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                                    <div className="relative h-80 overflow-hidden">
                                        {/* Background Image */}
                                        <img
                                            src={destination.coverImage}
                                            alt={destination.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20"></div>

                                        {/* Tours Badge */}
                                        {destination.featuredTours && destination.featuredTours.length > 0 && (
                                            <Badge className="absolute top-3 right-3 bg-primary/90 hover:bg-primary backdrop-blur-sm">
                                                {destination.featuredTours.length} Tours
                                            </Badge>
                                        )}

                                        {/* Content Overlay */}
                                        <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                            {/* Destination Name */}
                                            <h3 className="font-bold text-xl text-white mb-2 line-clamp-2 drop-shadow-lg">
                                                {destination.name}
                                            </h3>

                                            {/* Description */}
                                            <div className="text-white/90 text-sm mb-3 line-clamp-2 drop-shadow-md">
                                                <RichTextRenderer
                                                    content={destination.description}
                                                    className="text-sm [&>p]:mb-0 [&>p]:leading-relaxed [&>p]:text-white/90"
                                                />
                                            </div>

                                            {/* Location Info */}
                                            <div className="flex flex-wrap gap-2 text-xs text-white/80 mb-3">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{destination.country}</span>
                                                </div>
                                                {destination.region && (
                                                    <>
                                                        <span>•</span>
                                                        <div className="flex items-center gap-1">
                                                            <Globe className="h-3 w-3" />
                                                            <span>{destination.region}</span>
                                                        </div>
                                                    </>
                                                )}
                                                {destination.city && (
                                                    <>
                                                        <span>•</span>
                                                        <div className="flex items-center gap-1">
                                                            <Building className="h-3 w-3" />
                                                            <span>{destination.city}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Explore Button */}
                                            <Link href={`/destinations/${destination._id}`} className="w-full">
                                                <Button
                                                    variant="secondary"
                                                    className="w-full text-foreground backdrop-blur-sm"
                                                >
                                                    Explore Destination
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </div>
        </div>
    );
}
