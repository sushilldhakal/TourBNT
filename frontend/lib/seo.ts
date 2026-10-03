/**
 * SEO helpers shared by metadata, the sitemap and structured data.
 */

/** The public origin, used for canonical URLs and the sitemap. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tourbnt.com').replace(/\/+$/, '');

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

interface RichNode { type?: string; text?: string; content?: RichNode[] }

function collectText(node: RichNode | undefined, out: string[]) {
    if (!node) return;
    if (typeof node.text === 'string') out.push(node.text);
    node.content?.forEach((c) => collectText(c, out));
    // keep words from different paragraphs / list items apart
    if (node.type && ['paragraph', 'heading', 'listItem', 'bulletList', 'orderedList'].includes(node.type)) out.push(' ');
}

/**
 * Plain text from what the editors store: a ProseMirror document (as an object or a JSON string), HTML,
 * or plain text. Used for meta descriptions, so "{"type":"doc",...}" never ends up in a search result or link preview.
 */
export function richToPlainText(content: unknown, maxLength = 160): string {
    let text = '';
    try {
        const doc: RichNode | null =
            typeof content === 'string'
                ? (content.trim().startsWith('{') ? JSON.parse(content) : null)
                : content && typeof content === 'object' ? (content as RichNode) : null;
        if (doc) {
            const parts: string[] = [];
            collectText(doc, parts);
            text = parts.join('');
        } else if (typeof content === 'string') {
            text = content.replace(/<[^>]+>/g, ' ');
        }
    } catch {
        text = typeof content === 'string' ? content.replace(/<[^>]+>/g, ' ') : '';
    }
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    // cut at a word boundary
    const cut = text.slice(0, maxLength - 1);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), maxLength - 30)).trimEnd()}…`;
}

/** Serialise JSON-LD safely for a <script> tag (a "<" in user text must not close the tag). */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

export function organizationJsonLd(opts: { name: string; description: string; email?: string; phone?: string }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: opts.name,
        url: SITE_URL,
        description: opts.description,
        ...(opts.email ? { email: opts.email } : {}),
        ...(opts.phone ? { telephone: opts.phone } : {}),
    };
}

export function websiteJsonLd(name: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name,
        url: SITE_URL,
        // Lets search engines offer a search box for the site.
        potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/tours?keyword={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    };
}

interface TourForSeo {
    id: string;
    title: string;
    code?: string;
    excerpt?: string | null;
    description?: unknown;
    coverImage?: string | null;
    gallery?: Array<{ image?: string }> | null;
    price?: number | null;
    saleEnabled?: boolean | null;
    salePrice?: number | null;
    averageRating?: number | null;
    approvedReviewCount?: number | null;
    location?: { city?: string; country?: string } | string | null;
}

/**
 * Tour page structured data: a Product with an offer (price) and, when there are approved reviews, a rating —
 * what lets search engines show price and stars in results. Also marked as a TouristTrip.
 */
export function tourJsonLd(tour: TourForSeo) {
    const price = tour.saleEnabled && tour.salePrice != null ? tour.salePrice : tour.price;
    const images = [tour.coverImage, ...(tour.gallery ?? []).map((g) => g?.image)].filter((x): x is string => !!x).slice(0, 6);
    const url = absoluteUrl(`/tours/${tour.id}`);
    const reviewCount = tour.approvedReviewCount ?? 0;
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        additionalType: 'https://schema.org/TouristTrip',
        name: tour.title,
        description: tour.excerpt?.trim() || richToPlainText(tour.description, 300),
        ...(images.length ? { image: images } : {}),
        ...(tour.code ? { sku: tour.code } : {}),
        url,
        brand: { '@type': 'Organization', name: 'TourBNT' },
        ...(price != null && price > 0
            ? { offers: { '@type': 'Offer', url, price: String(price), priceCurrency: 'USD', availability: 'https://schema.org/InStock' } }
            : {}),
        ...(reviewCount > 0 && tour.averageRating
            ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(tour.averageRating.toFixed(1)), reviewCount } }
            : {}),
    };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
    };
}
