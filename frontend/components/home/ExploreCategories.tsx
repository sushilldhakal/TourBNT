"use client";

import { useHomeFeed } from "@/lib/queries/useHome";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ContentContainer } from "@/components/layout/PublicLayoutClient";
import type { CategoryData } from "@/types/types";

export default function ExploreCategories() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);

    const { data, isPending } = useHomeFeed();
    const categories: CategoryData[] = useMemo(() => {
        const raw = data?.categories ?? [];
        return [...raw]
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, 12);
    }, [data?.categories]);

    useEffect(() => {
        if (!categories.length) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % categories.length);
            setAnimationKey((prev) => prev + 1);
        }, 5000);

        return () => clearInterval(interval);
    }, [categories.length]);

    if (isPending) {
        return (
            <div className="py-16 bg-secondary/10 w-full">
                <ContentContainer className="px-4 transition-all duration-300">
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
                </ContentContainer>
            </div>
        );
    }

    if (!categories.length) return null;

    return (
        <div className="py-16 bg-secondary/10 w-full">
            <ContentContainer className="px-4 transition-all duration-300">
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
                    </div>
                </div>

                {categories.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1: list (3) */}
                        <div className="space-y-3">
                            {categories.slice(0, 3).map((category, idx) => {
                                const index = idx;
                                const isActive = index === activeIndex;
                                return (
                                    <button
                                        key={category.id ?? `${category.name}-${idx}`}
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
                                                    {category.name}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                    {category.description}
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="shrink-0">
                                                {category.usageCount || 0} tours
                                            </Badge>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Column 2: list (3) */}
                        <div className="space-y-3">
                            {categories.slice(3, 6).map((category, idx) => {
                                const index = idx + 3;
                                const isActive = index === activeIndex;
                                return (
                                    <button
                                        key={category.id ?? `${category.name}-${idx}-b`}
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
                                                    {category.name}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                    {category.description}
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="shrink-0">
                                                {category.usageCount || 0} tours
                                            </Badge>
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
                                    {categories[activeIndex]?.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={categories[activeIndex].imageUrl}
                                            alt={categories[activeIndex].name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center">
                                            <Folder className="h-24 w-24 text-primary/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-white font-semibold text-lg line-clamp-1">
                                                {categories[activeIndex]?.name}
                                            </div>
                                            <div className="mt-1 text-white/80 text-sm line-clamp-2">
                                                {categories[activeIndex]?.description}
                                            </div>
                                        </div>
                                        <Link
                                            href={`/categories/${categories[activeIndex]?.id}`}
                                            className="shrink-0"
                                        >
                                            <Button variant="secondary" className="backdrop-blur-sm flex items-center gap-2">
                                                <FolderOpen className="h-4 w-4" />
                                                View
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
