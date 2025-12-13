/**
 * Image Upload Handler for Novel Editor
 * Handles image uploads with validation, compression, and error handling
 * Requirements: 8.1, 8.2, 8.3, 19.3, 20.1
 */

import { createImageUpload } from 'novel';
import { addMedia } from '@/lib/api/gallery';
import { getUserId } from '@/lib/auth/authUtils';
import { toast } from '@/components/ui/use-toast';

/**
 * Error types for image upload
 */
enum UploadErrorType {
    NETWORK = 'network',
    SERVER = 'server',
    VALIDATION = 'validation',
    AUTHENTICATION = 'authentication',
    UNKNOWN = 'unknown',
}

/**
 * Custom error class for image upload errors
 */
class ImageUploadError extends Error {
    type: UploadErrorType;
    originalError?: any;

    constructor(message: string, type: UploadErrorType, originalError?: any) {
        super(message);
        this.name = 'ImageUploadError';
        this.type = type;
        this.originalError = originalError;
    }
}

/**
 * Convert base64 string to File object
 * @param base64 - Base64 data (without the data:image/...;base64, prefix)
 * @param filename - Filename for the file
 * @param mimeType - MIME type of the file
 * @returns File object
 */
const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], filename, { type: mimeType });
};

/**
 * Compress image if it exceeds the size threshold
 * Uses canvas to resize and compress the image
 * Requirements: 19.3
 * 
 * @param file - Image file to compress
 * @param maxSizeMB - Maximum size in MB (default: 1MB)
 * @param quality - Compression quality 0-1 (default: 0.8)
 * @returns Promise resolving to compressed file or original if already small enough
 */
const compressImage = async (
    file: File,
    maxSizeMB: number = 1,
    quality: number = 0.8
): Promise<File> => {
    // If file is already small enough, return it
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size <= maxSizeBytes) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions (max 1920px width/height)
                let width = img.width;
                let height = img.height;
                const maxDimension = 1920;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }

                // Create canvas and compress
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Use better image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw image
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob with compression
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }

                        // Create new file from blob
                        const compressedFile = new File(
                            [blob],
                            file.name,
                            { type: file.type }
                        );

                        // If compressed file is still too large, try with lower quality
                        if (compressedFile.size > maxSizeBytes && quality > 0.5) {
                            compressImage(file, maxSizeMB, quality - 0.1)
                                .then(resolve)
                                .catch(reject);
                        } else {
                            resolve(compressedFile);
                        }
                    },
                    file.type,
                    quality
                );
            };

            img.onerror = () => {
                reject(new Error('Failed to load image for compression'));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read image file'));
        };

        reader.readAsDataURL(file);
    });
};

/**
 * Upload image files to the server with retry capability and progress tracking
 * @param files - Array of files to upload
 * @param retryCount - Number of retry attempts (default: 0)
 * @param onProgress - Optional callback for upload progress
 * @returns Promise resolving to array of uploaded image URLs
 */
const uploadImageFiles = async (
    files: File[],
    retryCount: number = 0,
    onProgress?: (progress: number) => void
): Promise<string[]> => {
    const userId = getUserId();
    if (!userId) {
        throw new ImageUploadError(
            'User not authenticated. Please log in and try again.',
            UploadErrorType.AUTHENTICATION
        );
    }

    // Compress images if needed
    const compressedFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
            // Show compression progress
            if (onProgress) {
                onProgress((i / files.length) * 30); // 0-30% for compression
            }

            const compressed = await compressImage(file, 1, 0.8);
            compressedFiles.push(compressed);

            // Log compression results
            if (compressed.size < file.size) {
                const savedMB = ((file.size - compressed.size) / 1024 / 1024).toFixed(2);
                console.log(`Compressed ${file.name}: saved ${savedMB}MB`);
            }
        } catch (error) {
            console.warn(`Failed to compress ${file.name}, using original:`, error);
            compressedFiles.push(file);
        }
    }

    const formData = new FormData();
    compressedFiles.forEach(file => {
        formData.append('imageList', file);
    });

    try {
        // Show upload progress
        if (onProgress) {
            onProgress(40); // 40% - starting upload
        }

        const response = await addMedia(formData, userId) as any;

        if (onProgress) {
            onProgress(90); // 90% - processing response
        }

        // The response structure is { message: string, gallery: GalleryDocument }
        // We need to extract URLs from the gallery.images array
        if (response && response.gallery && response.gallery.images) {
            // Get the most recently uploaded images (last N items where N = files.length)
            const recentImages = response.gallery.images.slice(-files.length);
            const urls = recentImages.map((img: any) => img.url || img.secure_url);

            if (urls.length === 0) {
                throw new ImageUploadError(
                    'No image URLs returned from server',
                    UploadErrorType.SERVER
                );
            }

            return urls;
        } else {
            throw new ImageUploadError(
                'Invalid response format from server',
                UploadErrorType.SERVER,
                response
            );
        }
    } catch (error: any) {
        // Determine error type
        let errorType = UploadErrorType.UNKNOWN;
        let errorMessage = 'Failed to upload image';

        if (error instanceof ImageUploadError) {
            throw error; // Re-throw our custom errors
        }

        // Network errors
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            errorType = UploadErrorType.NETWORK;
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        // Server errors
        else if (error.response?.status >= 500) {
            errorType = UploadErrorType.SERVER;
            errorMessage = 'Server error. Please try again later.';
        }
        // Client errors
        else if (error.response?.status >= 400) {
            errorType = UploadErrorType.SERVER;
            errorMessage = error.response?.data?.message || 'Upload failed. Please try again.';
        }

        throw new ImageUploadError(errorMessage, errorType, error);
    }
};

/**
 * Retry upload with exponential backoff and progress tracking
 * @param files - Files to upload
 * @param maxRetries - Maximum number of retry attempts
 * @param onProgress - Optional callback for upload progress
 * @returns Promise resolving to uploaded URLs
 */
const uploadWithRetry = async (
    files: File[],
    maxRetries: number = 2,
    onProgress?: (progress: number) => void
): Promise<string[]> => {
    let lastError: ImageUploadError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await uploadImageFiles(files, attempt, onProgress);
        } catch (error) {
            lastError = error instanceof ImageUploadError
                ? error
                : new ImageUploadError('Upload failed', UploadErrorType.UNKNOWN, error);

            // Don't retry authentication or validation errors
            if (lastError.type === UploadErrorType.AUTHENTICATION ||
                lastError.type === UploadErrorType.VALIDATION) {
                throw lastError;
            }

            // If this was the last attempt, throw the error
            if (attempt === maxRetries) {
                throw lastError;
            }

            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
};

/**
 * Handle upload errors with user-friendly messages and retry option
 * @param error - The error that occurred
 * @param retryFn - Function to call for retry
 */
const handleUploadError = (error: ImageUploadError, retryFn?: () => void) => {
    const toastConfig: any = {
        title: 'Image Upload Failed',
        description: error.message,
        variant: 'destructive',
        duration: 9000,
    };

    // Add retry button for network and server errors
    if (retryFn && (error.type === UploadErrorType.NETWORK || error.type === UploadErrorType.SERVER)) {
        toastConfig.action = {
            label: 'Retry',
            onClick: retryFn,
        };
    }

    toast(toastConfig);

    // Log error details for debugging
    console.error('Image upload error:', {
        type: error.type,
        message: error.message,
        originalError: error.originalError,
    });
};

/**
 * Create upload function for Novel editor
 * Uses createImageUpload from Novel with custom upload and validation
 * Includes automatic retry, compression, and comprehensive error handling
 * 
 * Requirements: 8.1, 8.2, 8.3, 19.3, 20.1
 */
export const uploadFn = createImageUpload({
    onUpload: async (file: File | string) => {
        // Convert base64 to File if needed
        if (typeof file === 'string') {
            try {
                const [mimeType, base64] = file.split(';base64,');
                const extension = mimeType.split('/')[1];
                const filename = `image-${Date.now()}.${extension}`;
                file = base64ToFile(base64, filename, mimeType);
            } catch (error) {
                throw new ImageUploadError(
                    'Invalid image data format',
                    UploadErrorType.VALIDATION,
                    error
                );
            }
        }

        // Show upload progress toast
        let progressToast: any = null;
        const showProgress = (progress: number) => {
            const message = progress < 30
                ? 'Compressing image...'
                : progress < 90
                    ? 'Uploading image...'
                    : 'Processing...';

            if (progressToast) {
                // Update existing toast (not directly supported, so we'll just log)
                console.log(`Upload progress: ${progress}% - ${message}`);
            } else {
                progressToast = toast({
                    title: 'Uploading Image',
                    description: message,
                    duration: 30000, // Long duration, will be dismissed on completion
                });
            }
        };

        try {
            // Upload with automatic retry and progress tracking
            const imageUrls = await uploadWithRetry([file], 2, showProgress);

            // Show success message
            toast({
                title: 'Image uploaded',
                description: 'Your image has been uploaded successfully.',
                duration: 3000,
            });

            return imageUrls[0];
        } catch (error) {
            const uploadError = error instanceof ImageUploadError
                ? error
                : new ImageUploadError('Failed to upload image', UploadErrorType.UNKNOWN, error);

            // Create retry function
            const retry = async () => {
                try {
                    const imageUrls = await uploadWithRetry([file as File], 2, showProgress);
                    toast({
                        title: 'Image uploaded',
                        description: 'Your image has been uploaded successfully.',
                        duration: 3000,
                    });
                    return imageUrls[0];
                } catch (retryError) {
                    const retryUploadError = retryError instanceof ImageUploadError
                        ? retryError
                        : new ImageUploadError('Failed to upload image', UploadErrorType.UNKNOWN, retryError);
                    handleUploadError(retryUploadError);
                    throw retryUploadError;
                }
            };

            handleUploadError(uploadError, retry);
            throw uploadError;
        }
    },
    validateFn: (file: File | string) => {
        if (typeof file === 'string') {
            // Validate base64 format
            if (!file.startsWith('data:image/')) {
                toast({
                    title: 'Invalid Image',
                    description: 'The image data format is not supported.',
                    variant: 'destructive',
                    duration: 5000,
                });
                return false;
            }
            return true;
        }

        // Validate file type
        if (!file.type.includes('image/')) {
            toast({
                title: 'Invalid File Type',
                description: 'Only image files are supported (JPEG, PNG, GIF, WebP).',
                variant: 'destructive',
                duration: 5000,
            });
            return false;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            toast({
                title: 'File Too Large',
                description: `File size is ${sizeMB}MB. Maximum allowed size is 10MB.`,
                variant: 'destructive',
                duration: 5000,
            });
            return false;
        }

        return true;
    },
});
