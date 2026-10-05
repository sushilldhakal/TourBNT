/**
 * Image Upload Handler for Novel Editor
 * Handles image uploads with validation, compression, and error handling
 * Requirements: 8.1, 8.2, 8.3, 19.3, 20.1
 */

import { createImageUpload } from 'novel';
import { uploadMedia } from '@/lib/api/mediaApi';
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
    originalError?: unknown;

    constructor(message: string, type: UploadErrorType, originalError?: unknown) {
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
 * @param onProgress - Optional callback for upload progress
 * @returns Promise resolving to array of uploaded image URLs
 */
const uploadImageFiles = async (
    files: File[],
    userId: string,
    onProgress?: (progress: number) => void
): Promise<string[]> => {
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

            compressedFiles.push(await compressImage(file, 1, 0.8));
        } catch {
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

        const response = await uploadMedia({ formData });

        if (onProgress) {
            onProgress(90); // 90% - processing response
        }

        if (response.success && response.urls.length > 0) {
            return response.urls;
        }
        throw new ImageUploadError(
            response.message || 'No image URLs returned from server',
            UploadErrorType.SERVER,
            response
        );
    } catch (error) {
        if (error instanceof ImageUploadError) {
            throw error; // Re-throw our custom errors
        }
        // uploadMedia already turns failures into readable messages (size, type, auth, network...).
        const message = error instanceof Error && error.message ? error.message : 'Failed to upload image';
        const isNetwork = /network|timed out|timeout/i.test(message);
        throw new ImageUploadError(message, isNetwork ? UploadErrorType.NETWORK : UploadErrorType.SERVER, error);
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
    userId: string,
    maxRetries: number = 2,
    onProgress?: (progress: number) => void
): Promise<string[]> => {
    let lastError: ImageUploadError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await uploadImageFiles(files, userId, onProgress);
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
 * Tell the user an upload failed (uploads already retry automatically before this).
 * @param error - The error that occurred
 */
const handleUploadError = (error: ImageUploadError) => {
    toast({
        title: 'Image Upload Failed',
        description: error.message,
        variant: 'destructive',
        duration: 9000,
    });

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
export const createUploadFn = (userId: string) => createImageUpload({
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
        // Held in an object: TypeScript can't see the closure below assigning a plain `let`.
        const progress: { toast: ReturnType<typeof toast> | null } = { toast: null };
        const showProgress = (percent: number) => {
            const message = percent < 30
                ? 'Compressing image...'
                : percent < 90
                    ? 'Uploading image...'
                    : 'Processing...';

            if (progress.toast) {
                progress.toast.update({ id: progress.toast.id, title: 'Uploading Image', description: `${message} (${Math.round(percent)}%)` });
            } else {
                progress.toast = toast({
                    title: 'Uploading Image',
                    description: message,
                    duration: 30000, // Long duration, dismissed on completion
                });
            }
        };

        try {
            // Upload with automatic retry and progress tracking
            const imageUrls = await uploadWithRetry([file], userId, 2, showProgress);
            progress.toast?.dismiss();

            toast({
                title: 'Image uploaded',
                description: 'Your image has been uploaded successfully.',
                duration: 3000,
            });

            return imageUrls[0];
        } catch (error) {
            progress.toast?.dismiss();
            const uploadError = error instanceof ImageUploadError
                ? error
                : new ImageUploadError('Failed to upload image', UploadErrorType.UNKNOWN, error);
            handleUploadError(uploadError);
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

/**
 * Default upload function for backward compatibility
 * @deprecated Use createUploadFn(userId) instead
 */
export const uploadFn = createUploadFn('');
