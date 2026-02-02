/**
 * Gallery Components Index
 * 
 * Simplified export file for streamlined gallery components.
 * Reduced from 23+ components to 5 core components + utilities.
 */

// Core components (5 components as per requirements)
export { Gallery } from './Gallery';
export { MediaGrid } from './MediaGrid';
export { MediaCard } from './MediaCard';
export { MediaUpload, MediaUploadButton } from './MediaUpload';
export { MediaPanel, MobileMediaPanel } from './MediaPanel';

// Utility components
export { MediaSkeleton } from './MediaSkeleton';
export { ErrorState } from './ErrorState';

// Types – re-export from central types
export type {
    MediaType,
    MediaTab,
    ResourceType,
    GalleryMode,
    ViewMode,
    MediaItem,
    UploadResponse,
    MediaQueryResponse,
    MediaQueryParams,
    GalleryState,
} from '@/types/gallery';
