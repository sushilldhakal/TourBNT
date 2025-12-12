'use client';

import { useLayout } from '@/providers/LayoutProvider';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SingleBlogPage() {
    const { isFullWidth } = useLayout();
    const params = useParams();
    const blogId = params.id;

    // TODO: Fetch blog post details from API

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <div className="max-w-4xl mx-auto">
                <Link href="/blog" className="text-primary hover:text-primary/80 mb-6 inline-block">
                    ← Back to Blog
                </Link>

                <article>
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold mb-4">Blog Post Title</h1>
                        <div className="flex items-center text-sm text-muted-foreground space-x-4">
                            <span>By Author Name</span>
                            <span>•</span>
                            <span>January 1, 2024</span>
                            <span>•</span>
                            <span>5 min read</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
                        <div className="h-96 bg-muted flex items-center justify-center">
                            <p className="text-muted-foreground">Featured Image</p>
                        </div>
                    </div>

                    <div className="prose max-w-none">
                        <p className="text-muted-foreground">
                            Blog post ID: {blogId}
                        </p>
                        <p className="text-muted-foreground">
                            Blog content will be loaded from the API...
                        </p>
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
