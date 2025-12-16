/**
 * Gallery Media Management Types
 * 
 * Type definitions for the gallery redesign feature.
 * These types support the central media management system.
 */

/**
 * Media type categories
 */
export type MediaType = 'image' | 'video' | 'pdf';

/**
 * Media type tab names
 */
export type MediaTab = 'images' | 'videos' | 'pdfs';

/**
 * Resource type for Cloudinary
 */
export type ResourceType = 'image' | 'video' | 'raw';

/**
 * Gallery display mode
 */
export type GalleryMode = 'standalone' | 'picker';

/**
 * View mode for gallery display
 */
export type ViewMode = 'grid' | 'list';

/**
 * Media item interface
 * Represents a single media file stored in Cloudinary
 */
export interface MediaItem {
    id: string;
    publicId: string; // Cloudinary public ID
    url: string;
    secureUrl: string;
    mediaType: MediaType;
    format: string; // jpg, png, mp4, pdf, etc.
    width?: number;
    height?: number;
    bytes: number;
    createdAt: string;
    resourceType: ResourceType;
    thumbnailUrl?: string;
    originalFilename?: string;
    // Editable metadata
    title?: string;
    description?: string;
    tags?: string[];
}

/**
 * Upload response from API
 */
export interface UploadResponse {
    success: boolean;
    urls: string[];
    resources: MediaItem[];
    message?: string;
}

/**
 * Media query response with pagination
 */
export interface MediaQueryResponse {
    resources: MediaItem[];
    nextCursor: number | null;
    totalCount: number;
}

/**
 * Media query parameters
 */
export interface MediaQueryParams {
    pageParam: number;
    mediaType: MediaTab;
}

/**
 * Gallery page props
 */
export interface GalleryPageProps {
    mode?: GalleryMode;
    onMediaSelect?: (mediaUrl: string | string[]) => void;
    allowMultiple?: boolean;
    mediaType?: MediaTab | 'all';
    initialTab?: MediaTab;
}

/**
 * Gallery state
 */
export interface GalleryState {
    activeTab: MediaTab;
    selectedMedia: Set<string>; // Media IDs
    viewMode: ViewMode;
    isUploading: boolean;
}

/**
 * Media grid props
 */
export interface MediaGridProps {
    mediaItems: MediaItem[];
    selectedIds: Set<string>;
    onSelect: (id: string, isMultiSelect: boolean) => void;
    onDelete?: (id: string) => void;
    isLoading: boolean;
    isFetchingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    uploadingFiles: File[];
}

/**
 * Media card props
 */
export interface MediaCardProps {
    media: MediaItem;
    isSelected: boolean;
    onSelect: (id: string, isMultiSelect: boolean) => void;
    onDelete?: (id: string) => void;
    onClick: (media: MediaItem) => void;
}

/**
 * Upload sheet props
 */
export interface UploadSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
    acceptedTypes: Record<string, string[]>;
    maxFiles: number;
    maxSize: number; // in bytes
}

/**
 * Media detail panel props
 */
export interface MediaDetailPanelProps {
    media: MediaItem;
    onClose: () => void;
    onDelete: (id: string) => void;
    onCopyUrl: (url: string) => void;
}

/**
 * Bulk actions panel props
 */
export interface BulkActionsPanelProps {
    selectedCount: number;
    onBulkDelete: () => void;
    onClearSelection: () => void;
    isDeleting: boolean;
}

/**
 * Gallery header props
 */
export interface GalleryHeaderProps {
    title: string;
    itemCount: number;
    onUploadClick: () => void;
    description?: string;
}

/**
 * Media tabs props
 */
export interface MediaTabsProps {
    activeTab: MediaTab;
    onTabChange: (tab: MediaTab) => void;
    counts?: {
        images: number;
        videos: number;
        pdfs: number;
    };
}

/**
 * Upload dropzone props
 */
export interface UploadDropzoneProps {
    onDrop: (files: File[]) => void;
    acceptedTypes: Record<string, string[]>;
    maxFiles: number;
    maxSize: number;
    isUploading?: boolean;
}

/**
 * Media skeleton props
 */
export interface MediaSkeletonProps {
    count?: number;
}

/**
 * Error state props
 */
export interface ErrorStateProps {
    message: string;
    onRetry?: () => void;
}

/**
 * Delete media params
 */
export interface DeleteMediaParams {
    userId?: string; // Optional - server gets userId from httpOnly cookie
    mediaIds: string | string[];
    mediaType: string;
}

/**
 * Upload media params
 */
export interface UploadMediaParams {
    formData: FormData;
    userId?: string; // Optional - server gets userId from httpOnly cookie
}

/**
 * Update media params
 */
export interface UpdateMediaParams {
    userId?: string; // Optional - server gets userId from httpOnly cookie
    imageId: string;
    mediaType: string;
    title?: string;
    description?: string;
    tags?: string[];
}
