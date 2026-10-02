import Link from 'next/link';
import Image from 'next/image';
import { getCategoryById } from '@/lib/api/categories';

// Serve cached HTML and refresh it in the background at most once a minute (ISR).
export const revalidate = 60;
// No pages are built ahead of time; each one is rendered on its first visit and then cached.
export async function generateStaticParams() {
    return [];
}

interface CategoryDetail {
    id?: string;
    _id?: string;
    name?: string;
    title?: string;
    description?: string;
    image?: string;
    imageUrl?: string;
    coverImage?: string;
    tours?: Array<{ _id?: string; id?: string; title?: string; slug?: string }>;
}

// Server component: the HTML arrives with the data in it, no client-side fetch round trip.
export default async function SingleCategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
    const { categoryId } = await params;
    let category: CategoryDetail | null = null;
    try {
        category = (await getCategoryById(categoryId)) as CategoryDetail;
    } catch {
        category = null;
    }

    if (!category) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-muted-foreground mb-4">Category not found</p>
                    <Link href="/categories" className="text-primary hover:text-primary/80">← Back to Categories</Link>
                </div>
            </div>
        );
    }

    const name = (category as { name?: string }).name ?? (category as { title?: string }).title ?? 'Category';
    const tours = (category as { tours?: Array<{ _id?: string; id?: string; title?: string; slug?: string }> }).tours ?? [];

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <Link href="/categories" className="text-primary hover:text-primary/80 mb-6 inline-block">
                ← Back to Categories
            </Link>

            <div className="mb-12">
                <div className="aspect-[21/9] bg-muted rounded-lg overflow-hidden relative mb-6">
                    {((category as { imageUrl?: string }).imageUrl ?? (category as { image?: string }).image ?? (category as { coverImage?: string }).coverImage) ? (
                        <Image
                            src={(category as { imageUrl?: string }).imageUrl ?? (category as { image?: string }).image ?? (category as { coverImage?: string }).coverImage ?? ''}
                            alt={name}
                            fill
                            className="object-cover"
                            sizes="100vw"
                        />
                    ) : null}
                </div>
                <h1 className="text-4xl font-bold mb-4">{name}</h1>
                {(category as { description?: string }).description && (
                    <p className="text-xl text-muted-foreground">{(category as { description: string }).description}</p>
                )}
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-6">Tours in this Category</h2>
                {tours.length === 0 ? (
                    <div className="text-center py-16 bg-card border border-border rounded-lg">
                        <p className="text-muted-foreground">No tours available in this category yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tours.map((tour) => {
                            const tid = (tour as { id?: string }).id ?? (tour as { _id?: string })._id ?? '';
                            const tTitle = (tour as { title?: string }).title ?? 'Tour';
                            const slug = (tour as { slug?: string }).slug;
                            const href = slug ? `/tours/${slug}` : `/tours/${tid}`;
                            return (
                                <Link
                                    key={tid}
                                    href={href}
                                    className="block bg-card border border-border rounded-lg p-4 hover:shadow-md transition"
                                >
                                    <h3 className="font-semibold hover:text-primary">{tTitle}</h3>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
