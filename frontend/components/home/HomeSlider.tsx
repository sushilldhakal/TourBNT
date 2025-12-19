"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import RichTextRenderer from "@/components/RichTextRenderer";
import { getLatestTours } from "@/lib/api/tours";

// Define the tour item interface
interface TourItem {
    _id: string;
    title: string;
    coverImage: string;
    description?: string;
    createdAt: string;
    [key: string]: any;
}

const HomeSlider = () => {
    const { data } = useQuery({
        queryKey: ['latestTours'],
        queryFn: getLatestTours,
        staleTime: 5 * 60 * 1000,
    });

    const [current, setCurrent] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [autoplayEnabled, setAutoplayEnabled] = useState(true);
    const slideInterval = 8000;

    const sortedTours = useMemo(() => {
        if (!data?.data?.tours) return [];

        return [...data.data.tours]
            .sort((a: TourItem, b: TourItem) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [data?.data?.tours]);

    useEffect(() => {
        if (!autoplayEnabled || sortedTours.length === 0) return;

        const startTime = Date.now();
        const endTime = startTime + slideInterval;

        const intervalId = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;
            const newProgress = (elapsed / slideInterval) * 100;

            if (now >= endTime) {
                setCurrent((prev) => (prev + 1) % sortedTours.length);
                setProgress(0);
                clearInterval(intervalId);
            } else {
                setProgress(newProgress);
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, [autoplayEnabled, sortedTours.length, current]);

    useEffect(() => {
        setProgress(0);
        const handleScroll = () => {
            const parallaxContainers = document.querySelectorAll('.parallax-container');
            parallaxContainers.forEach((container) => {
                const htmlElement = container as HTMLElement;
                const scrollPosition = window.pageYOffset;
                htmlElement.style.backgroundPositionY = `${scrollPosition * 0.5}px`;
            });
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [current]);

    const handleMouseEnter = () => setAutoplayEnabled(false);
    const handleMouseLeave = () => setAutoplayEnabled(true);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        setIsDragging(true);
        setAutoplayEnabled(false);

        if ('touches' in e) {
            setStartX(e.touches[0].clientX);
        } else {
            setStartX(e.clientX);
        }
    };

    const handleDragMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const diff = startX - currentX;

        if (Math.abs(diff) > 10) {
            e.preventDefault();
        }
    };

    const handleDragEnd = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        const currentX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
        const diff = startX - currentX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                setCurrent((prev) => (prev + 1) % sortedTours.length);
            } else {
                setCurrent((prev) => (prev === 0 ? sortedTours.length - 1 : prev - 1));
            }
        }

        setIsDragging(false);
        setAutoplayEnabled(true);
    };

    const handleDragCancel = () => {
        if (isDragging) {
            setIsDragging(false);
            setAutoplayEnabled(true);
        }
    };

    if (!sortedTours || sortedTours.length === 0) {
        return (
            <div className="relative w-full max-w-full overflow-hidden">
                <div className="relative aspect-video">
                    <Card className="h-full">
                        <CardContent className="flex items-center justify-center p-6 bg-gradient-to-r from-primary/80 to-secondary/80 h-full">
                            <span className="text-2xl font-semibold text-white">Loading tours...</span>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative w-full max-w-full overflow-hidden"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onTouchCancel={handleDragCancel}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            <div className="relative max-h-[90vh] w-full aspect-video">
                {sortedTours.map((tour: TourItem, index: number) => {
                    const description = tour.description || "No description available.";
                    let truncatedDescription = description;

                    if (typeof description === 'string' && description.length > 400) {
                        truncatedDescription = description.substring(0, 400) + "...Read More";
                    }

                    return (
                        <div
                            key={tour._id || index}
                            className={cn(
                                "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
                                current === index ? "opacity-100 z-10" : "opacity-0 z-0",
                            )}
                        >
                            <div
                                className="h-full bg-center parallax-container bg-cover bg-no-repeat"
                                style={{
                                    backgroundImage: `url(${tour.coverImage})`,
                                }}
                            >
                                {/* Dark overlay with dotted pattern */}
                                <div className="absolute inset-0 bg-black/40"></div>
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 9px)',
                                        backgroundSize: '20px 20px',
                                    }}
                                ></div>
                                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative flex items-center h-full">
                                    <div className="relative z-10 p-5 text-white w-full md:w-1/2 text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl capitalize [text-shadow:3px_3px_3px_rgb(0_0_0/100%)]">{tour.title}</h2>
                                        <div className="text-base md:text-lg mt-4 mb-4 [text-shadow:1px_1px_2px_rgb(0_0_0/100%)] tracking-wide">
                                            <RichTextRenderer
                                                content={truncatedDescription}
                                                className="text-white prose-headings:text-white prose-strong:text-white"
                                            />
                                        </div>
                                        <div className="mt-5 relative z-10 flex flex-col sm:flex-row justify-center md:justify-start gap-4 sm:gap-5">
                                            <Link href={`/tours/${tour._id}`} className="btn btn-primary">
                                                <Button className="w-full sm:w-auto">View Tour</Button>
                                            </Link>
                                            <Link href={`/tours/${tour._id}`} className="btn btn-primary">
                                                <Button className="w-full sm:w-auto">Book Tour</Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Vertical dot indicators */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
                {sortedTours.map((tour: TourItem, index: number) => (
                    <button
                        key={tour._id || index}
                        className={cn(
                            "relative flex items-center justify-center transition-all duration-500 ease-in-out",
                            current === index ? "scale-110" : "hover:scale-105"
                        )}
                        onClick={() => setCurrent(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    >
                        {current === index ? (
                            <div className="h-5 w-5 rounded-full bg-white shadow-glow transition-all duration-500 ease-in"></div>
                        ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-white/70 flex items-center justify-center transition-all duration-500 ease-in-out">
                                <div className="h-1.5 w-1.5 rounded-full bg-white/70 transition-all duration-500 ease-in-out"></div>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-20">
                <div
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default HomeSlider;
