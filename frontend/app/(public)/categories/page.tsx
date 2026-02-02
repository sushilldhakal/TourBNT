'use client';

import Link from 'next/link';

export default function CategoriesPage() {

    // TODO: Fetch categories from API
    const categories = [];

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Tour Categories</h1>
                <p className="text-xl text-muted-foreground">
                    Browse tours by category and find your perfect adventure
                </p>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-xl text-muted-foreground mb-4">No categories available at the moment</p>
                    <Link href="/" className="text-primary hover:text-primary/80">
                        Return to Home
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Category cards will be mapped here */}
                </div>
            )}
        </div>
    );
}
