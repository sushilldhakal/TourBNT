"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getApprovedReviews } from "@/lib/api";
import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import Autoplay from "embla-carousel-autoplay";
import { Review } from "@/lib/types";
import { useLayout } from '@/providers/LayoutProvider';
import Link from "next/link";

const ReviewSlider = () => {
    const { isFullWidth } = useLayout();
    const [api, setApi] = React.useState<CarouselApi>();
    const [current, setCurrent] = React.useState(0);
    const [count, setCount] = React.useState(0);

    const { data, isLoading, isError } = useQuery<{ reviews: Review[] }>({
        queryKey: ['reviews'],
        queryFn: () => getApprovedReviews() as Promise<{ reviews: Review[] }>,
        staleTime: 5 * 60 * 1000,
    });

    const approvedReviews = React.useMemo(() => {
        if (!data?.reviews) return [];
        return data.reviews.sort((a: Review, b: Review) => {
            if (a.likes && b.likes && a.likes !== b.likes) return b.likes - a.likes;
            if (a.views && b.views && a.views !== b.views) return b.views - a.views;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }).slice(0, 9);
    }, [data?.reviews]);

    const renderStars = (rating: number) => {
        return Array(5).fill(0).map((_, i) => (
            <Star key={i} className={cn("w-4 h-4", i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
        ));
    };

    React.useEffect(() => {
        if (!api) return;
        setCount(api.scrollSnapList().length);
        setCurrent(api.selectedScrollSnap());
        api.on("select", () => setCurrent(api.selectedScrollSnap()));
    }, [api]);

    if (isLoading) {
        return (
            <div className="py-16 bg-primary/5">
                <div className={`mx-auto px-4 transition-all duration-300 ${isFullWidth ? 'max-w-full' : 'max-w-7xl'}`}>
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold">What Our Customers Say</h2>
                        <p className="text-muted-foreground mt-2">Read testimonials from our satisfied travelers</p>
                    </div>
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="w-64 h-32 bg-muted rounded-lg mb-4"></div>
                            <div className="w-40 h-4 bg-muted rounded mb-2"></div>
                            <div className="w-20 h-4 bg-muted rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="py-16 bg-primary/5">
                <div className={`mx-auto px-4 transition-all duration-300 ${isFullWidth ? 'max-w-full' : 'max-w-7xl'}`}>
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold">What Our Customers Say</h2>
                        <p className="text-muted-foreground mt-2">Read testimonials from our satisfied travelers</p>
                    </div>
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <p className="text-muted-foreground">Unable to load reviews at this time.</p>
                            <p className="text-sm text-muted-foreground mt-2">Please check back later.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (approvedReviews.length === 0) {
        return (
            <div className="py-16 bg-primary/5">
                <div className={`mx-auto px-4 transition-all duration-300 ${isFullWidth ? 'max-w-full' : 'max-w-7xl'}`}>
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold">What Our Customers Say</h2>
                        <p className="text-muted-foreground mt-2">Read testimonials from our satisfied travelers</p>
                    </div>
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <p className="text-muted-foreground">No reviews available yet.</p>
                            <p className="text-sm text-muted-foreground mt-2">Be the first to share your experience!</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-16 bg-primary/5">
            <div className={`mx-auto px-4 transition-all duration-300 ${isFullWidth ? 'max-w-full' : 'max-w-7xl'}`}>
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold">What Our Customers Say</h2>
                    <p className="text-muted-foreground mt-2">Read testimonials from our satisfied travelers</p>
                </div>
                <div className="relative mx-auto">
                    <Carousel setApi={setApi} className="w-full" opts={{ loop: true, align: "center" }} plugins={[Autoplay({ delay: 5000 })]}>
                        <CarouselContent>
                            {approvedReviews.map((review: Review, index: number) => (
                                <CarouselItem key={review._id} className="md:basis-2/3 lg:basis-2/5 pl-4">
                                    <div className={cn("transition-transform duration-300 ease-in-out h-full", current === index ? "scale-100 opacity-100" : "scale-75 opacity-50")}>
                                        <Card className="h-full shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden pt-0 border border-primary/10">
                                            <CardContent className="p-0">
                                                <div className="h-3 pb-3 bg-gradient-to-r from-primary/80 to-primary/40"></div>
                                                <div className="p-6 relative">
                                                    <div className="absolute -top-2 -right-2 w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-xs">
                                                        <Quote className="h-5 w-5 text-primary/60" />
                                                    </div>
                                                    <div className="flex mb-4">{renderStars(review.rating || 0)}</div>
                                                    <p className="text-muted-foreground text-base mb-6 italic line-clamp-4 leading-relaxed">&quot;{review.comment || 'No comment provided.'}&quot;</p>
                                                    <div className="w-16 h-1 bg-gradient-to-r from-primary/60 to-primary/20 rounded-full mb-4"></div>
                                                    <div className="flex items-center">
                                                        <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-md">
                                                            <AvatarImage src={review.user?.profilePicture} alt={review.user?.name || 'User'} />
                                                            <AvatarFallback className="bg-primary/10 text-primary font-medium">{review.user?.name ? review.user.name.charAt(0) : 'U'}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="ml-3">
                                                            <p className="font-semibold text-foreground">{review.user?.name || 'Anonymous'}</p>
                                                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                                                {review.tourId ? (
                                                                    <Link href={`/tours/${review.tourId}`} className="font-medium text-primary/80 hover:underline">
                                                                        {review.tourTitle || 'Unknown Tour'}
                                                                    </Link>
                                                                ) : (
                                                                    <span className="font-medium text-primary/80">{review.tourTitle || 'Unknown Tour'}</span>
                                                                )}
                                                                <span className="mx-2">•</span>
                                                                <span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                    </Carousel>
                    <div className="flex justify-center gap-3 mt-8">
                        {Array.from({ length: count }).map((_, index) => (
                            <button key={index} className={cn("relative flex items-center justify-center transition-all duration-500 ease-in-out", current === index ? "scale-110" : "hover:scale-105")} onClick={() => api?.scrollTo(index)} aria-label={`Go to slide ${index + 1}`}>
                                {current === index ? (
                                    <div className="h-5 w-5 rounded-full bg-primary shadow-md transition-all duration-500 ease-in-out"></div>
                                ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-primary/30 flex items-center justify-center transition-all duration-500 ease-in-out">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/50 transition-all duration-500 ease-in-out"></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewSlider;
