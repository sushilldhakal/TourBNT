'use client';

import { useLayout } from '@/providers/LayoutProvider';
import Link from 'next/link';

export default function BlogPage() {
    const { isFullWidth } = useLayout();

    // TODO: Fetch blog posts from API
    const posts = [];

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Travel Blog</h1>
                <p className="text-xl text-muted-foreground">
                    Travel tips, destination guides, and inspiring stories
                </p>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-xl text-muted-foreground mb-4">No blog posts available at the moment</p>
                    <Link href="/" className="text-primary hover:text-primary/80">
                        Return to Home
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Blog post cards will be mapped here */}
                </div>
            )}
        </div>
    );
}
