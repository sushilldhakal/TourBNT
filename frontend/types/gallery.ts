/**
 * Gallery Media Management Types
 * Centralised types for gallery components and API.
 */

export type MediaType = 'image' | 'video' | 'pdf';

export type MediaTab = 'images' | 'videos' | 'pdfs';

export type ResourceType = 'image' | 'video' | 'raw';

export type GalleryMode = 'standalone' | 'picker';

export type ViewMode = 'grid' | 'list';

export interface MediaItem {
    id: string;
    publicId: string;
    url: string;
    secureUrl: string;
    mediaType: MediaType;
    format: string;
    width?: number;
    height?: number;
    bytes: number;
    createdAt: string;
    resourceType: ResourceType;
    thumbnailUrl?: string;
    originalFilename?: string;
    title?: string;
    description?: string;
    tags?: string[];
}

export interface UploadResponse {
    success: boolean;
    urls: string[];
    resources: MediaItem[];
    message?: string;
}

export interface MediaQueryResponse {
    success: boolean;
    data: MediaItem[];
    message: string;
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
    totalImages: number;
    totalVideos: number;
    totalPDFs: number;
    resources?: MediaItem[];
    nextCursor?: number | null;
    totalCount?: number;
}

export interface MediaQueryParams {
    pageParam: number;
    mediaType: MediaTab;
}

export interface GalleryPageProps {
    mode?: GalleryMode;
    onMediaSelect?: (mediaUrl: string | string[]) => void;
    allowMultiple?: boolean;
    mediaType?: MediaTab | 'all';
    initialTab?: MediaTab;
}

export interface GalleryState {
    activeTab: MediaTab;
    selectedMedia: Set<string>;
    viewMode: ViewMode;
    isUploading: boolean;
}

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

export interface MediaCardProps {
    media: MediaItem;
    isSelected: boolean;
    onSelect: (id: string, isMultiSelect: boolean) => void;
    onDelete?: (id: string) => void;
    onClick: (media: MediaItem) => void;
}

export interface UploadSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
    acceptedTypes: Record<string, string[]>;
    maxFiles: number;
    maxSize: number;
}

export interface MediaDetailPanelProps {
    media: MediaItem;
    onClose: () => void;
    onDelete: (id: string) => void;
    onCopyUrl: (url: string) => void;
}

export interface BulkActionsPanelProps {
    selectedCount: number;
    onBulkDelete: () => void;
    onClearSelection: () => void;
    isDeleting: boolean;
}

export interface GalleryHeaderProps {
    title: string;
    itemCount: number;
    onUploadClick: () => void;
    description?: string;
}

export interface MediaTabsProps {
    activeTab: MediaTab;
    onTabChange: (tab: MediaTab) => void;
    counts?: {
        images: number;
        videos: number;
        pdfs: number;
    };
}

export interface UploadDropzoneProps {
    onDrop: (files: File[]) => void;
    acceptedTypes: Record<string, string[]>;
    maxFiles: number;
    maxSize: number;
    isUploading?: boolean;
}

export interface MediaSkeletonProps {
    count?: number;
}

export interface ErrorStateProps {
    message: string;
    onRetry?: () => void;
}

export interface DeleteMediaParams {
    userId?: string;
    mediaIds: string | string[];
    mediaType: string;
}

export interface UploadMediaParams {
    formData: FormData;
    userId?: string;
}

export interface UpdateMediaParams {
    userId?: string;
    imageId: string;
    mediaType: string;
    title?: string;
    description?: string;
    tags?: string[];
}

// ─── MediaUpload ────────────────────────────────────────────────────────────

export interface FileUploadProgress {
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

export interface MediaUploadProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (files: File[]) => void;
    acceptedTypes: Record<string, string[]>;
    maxSize: number;
    maxFiles: number;
    isUploading?: boolean;
    uploadProgress?: FileUploadProgress[];
    overallProgress?: number;
    uploadComplete?: boolean;
    uploadHasErrors?: boolean;
}

export interface MediaUploadButtonProps {
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
}

// ─── MediaLightbox ───────────────────────────────────────────────────────────

export interface MediaLightboxProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: MediaItem[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
}
