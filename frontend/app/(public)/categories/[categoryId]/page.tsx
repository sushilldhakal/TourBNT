'use client';

import { useLayout } from '@/providers/LayoutProvider';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SingleCategoryPage() {
    const { isFullWidth } = useLayout();
    const params = useParams();
    const categoryId = params.categoryId;

    // TODO: Fetch category details and tours from API

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <Link href="/categories" className="text-primary hover:text-primary/80 mb-6 inline-block">
                ← Back to Categories
            </Link>

            <div className="mb-12">
                <h1 className="text-4xl font-bold mb-4">Category Name</h1>
                <p className="text-xl text-muted-foreground">
                    Category ID: {categoryId}
                </p>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-6">Tours in this Category</h2>
                <div className="text-center py-16 bg-card border border-border rounded-lg">
                    <p className="text-muted-foreground">No tours available in this category yet</p>
                </div>
            </div>
        </div>
    );
}
