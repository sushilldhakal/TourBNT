import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { SERVER_BACKEND_URL } from '@/lib/config/backendUrl';

// Rebuilt at most once an hour from the live database.
export const revalidate = 3600;

const API = `${SERVER_BACKEND_URL}/api/v1`;

async function getJson(path: string): Promise<any | null> {
    try {
        const res = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
        return res.ok ? await res.json() : null;
    } catch {
        return null; // API briefly unavailable: build the sitemap from what we have rather than failing
    }
}

const rows = (json: any): any[] => json?.items ?? json?.data?.items ?? (Array.isArray(json?.data) ? json.data : []) ?? [];

/** Every page of a paginated list, up to a sanity cap. */
async function getAll(path: string, pageSize = 100, maxPages = 20): Promise<any[]> {
    const all: any[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const json = await getJson(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=${pageSize}`);
        const batch = rows(json);
        all.push(...batch);
        const totalPages = json?.pagination?.totalPages ?? json?.data?.totalPages;
        if (batch.length < pageSize || (totalPages && page >= totalPages)) break;
    }
    return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [tours, destinations, categories, agencies, posts, partners] = await Promise.all([
        getAll('/tours'),
        getAll('/global/destinations/approved'),
        getAll('/global/categories/approved'),
        getAll('/agencies', 60),
        getAll('/posts'),
        getAll('/business-partners'),
    ]);

    const now = new Date();
    const entry = (path: string, changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>, priority: number, lastModified?: string | Date): MetadataRoute.Sitemap[number] => ({
        url: `${SITE_URL}${path}`,
        lastModified: lastModified ? new Date(lastModified) : now,
        changeFrequency,
        priority,
    });

    const statics: MetadataRoute.Sitemap = [
        entry('/', 'daily', 1),
        entry('/tours', 'daily', 0.9),
        entry('/destinations', 'weekly', 0.8),
        entry('/categories', 'weekly', 0.7),
        entry('/agencies', 'weekly', 0.7),
        entry('/blog', 'weekly', 0.6),
        entry('/about', 'monthly', 0.4),
        entry('/contact', 'monthly', 0.4),
        entry('/help', 'monthly', 0.4),
        entry('/terms', 'yearly', 0.2),
        entry('/privacy', 'yearly', 0.2),
        entry('/cookies', 'yearly', 0.2),
        entry('/refund-policy', 'yearly', 0.2),
    ];

    return [
        ...statics,
        ...tours.filter((t) => t?.id).map((t) => entry(`/tours/${t.id}`, 'weekly', 0.9, t.updatedAt)),
        ...destinations.filter((d) => d?.id).map((d) => entry(`/destinations/${d.id}`, 'weekly', 0.7, d.updatedAt)),
        ...categories.filter((c) => c?.id).map((c) => entry(`/categories/${c.id}`, 'weekly', 0.6, c.updatedAt)),
        ...agencies.filter((a) => a?.id).map((a) => entry(`/agencies/${a.id}`, 'weekly', 0.6)),
        ...posts.filter((p) => p?.id).map((p) => entry(`/blog/${p.id}`, 'monthly', 0.5, p.updatedAt)),
        ...partners.filter((p) => p?.slug && p?.type).map((p) => entry(`/partners/${p.type}/${p.slug}`, 'weekly', 0.5, p.updatedAt)),
    ];
}
