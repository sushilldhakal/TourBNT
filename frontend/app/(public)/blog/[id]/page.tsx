'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { getSinglePost } from '@/lib/api/posts';
import type { Post } from '@/types/types';

export default function SingleBlogPage() {
    const params = useParams();
    const blogId = typeof params.id === 'string' ? params.id : '';
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!blogId) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        getSinglePost(blogId)
            .then((data) => {
                if (!cancelled) setPost(data as Post);
            })
            .catch((err) => {
                if (!cancelled) setError((err as Error)?.message ?? 'Failed to load post');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [blogId]);

    if (loading) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center text-muted-foreground">Loading...</div>
            </div>
        );
    }
    if (error || !post) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-muted-foreground mb-4">{error ?? 'Post not found'}</p>
                    <Link href="/blog" className="text-primary hover:text-primary/80">← Back to Blog</Link>
                </div>
            </div>
        );
    }

    const authorName = (post as { author?: { name?: string } }).author?.name;
    const content = (post as { content?: string }).content ?? (post as { body?: string }).body ?? '';
    const image = (post as { image?: string }).image ?? (post as { featuredImage?: string }).featuredImage;

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="max-w-4xl mx-auto">
                <Link href="/blog" className="text-primary hover:text-primary/80 mb-6 inline-block">
                    ← Back to Blog
                </Link>

                <article>
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
                        <div className="flex items-center text-sm text-muted-foreground space-x-4">
                            {authorName && <span>By {authorName}</span>}
                            {(post as { createdAt?: string }).createdAt && (
                                <>
                                    {authorName && <span>•</span>}
                                    <span>
                                        {new Date((post as { createdAt: string }).createdAt).toLocaleDateString()}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
                        <div className="aspect-video bg-muted relative">
                            {image ? (
                                <Image
                                    src={image}
                                    alt={post.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 896px) 100vw, 896px"
                                />
                            ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                    No image
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="prose max-w-none dark:prose-invert">
                        {content ? (
                            <div dangerouslySetInnerHTML={{ __html: content }} />
                        ) : (
                            <p className="text-muted-foreground">No content available.</p>
                        )}
                    </div>
                </article>

                <div className="mt-12 pt-8 border-t border-border">
                    <h3 className="text-xl font-semibold mb-6">Related Posts</h3>
                    <div className="text-center py-8 bg-card border border-border rounded-lg">
                        <p className="text-muted-foreground">No related posts available</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
