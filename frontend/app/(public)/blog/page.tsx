'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPosts } from '@/lib/api/posts';
import type { PostListItem } from '@/types/post';

export default function BlogPage() {
    const [posts, setPosts] = useState<PostListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getPosts({ limit: 24 })
            .then((res: { data?: PostListItem[]; items?: PostListItem[]; posts?: PostListItem[] }) => {
                if (cancelled) return;
                const list = res?.data ?? res?.items ?? res?.posts ?? [];
                setPosts(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (!cancelled) setPosts([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Travel Blog</h1>
                <p className="text-xl text-muted-foreground">
                    Travel tips, destination guides, and inspiring stories
                </p>
            </div>

            {loading ? (
                <div className="text-center py-16 text-muted-foreground">Loading posts...</div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-xl text-muted-foreground mb-4">No blog posts available at the moment</p>
                    <Link href="/" className="text-primary hover:text-primary/80">
                        Return to Home
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <Link
                            key={post.id}
                            href={`/blog/${post.id}`}
                            className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition"
                        >
                            <div className="aspect-video bg-muted relative">
                                {post.image ? (
                                    <Image
                                        src={post.image}
                                        alt={post.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition"
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                    />
                                ) : (
                                    <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        No image
                                    </span>
                                )}
                            </div>
                            <div className="p-4">
                                <h2 className="font-semibold text-lg line-clamp-2 group-hover:text-primary">
                                    {post.title}
                                </h2>
                                {post.author && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {Array.isArray(post.author)
                                            ? post.author.map((a) => a?.name).filter(Boolean).join(', ')
                                            : (post.author as { name?: string })?.name}
                                    </p>
                                )}
                                {post.createdAt && (
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(post.createdAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
