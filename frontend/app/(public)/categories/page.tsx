'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllCategories } from '@/lib/api/categories';

interface CategoryItem {
    id?: string;
    _id?: string;
    name?: string;
    title?: string;
    description?: string;
    image?: string;
    coverImage?: string;
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getAllCategories()
            .then((res: unknown) => {
                if (cancelled) return;
                const raw = res as { data?: CategoryItem[]; items?: CategoryItem[] } | CategoryItem[];
                const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
                setCategories(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (!cancelled) setCategories([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Tour Categories</h1>
                <p className="text-xl text-muted-foreground">
                    Browse tours by category and find your perfect adventure
                </p>
            </div>

            {loading ? (
                <div className="text-center py-16 text-muted-foreground">Loading...</div>
            ) : categories.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-xl text-muted-foreground mb-4">No categories available at the moment</p>
                    <Link href="/" className="text-primary hover:text-primary/80">
                        Return to Home
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat) => {
                        const id = (cat as { id?: string }).id ?? (cat as { _id?: string })._id ?? '';
                        const name = (cat as { name?: string }).name ?? (cat as { title?: string }).title ?? 'Category';
                        const img = (cat as { image?: string }).image ?? (cat as { coverImage?: string }).coverImage;
                        return (
                            <Link
                                key={id}
                                href={`/categories/${id}`}
                                className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition"
                            >
                                <div className="aspect-[4/3] bg-muted relative">
                                    {img ? (
                                        <Image
                                            src={img}
                                            alt={name}
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
                                    <h2 className="font-semibold text-lg group-hover:text-primary">{name}</h2>
                                    {(cat as { description?: string }).description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                            {(cat as { description: string }).description}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
