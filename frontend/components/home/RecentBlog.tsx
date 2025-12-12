"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from "@tanstack/react-query";
import { getPosts } from "@/lib/api";
import { format } from "date-fns";
import { Heart, Eye, MessageSquare, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useLayout } from '@/providers/LayoutProvider';
import { Post } from '@/lib/types';

export default function RecentBlog() {
    const { isFullWidth } = useLayout();
    const [posts, setPosts] = useState<Post[]>([]);
    const [api, setApi] = useState<CarouselApi | null>(null);

    const { data: response, isLoading, error } = useQuery<{ posts: Post[] }>({
        queryKey: ['posts'],
        queryFn: getPosts as () => Promise<{ posts: Post[] }>,
    });

    useEffect(() => {
        if (response?.posts) {
            const updatedPosts = response.posts.map((post: Post) => ({
                ...post,
                liked: false,
                likes: post.likes || 0,
                views: post.views || 0,
                comments: Array.isArray(post.comments) ? post.comments : []
            }));
            setPosts(updatedPosts);
        }
    }, [response]);

    useEffect(() => {
        if (!api) return;
        const handleSelect = () => { };
        api.on("select", handleSelect);
        return () => {
            api.off("select", handleSelect);
        };
    }, [api]);

    const extractContentText = (content: string): string => {
        try {
            const parsedContent = JSON.parse(content);
            const firstParagraph = parsedContent?.content?.[0];
            if (firstParagraph?.content?.[0]?.text) {
                return firstParagraph.content[0].text;
            }
            return 'No content available';
        } catch (e) {
            return 'Content unavailable';
        }
    };

    if (isLoading) {
        return (
            <div className="py-16">
                <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Recent Blogs</h2>
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

    if (error) {
        return (
            <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} py-8 px-4 transition-all duration-300`}>
                <div className="text-center text-destructive">
                    Error loading posts. Please try again later.
                </div>
            </div>
        );
    }

    const publishedPosts = posts
        .filter(post => post.status && post.status.toLowerCase() === 'published')
        .slice(0, 6);

    if (publishedPosts.length === 0) {
        return (
            <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} py-8 px-4 transition-all duration-300`}>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold">Recent Blogs</h2>
                </div>
                <div className="text-center text-muted-foreground py-12">
                    <p>No blog posts available yet.</p>
                    <p className="text-sm mt-2">Check back soon for exciting travel stories!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-16 bg-secondary/10">
            <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <BookOpen className="text-primary h-6 w-6" />
                        <h2 className="text-2xl font-bold">Recent Blogs</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/blog">
                            <Button variant="default" size="sm">
                                View All Blogs
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
                    plugins={[
                        Autoplay({
                            delay: 5000,
                        }),
                    ]}
                >
                    <CarouselContent className="-ml-2 md:-ml-4">
                        {publishedPosts.map((post) => {
                            const contentText = extractContentText(post.content);

                            return (
                                <CarouselItem key={post._id} className={`pl-2 md:pl-4 ${isFullWidth ? ' md:basis-1/2 lg:basis-1/3  xl:basis-1/4' : ' md:basis-1/2 lg:basis-1/3 '}`}>
                                    <Card className="overflow-hidden pt-0 h-full border shadow-xs hover:shadow-md transition-all duration-300">
                                        <div className="relative h-48 overflow-hidden">
                                            <img
                                                src={post.image}
                                                alt={post.title}
                                                className="h-full w-full object-cover transition-all hover:scale-105 duration-300"
                                            />
                                            {post.comments && post.comments.length > 0 && (
                                                <Badge className="absolute top-2 right-2 bg-primary/80 hover:bg-primary">
                                                    {post.comments.length} Comments
                                                </Badge>
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{post.title}</h3>
                                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                                                {contentText}
                                            </p>
                                            <div className="flex flex-col gap-2 text-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="font-medium text-foreground">
                                                        By {post.author?.name || 'Unknown Author'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                                    <span>{format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {post.tags.slice(0, 2).map((tag, index) => (
                                                        <Badge
                                                            key={index}
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                    {post.tags.length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{post.tags.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Heart className="h-3.5 w-3.5" />
                                                        <span>{post.likes || 0}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="h-3.5 w-3.5" />
                                                        <span>{post.views || 0}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                        <span>{Array.isArray(post.comments) ? post.comments.length : 0}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-4 pt-0">
                                            <Link href={`/blog/${post._id}`} className="w-full">
                                                <Button variant="outline" className="w-full">
                                                    Read Article
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                </CarouselItem>
                            );
                        })}
                    </CarouselContent>
                </Carousel>
            </div>
        </div>
    );
}
