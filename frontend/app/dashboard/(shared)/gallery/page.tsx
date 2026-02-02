'use client';

import { Gallery } from '@/components/dashboard/gallery/Gallery';

/**
 * Gallery Route Page
 *
 * Renders the simplified gallery in standalone mode with full functionality.
 * Authentication is handled by the dashboard layout.
 */
export default function GalleryRoute() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
            <Gallery mode="standalone" />
        </div>
    );
}
