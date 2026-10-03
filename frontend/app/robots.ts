import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Public pages are open to crawlers; private and transactional areas are not worth indexing.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/dashboard/', '/api/', '/auth/', '/checkout', '/cart', '/booking/', '/confirmation', '/profile/'],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
