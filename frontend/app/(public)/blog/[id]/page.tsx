import Link from 'next/link';
import Image from 'next/image';
import { getSinglePost } from '@/lib/api/posts';
import type { Post } from '@/types/types';
import RichTextRenderer from '@/components/RichTextRenderer';
import { BlogComments } from '@/components/blog/BlogComments';

// Serve cached HTML and refresh it in the background at most once a minute (ISR).
export const revalidate = 60;
// No pages are built ahead of time; each one is rendered on its first visit and then cached.
export async function generateStaticParams() {
    return [];
}

// Server component: the HTML arrives with the post in it, no client-side fetch round trip.
export default async function SingleBlogPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: blogId } = await params;
    let post: Post | null = null;
    try {
        post = (await getSinglePost(blogId)) as Post;
    } catch {
        post = null;
    }

    if (!post) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-muted-foreground mb-4">Post not found</p>
                    <Link href="/blog" className="text-primary hover:text-primary/80">← Back to Blog</Link>
                </div>
            </div>
        );
    }

    const authorName = (post as { author?: { name?: string } }).author?.name;
    const content = (post as { content?: string }).content ?? (post as { body?: string }).body ?? '';
    const image = (post as { image?: string }).image ?? (post as { featuredImage?: string }).featuredImage;
    const rawTags = (post as { tags?: unknown }).tags;
    const tags = (Array.isArray(rawTags) ? rawTags : []).map((t) => String(t).trim()).filter(Boolean);
    const commentsEnabled = (post as { enableComments?: boolean }).enableComments !== false;

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
                        {tags.length > 0 && (
                            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
                                {tags.map((tag) => (
                                    <li key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">#{tag}</li>
                                ))}
                            </ul>
                        )}
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

                    {content ? (
                        // The post is stored as rich-text JSON from the editor; this turns it into safe HTML.
                        <RichTextRenderer content={content} />
                    ) : (
                        <p className="text-muted-foreground">No content available.</p>
                    )}
                </article>

                <BlogComments postId={blogId} enabled={commentsEnabled} />

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
