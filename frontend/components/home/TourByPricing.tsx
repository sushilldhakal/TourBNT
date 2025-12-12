"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import AutoScroll from 'embla-carousel-auto-scroll';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";
import { ThumbsUp } from "lucide-react";
import { getLatestTours } from "@/lib/api/tourApi";

interface TourItem {
    _id: string;
    title: string;
    coverImage: string;
    price: number;
    author: Array<{ _id: string; name: string; roles: string }>;
    createdAt: string;
}

const TourByPricing = () => {
    const [progress, setProgress] = useState(0);
    const [api, setApi] = useState<any>();

    const { data } = useQuery({
        queryKey: ['latestTours'],
        queryFn: getLatestTours,
        staleTime: 5 * 60 * 1000,
    });

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

    const sortedTours = data?.data?.tours
        ? data.data.tours
            .sort((a: TourItem, b: TourItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
        : [];

    return (
        <div className="relative">
            <div className="mb-6">
                <h2 className="text-xl font-bold">Offered Tours</h2>
            </div>
            <div className="flex flex-row relative">
                <div className="flex-1 pr-3">
                    <Carousel
                        setApi={setApi}
                        opts={{
                            align: "start",
                            loop: true,
                        }}
                        plugins={[
                            Autoplay({
                                playOnInit: true,
                                delay: 2000,
                            }),
                            AutoScroll({
                                playOnInit: true,
                                stopOnInteraction: false,
                                stopOnMouseEnter: false,
                                speed: 0.5
                            }),
                        ]}
                        orientation="vertical"
                        className="w-full"
                    >
                        <CarouselContent className="-mt-1 h-[600px]">
                            {sortedTours?.map((tour: TourItem, index: number) => (
                                <CarouselItem key={index} className="pt-1 basis-auto">
                                    <Link href={`/tours/${tour._id}`}>
                                        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition rounded-md">
                                            <div className="relative flex-shrink-0">
                                                <img
                                                    src={tour.coverImage}
                                                    alt={tour.title}
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
                                                        {tour.author[0]?.name}
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
                    </Carousel>
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
