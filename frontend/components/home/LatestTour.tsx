"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, ThumbsUp } from "lucide-react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import { getLatestTours } from "@/lib/api/tours";
import { useLayout } from "@/providers/LayoutProvider";

interface Tour {
    _id: string;
    title: string;
    coverImage: string;
    duration: string;
    outline: string;
    price: number;
    createdAt: string;
    saleEnabled?: boolean;
    salePrice?: number;
    pricingOptions?: Array<{
        price: number;
        discount?: {
            discountEnabled: boolean;
            discountDateRange?: { from: string; to: string };
            percentageOrPrice?: boolean;
            discountPercentage?: number;
            discountPrice?: number;
        };
    }>;
}

const LatestTour = () => {
    const [api, setApi] = useState<any>();
    const { isFullWidth } = useLayout();
    useEffect(() => {
        if (!api) return;
        api.on("select", () => { });
    }, [api]);

    const { data } = useQuery({
        queryKey: ['latestTours'],
        queryFn: getLatestTours,
        staleTime: 5 * 60 * 1000,
    });

    const getTourPricing = (tour: Tour) => {
        let originalPrice = tour.price || 0;
        let displayPrice = originalPrice;
        let hasDiscount = false;
        let discountPercentage = 0;

        if (tour.saleEnabled && tour.salePrice) {
            hasDiscount = true;
            displayPrice = tour.salePrice;
            discountPercentage = Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
        } else if (tour.pricingOptions && tour.pricingOptions.length > 0) {
            const firstOption = tour.pricingOptions[0];
            if (firstOption.price) {
                originalPrice = firstOption.price;
                displayPrice = firstOption.price;

                const discountData = firstOption.discount;
                if (discountData?.discountEnabled && discountData.discountDateRange) {
                    const now = new Date();
                    const discountStart = new Date(discountData.discountDateRange.from);
                    const discountEnd = new Date(discountData.discountDateRange.to);

                    if (now >= discountStart && now <= discountEnd) {
                        hasDiscount = true;
                        if (discountData.percentageOrPrice) {
                            discountPercentage = discountData.discountPercentage || 0;
                            displayPrice = originalPrice - (originalPrice * discountPercentage / 100);
                        } else {
                            displayPrice = discountData.discountPrice || originalPrice;
                            discountPercentage = Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
                        }
                    }
                }
            }
        }

        return { originalPrice, displayPrice, hasDiscount, discountPercentage };
    };

    const sortedTours = data?.data?.tours
        ? data.data.tours
            .sort((a: Tour, b: Tour) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
        : [];

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <ThumbsUp className="text-primary" />
                    <h2 className="text-3xl font-bold ml-2">TOP VACATION TOURS</h2>
                </div>
                <div className="flex items-center">
                    <Link href="/tours" className="text-primary font-medium mr-4">
                        VIEW ALL
                    </Link>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="border-border hover:bg-muted"
                            onClick={() => api?.scrollPrev()}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="border-border hover:bg-muted"
                            onClick={() => api?.scrollNext()}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <Carousel
                setApi={setApi}
                opts={{ align: "start" }}
                className="w-full"
            >
                <CarouselContent className="-ml-4">
                    {sortedTours?.map((tour: Tour, index: number) => (
                        <CarouselItem key={index} className={`pl-4 ${isFullWidth ? 'md:basis-1/2 lg:basis-1/2 xl:basis-1/3' : 'md:basis-1/2 lg:basis-1/2'}`}>
                            <div className="bg-secondary rounded-md overflow-hidden shadow-xs border" >
                                <Link href={`/tours/${tour._id}`}>
                                    <div className="relative h-[420px] overflow-hidden">
                                        <img
                                            src={tour.coverImage}
                                            alt={tour.title}
                                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                    </div>

                                    <div className="p-5">
                                        <h3 className="text-lg font-semibold mb-2">{tour.title}</h3>

                                        <div className="flex items-center text-muted-foreground mb-3">
                                            <Calendar size={16} className="mr-1" />
                                            <span>{tour.duration}</span>
                                        </div>

                                        <p className="text-muted-foreground mb-4 line-clamp-2">{tour.outline}</p>

                                        <div className="flex items-center mb-4">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <svg
                                                    key={star}
                                                    className="w-4 h-4 text-primary fill-current"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
                                                </svg>
                                            ))}
                                            <span className="text-xs text-muted-foreground ml-1">(2 REVIEW)</span>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t">
                                            {(() => {
                                                const { originalPrice, displayPrice, hasDiscount, discountPercentage } = getTourPricing(tour);
                                                return (
                                                    <>
                                                        <div>
                                                            <span className="text-muted-foreground text-sm">From</span>
                                                        </div>
                                                        {hasDiscount ? (
                                                            <div className="flex flex-col items-end">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-muted-foreground line-through text-sm">
                                                                        ${originalPrice.toFixed(0)}
                                                                    </span>
                                                                    <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded">
                                                                        -{discountPercentage}%
                                                                    </span>
                                                                </div>
                                                                <span className="text-green-600 font-bold text-xl">
                                                                    ${displayPrice.toFixed(0)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center">
                                                                <span className="text-primary font-bold text-xl">
                                                                    ${displayPrice.toFixed(0)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </div>
    );
};

export default LatestTour;
