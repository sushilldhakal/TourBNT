"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useLayout } from '@/providers/LayoutProvider';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getApprovedCategories } from "@/lib/api/globalApi";

interface CategoryData {
    _id: string;
    name: string;
    description: string;
    imageUrl?: string;
    usageCount?: number;
}

export default function ExploreCategories() {
    const { isFullWidth } = useLayout();
    const [api, setApi] = useState<CarouselApi | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['approvedCategories'],
        queryFn: getApprovedCategories,
        staleTime: 5 * 60 * 1000,
    });
    const categories: CategoryData[] = useMemo(() => {
        if (!data?.data || !Array.isArray(data.data)) return [];
        return [...data.data]
            .sort((a: CategoryData, b: CategoryData) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, 12);
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
            <div className="py-16 bg-secondary/10">
                <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <Folder className="text-primary h-6 w-6" />
                            <h2 className="text-2xl font-bold">Explore Categories</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-muted rounded-lg h-40" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!categories.length) return null;

    return (
        <div className="py-16 bg-secondary/10">
            <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <Folder className="text-primary h-6 w-6" />
                        <h2 className="text-2xl font-bold">Explore Categories</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/categories">
                            <Button variant="default" size="sm">
                                View All Categories
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
                        {categories.map((category) => (
                            <CarouselItem
                                key={category._id}
                                className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/4"
                            >
                                <Card className="overflow-hidden p-0 h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                                    <div className="relative h-80 overflow-hidden">
                                        {/* Background Image or Fallback */}
                                        {category.imageUrl ? (
                                            <img
                                                src={category.imageUrl}
                                                alt={category.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center">
                                                <Folder className="h-24 w-24 text-primary/30" />
                                            </div>
                                        )}

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20"></div>

                                        {/* Tours Count Badge */}
                                        <Badge className="absolute top-3 right-3 bg-primary/90 hover:bg-primary backdrop-blur-sm">
                                            {category.usageCount || 0} Tours
                                        </Badge>

                                        {/* Content Overlay */}
                                        <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                            {/* Category Icon */}
                                            <div className="mb-3">
                                                <FolderOpen className="h-8 w-8 text-white/90 drop-shadow-lg" />
                                            </div>

                                            {/* Category Name */}
                                            <h3 className="font-bold text-xl text-white mb-2 line-clamp-2 drop-shadow-lg">
                                                {category.name}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-white/90 text-sm mb-4 line-clamp-3 drop-shadow-md">
                                                {category.description}
                                            </p>

                                            {/* View Button */}
                                            <Link href={`/categories/${category._id}`} className="w-full">
                                                <Button
                                                    variant="secondary"
                                                    className="w-full text-foreground backdrop-blur-sm flex items-center justify-center gap-2"
                                                >
                                                    <FolderOpen className="h-4 w-4" />
                                                    View Category
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
