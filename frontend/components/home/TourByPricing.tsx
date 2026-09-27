"use client";

import { useLatestTours } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
    CarouselWithPlugins,
    CarouselApi,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel-with-plugins-lazy";
import { getLatestTours } from "@/lib/api/tours";
import type { Tour } from "@/types/types";

const TourByPricing = () => {
    const [progress, setProgress] = useState(0);
    const [api, setApi] = useState<CarouselApi | null>(null);

    const { data } = useLatestTours();

    useEffect(() => {
        if (!api) return;

        const handleSelect = () => {
            setProgress((api.selectedScrollSnap() / (api.scrollSnapList().length - 1)) * 100);
        };

        api.on("select", handleSelect);
        handleSelect();

        return () => {
            api.off("select", handleSelect);
        };
    }, [api]);

    const toursList = Array.isArray(data?.data) ? data?.data : (data as { data?: { tours?: Tour[] }; tours?: Tour[] })?.data?.tours ?? (data as { tours?: Tour[] })?.tours ?? [];
    const sortedTours = toursList.length
        ? [...toursList].sort((a: Tour, b: Tour) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)
        : [];

    return (
        <div className="relative">
            <div className="mb-6">
                <h2 className="text-xl font-bold">Offered Tours</h2>
            </div>
            <div className="flex flex-row relative">
                <div className="flex-1 pr-3">
                    <CarouselWithPlugins
                        setApi={setApi}
                        opts={{
                            align: "start",
                            loop: true,
                            axis: 'y',
                            dragFree: true,
                        }}
                        autoplayConfig={{ playOnInit: true, delay: 2000 }}
                        autoScrollConfig={{
                            playOnInit: true,
                            stopOnInteraction: false,
                            stopOnMouseEnter: false,
                            speed: 0.5,
                        }}
                        orientation="vertical"
                        className="w-full"
                    >
                        <CarouselContent className="-mt-1 h-[600px]">
                            {sortedTours?.map((tour: Tour, index: number) => (
                                <CarouselItem key={index} className="pt-1 basis-auto !h-[100px] !max-h-[100px]">
                                    <Link href={`/tours/${tour.id}`}>
                                        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition rounded-md">
                                            <div className="relative flex-shrink-0">
                                                <Image
                                                    src={tour.coverImage ?? ''}
                                                    alt={tour.title}
                                                    width={60}
                                                    height={60}
                                                    className="object-cover w-[60px] h-[60px] rounded"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 flex justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold line-clamp-2 mb-2">
                                                        {tour.title}
                                                    </h3>
                                                    <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded inline-block">
                                                        20% Off
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end justify-between">
                                                    <p className="text-xs text-muted-foreground">
                                                        {Array.isArray(tour.author) && typeof tour.author[0] === 'object' && tour.author[0] && 'name' in tour.author[0]
                                                            ? (tour.author[0] as { name?: string }).name
                                                            : typeof tour.author === 'object' && tour.author && 'name' in tour.author
                                                                ? (tour.author as { name?: string }).name
                                                                : ''}
                                                    </p>
                                                    <p className="text-sm font-bold">
                                                        ${tour.price}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </CarouselWithPlugins>
                </div>
                <div className="w-1 bg-muted rounded-full overflow-hidden">
                    <div
                        className="w-full bg-primary transition-all duration-1000 ease-in-out rounded-full"
                        style={{ height: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default TourByPricing;
