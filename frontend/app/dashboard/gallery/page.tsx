'use client';

import { GalleryPage } from '@/components/dashboard/gallery/GalleryPage';

/**
 * Gallery Route Page
 * 
 * Renders the gallery in standalone mode with full functionality.
 * Authentication is handled by the dashboard layout.
 * 
 * Requirements: 1.1
 * - Display media items in a responsive grid layout
 * - Show media type tabs for images, videos, and PDFs
 */
export default function GalleryRoute() {
    return <GalleryPage mode="standalone" />;
}
