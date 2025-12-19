import { Response, NextFunction } from 'express';
import Gallery from './galleryModel';
import { GalleryDocument } from './galleryTypes';
// import cloudinary from '../config/cloudinary';
import { v2 as cloudinary } from "cloudinary";
import createHttpError from 'http-errors';
import { Request
 } from '../../middlewares/authenticate';
import mongoose from 'mongoose';
import fs from 'fs';
import User from "../user/userModel";
import { EncryptedKeyService } from '../../services/encryptedKeyService';

// Removed unused CloudinaryApiResponse interface

interface CloudinaryResource {
  asset_id: string;
  public_id: string;
  folder: string;
  filename: string;
  format: string;
  resource_type: string;
  type: string;
  created_at: string;
  url: string;
  secure_url: string;
  width: string;
  height: string;
  bytes: string;
}

export const getSingleMedia = async (req: Request
, res: Response, next: NextFunction) => {
  try {
    const { mediaId } = req.params; // Changed from publicId to mediaId
    const { mediaType: queryMediaType } = req.query as { mediaType: string };
    console.log("req.query", req.query)

    console.log('🔍 getSingleMedia called with:', {
      mediaId,
      mediaType: queryMediaType,
      params: req.params,
      query: req.query
    });

    if (!mediaId) {
      return next(createHttpError(400, 'mediaId parameter is required'));
    }
    const authUser = req.user;
    if (!authUser) {
      return next(createHttpError(400, 'authentication is required'));
    }

    if (!queryMediaType) {
      return next(createHttpError(400, 'mediaType parameter is required'));
    }

    // Use mediaId as publicId for backward compatibility
    const publicId = mediaId;
    // Determine which folder the publicId belongs to (images, pdfs, or videos)
    let folderPrefix;
    let mediaType: 'images' | 'PDF' | 'videos';
    let fetchPublicId;
    if (queryMediaType === 'tour-pdf') {
      folderPrefix = 'main/tour-pdf/';
      mediaType = 'PDF';
      fetchPublicId = `${folderPrefix}${publicId}.pdf`;
    } else if (queryMediaType === 'tour-cover') {
      folderPrefix = 'main/tour-cover/';
      mediaType = 'images';
      fetchPublicId = `${folderPrefix}${publicId}`;
    } else if (queryMediaType === 'tour-video') {
      folderPrefix = 'main/tour-video/';
      mediaType = 'videos';
      fetchPublicId = `${folderPrefix}${publicId}`;
    } else {
      return next(createHttpError(400, 'Invalid mediaType'));
    }

    // Fetch image from MongoDB using asset_id
    const imageDetails = await Gallery.findOne(
      { [`${mediaType}.public_id`]: fetchPublicId },
      { [`${mediaType}.$`]: 1, user: 1 } // Get the image and the user who uploaded it
    ).exec();

    if (!imageDetails || !imageDetails[mediaType] || imageDetails[mediaType].length === 0) {
      return next(createHttpError(404, 'Image not found in gallery'));
    }
    const image = imageDetails[mediaType][0];
    const ownerId = imageDetails.user;

    const authUserId = authUser.id;
    const authUserRoles = authUser.roles;
    // Fetch user roles from the database
    const user = await User.findById(authUserId);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }
    // If the user is neither admin nor the owner, deny access
    if (!authUserRoles.includes('admin') && ownerId.toString() !== authUserId) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'This image does not belong to you.',
        code: 'UNAUTHORIZED_MEDIA_ACCESS'
      });
    }
    // Fetch the uploader's (seller's) Cloudinary credentials
    const cloudinaryResource = await fetchResourceByPublicId(mediaType, fetchPublicId, ownerId.toString(), res);

    if (!cloudinaryResource) {
      // If null is returned, it means credentials were invalid and response was already sent
      if (res.headersSent) {
        return; // Response already sent, don't continue
      }
      return next(createHttpError(404, 'Image not found on Cloudinary'));
    }
    // Respond with image details
    res.json({
      url: cloudinaryResource.secure_url,
      id: image._id,
      description: image.description,
      title: image.title,
      tags: image.tags,
      uploadedAt: image.uploadedAt,
      asset_id: image.asset_id,
      width: cloudinaryResource.width,
      height: cloudinaryResource.height,
      format: cloudinaryResource.format,
      bytes: cloudinaryResource.bytes,
      resource_type: cloudinaryResource.resource_type,
      created_at: cloudinaryResource.created_at,
      public_id: cloudinaryResource.public_id,
      secure_url: cloudinaryResource.secure_url,
    });
  } catch (error: any) {
    console.error('🚨 getSingleMedia Error:', error);
    console.error('🔍 Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',

    });
    next(error);
  }
};

// Fetches Cloudinary resource using the uploader's Cloudinary credentials
const fetchResourceByPublicId = async (mediaType: string, publicId: string, ownerId: string, res: Response): Promise<CloudinaryResource | null> => {
  console.log('🔍 fetchResourceByPublicId called with:', { mediaType, publicId, ownerId });

  // Get Cloudinary credentials using unified service
  const credentials = await EncryptedKeyService.getCloudinaryCredentials(ownerId);

  if (!credentials) {
    console.log('❌ Missing or invalid Cloudinary credentials for user:', ownerId);
    res.status(410).json({
      error: 'Media Access Unavailable',
      message: 'Unable to load this image. The owner\'s media storage credentials are missing or invalid.',
      details: 'This image was uploaded by another user whose Cloudinary credentials are not properly configured.',
      code: 'INVALID_OWNER_CREDENTIALS'
    });
    return null;
  }

  // Configure Cloudinary with decrypted credentials
  cloudinary.config(credentials);

  // Test credentials with a simple API call first
  return new Promise((resolve, reject) => {
    // First, test credentials with a simple ping to validate they work
    cloudinary.api.ping((pingErr: unknown) => {
      if (pingErr) {
        console.error('❌ Cloudinary credentials validation failed:', pingErr);
        console.error('🔍 Credential validation details:', {
          cloudName: credentials.cloud_name,
          apiKeyLength: credentials.api_key?.length,
          hasApiSecret: !!credentials.api_secret,
          errorType: typeof pingErr,
          errorMessage: (pingErr as any)?.message || 'Unknown ping error'
        });

        // Return a 410 status (Gone) to indicate invalid credentials rather than 500
        if (!res.headersSent) {
          res.status(410).json({
            error: 'Media Access Unavailable',
            message: 'Unable to load this image. The owner\'s media storage credentials have expired or are invalid.',
            details: 'This image was uploaded by another user whose Cloudinary account credentials need to be updated.',
            code: 'EXPIRED_OWNER_CREDENTIALS',
            cloudName: credentials.cloud_name
          });
        }
        return resolve(null);
      }

      console.log('✅ Cloudinary credentials validated successfully');

      // Now proceed with the actual resource fetch
      const resourceOptions = mediaType === 'PDF' ? { resource_type: 'raw' } : mediaType === 'videos' ? { resource_type: 'video' } : undefined;
      console.log('🔍 Cloudinary API call with:', { publicId, resourceOptions });

      cloudinary.api.resource(
        publicId,
        resourceOptions,
        (err: unknown, result: CloudinaryResource) => {
          if (err) {
            console.error('❌ Cloudinary API error:', err);
            return reject(err);
          }
          console.log('✅ Cloudinary API success:', { publicId: result.public_id, resourceType: result.resource_type });
          resolve(result);
        }
      );
    });
  });
};

export const getMedia = async (req: Request
, res: Response, next: NextFunction) => {
  try {
    const { mediaType } = req.query;
    const { page, limit, skip } = req.pagination!; // Get pagination from middleware

    if (!['images', 'pdfs', 'videos'].includes(mediaType as string)) {
      return next(createHttpError(400, 'Invalid mediaType parameter'));
    }
    console.log('🔍 getMedia called with:', { mediaType, page, limit, skip }, req.user);
    if (!req.user) return next(createHttpError(401, 'User not authenticated'));

    const isAdmin = req.user.roles.includes('admin');
    const query = isAdmin
      ? {} // Admin can access all galleries
      : { user: new mongoose.Types.ObjectId(req.user.id) }; // Non-admin can access only their own gallery

    // Fetch galleries without skip and limit
    const galleries = await Gallery.find(query).sort({ createdAt: -1 }).exec();

    // Separate media into different arrays
    const images = mediaType === 'images' ? galleries.flatMap(gallery => gallery.images) : [];
    const pdfs = mediaType === 'pdfs' ? galleries.flatMap(gallery => gallery.PDF) : [];
    const videos = mediaType === 'videos' ? galleries.flatMap(gallery => gallery.videos) : [];

    // Sort media
    const sortedImages = images.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const sortedPdfs = pdfs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const sortedVideos = videos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // Slice the media array for pagination
    const responseMedia = mediaType === 'images'
      ? sortedImages.slice(skip, skip + limit)
      : mediaType === 'pdfs'
        ? sortedPdfs.slice(skip, skip + limit)
        : sortedVideos.slice(skip, skip + limit);

    // Calculate total count and pages
    const totalMediaCount = mediaType === 'images'
      ? sortedImages.length
      : mediaType === 'pdfs'
        ? sortedPdfs.length
        : sortedVideos.length;

    const totalPages = Math.ceil(totalMediaCount / limit);

    res.json({
      [mediaType as string]: responseMedia,
      total: totalMediaCount,
      page,
      limit,
      totalPages,
      totalImages: mediaType === 'images' ? images.length : 0,
      totalPDFs: mediaType === 'pdfs' ? pdfs.length : 0,
      totalVideos: mediaType === 'videos' ? videos.length : 0
    });

  } catch (error) {
    next(error);
  }
};



const uploadFileToCloudinary = async (file: Express.Multer.File, folder: string, resourceType: string, title?: string, description?: string) => {
  try {
    const filePath = file.path;
    console.log('🔧 Cloudinary Upload: Starting upload for file:', {
      originalName: file.originalname,
      filePath: filePath,
      folder: folder,
      resourceType: resourceType,
      fileExists: require('fs').existsSync(filePath)
    });

    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: resourceType as 'image' | 'video' | 'raw' | 'auto',
      context: {
        title: title || '',
        description: description || '',
      },
    });

    console.log('✅ Cloudinary Upload: Upload successful for:', file.originalname, {
      public_id: result.public_id,
      secure_url: result.secure_url
    });

    const fileData = {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      resource_type: result.resource_type,
      created_at: new Date(result.created_at),
      pages: result.pages,
      bytes: result.bytes,
      type: result.type,
      etag: result.etag,
      placeholder: result.placeholder,
      asset_folder: result.asset_folder,
      api_key: result.api_key,
      // Add missing properties required by Image interface
      asset_id: result.asset_id,
      uploadedAt: new Date(),
    } as any; // Cast to any to bypass strict typing for MongoDB document creation

    console.log('🔧 Cloudinary Upload: Cleaning up local file:', filePath);
    await fs.promises.unlink(filePath); // Remove the file after upload
    return fileData;
  } catch (error) {
    console.error('❌ Cloudinary Upload: Error uploading file:', file.originalname, error);
    throw error;
  }
};

const handleUploads = async (files: any, title: string | undefined, description: string | undefined, gallery: GalleryDocument) => {
  const uploadPromises: Promise<any>[] = [];
  if (files.imageList) {
    files.imageList.forEach((file: Express.Multer.File) => {
      uploadPromises.push(uploadFileToCloudinary(file, 'main/tour-cover/', 'image', title, description).then(data => {

        gallery.images.push(data);
      }));
    });
  }

  if (files.pdf) {
    files.pdf.forEach((file: Express.Multer.File) => {
      uploadPromises.push(uploadFileToCloudinary(file, 'main/tour-pdf/', 'raw', title, description).then(data => {
        gallery.PDF.push(data);
      }));
    });
  }

  if (files.video) {
    files.video.forEach((file: Express.Multer.File) => {
      uploadPromises.push(uploadFileToCloudinary(file, 'main/tour-video/', 'video', title, description).then(data => {
        gallery.videos.push(data);
      }));
    });
  }

  return Promise.all(uploadPromises);
};

export const addMedia = async (req: Request
, res: Response, next: NextFunction) => {
  const { description, title } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  console.log('🔧 AddMedia: Starting upload process for user:', req.user!.id);
  console.log('🔧 AddMedia: Files received:', Object.keys(files || {}));
  console.log('🔧 AddMedia: File details:', files ? Object.entries(files).map(([key, fileArray]) => ({
    fieldName: key,
    fileCount: fileArray.length,
    fileNames: fileArray.map(f => f.originalname)
  })) : 'No files');

  try {
    let gallery = await Gallery.findOne({ user: req.user!.id });
    if (!gallery) {
      console.log('🔧 AddMedia: Creating new gallery for user:', req.user!.id);
      gallery = new Gallery({ user: req.user!.id, images: [], videos: [], PDF: [] });
    }
    if (!req.user) return next(createHttpError(401, 'User not authenticated'));

    // Get Cloudinary credentials using unified service
    console.log('🔧 AddMedia: Getting Cloudinary credentials...');
    const credentials = await EncryptedKeyService.getCloudinaryCredentials(req.user.id!);

    if (!credentials) {
      console.log('❌ AddMedia: No valid credentials found');
      return res.status(400).json({
        error: 'Missing Cloudinary credentials',
        message: 'Please configure your Cloudinary API credentials in settings before uploading media.',
        details: 'Go to Settings > API Configuration to add your Cloudinary credentials.'
      });
    }

    console.log('✅ AddMedia: Credentials obtained, configuring Cloudinary...');
    // Configure Cloudinary with decrypted credentials
    cloudinary.config(credentials);

    console.log('🔧 AddMedia: Starting file uploads to Cloudinary...');
    await handleUploads(files, title, description, gallery);

    console.log('🔧 AddMedia: Saving gallery to database...');
    await gallery.save();

    console.log('✅ AddMedia: Upload process completed successfully');
    res.status(201).json({ message: 'Media uploaded successfully', gallery });
  } catch (error) {
    console.error('❌ AddMedia: Error during upload process:', error);
    console.error('❌ AddMedia: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return next(createHttpError(500, `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
};

export const updateMedia = async (req: Request
, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // Get userId from authenticated request
    const { mediaId } = req.params; // Changed from imageId to mediaId
    const { description, title, tags } = req.body;
    const { mediaType } = req.query;
    const gallery: GalleryDocument | null = await Gallery.findOne({ user: userId });

    if (!gallery) {
      return res.status(404).json({
        error: {
          code: 'GALLERY_NOT_FOUND',
          message: 'Gallery not found',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    let mediaItem;
    if (mediaType === 'image') {
      mediaItem = gallery.images.find((img) => img._id.toString() === mediaId);
    } else if (mediaType === 'video') {
      mediaItem = gallery.videos.find((vid) => vid._id.toString() === mediaId);
    } else if (mediaType === 'raw') {
      mediaItem = gallery.PDF.find((pdf) => pdf._id.toString() === mediaId);
    } else {
      return res.status(400).json({
        error: {
          code: 'INVALID_MEDIA_TYPE',
          message: 'Invalid media type',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }
    // If the media item isn't found
    if (!mediaItem) {
      return res.status(404).json({
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: 'Media not found',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    if (description) {
      mediaItem.description = description;
    }
    if (title) {
      mediaItem.title = title;
    }
    if (tags) {
      mediaItem.tags = tags;
    }

    await gallery.save();

    res.json(mediaItem);
  } catch (error) {
    next(error);
  }
};


export const deleteMedia = async (req: Request
, res: Response, next: NextFunction) => {
  try {
    const { user } = req;
    const { imageIds, mediaType } = req.body; // Expect an array of image IDs

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'imageIds array is required',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }
    if (!user) return next(createHttpError(401, 'User not authenticated'));
    // Get the actual owner of the images if the user is admin
    let targetUserId = user.id;
    if (user.roles.includes('admin')) {
      const userResult = await findUserByPublicId(imageIds[0], mediaType);
      if (typeof userResult === 'string') {
        targetUserId = userResult;
      } else {
        return res.status(404).json({
          error: {
            code: 'MEDIA_OWNER_NOT_FOUND',
            message: 'Media owner not found',
            details: userResult.message,
            timestamp: new Date().toISOString(),
            path: req.path
          }
        });
      }
    }

    // Get Cloudinary credentials using unified service
    const credentials = await EncryptedKeyService.getCloudinaryCredentials(targetUserId);

    if (!credentials) {
      return res.status(410).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid Cloudinary credentials',
          details: 'Missing or invalid Cloudinary API credentials for media deletion.',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    // Configure Cloudinary with decrypted credentials
    cloudinary.config(credentials);

    // Find the gallery by userId
    const gallery = await Gallery.findOne({ user: targetUserId });
    if (!gallery) {
      return res.status(404).json({
        error: {
          code: 'GALLERY_NOT_FOUND',
          message: 'Gallery not found',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    // Media type validation
    type MediaType = 'images' | 'videos' | 'PDF'; // Define valid media types
    if (!['images', 'videos', 'PDF'].includes(mediaType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MEDIA_TYPE',
          message: 'Invalid media type',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    // Find the media (images, videos, or PDFs) to delete based on the `mediaType`
    const mediaToDelete = (gallery[mediaType as MediaType] as any[]).filter((media) =>
      imageIds.includes(media.public_id)
    );

    if (mediaToDelete.length === 0) {
      return res.status(404).json({
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: 'No media found to delete',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    // Track success and failures for bulk operation
    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[]
    };

    // Delete media from Cloudinary
    for (const media of mediaToDelete) {
      const publicId = media.public_id;
      if (!publicId) {
        results.failed.push({ id: media._id.toString(), error: 'Invalid media URL' });
        continue;
      }

      try {
        await cloudinary.uploader.destroy(publicId);
        results.success.push(publicId);
      } catch (error) {
        results.failed.push({
          id: publicId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Remove successfully deleted media from gallery
    gallery[mediaType as MediaType] = gallery[mediaType as MediaType].filter(
      (media) => !media.public_id || !results.success.includes(media.public_id)
    );
    await gallery.save();

    res.status(200).json({
      message: `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} deletion completed`,
      results
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to find user by public_id
const findUserByPublicId = async (publicId: string, mediaType: string) => {
  try {
    const gallery = await Gallery.findOne({ [`${mediaType}.public_id`]: publicId }).populate('user');
    if (!gallery || !gallery.user) {
      return { message: 'No gallery found with this public_id' };
    }
    return (gallery.user as any)._id.toString();
  } catch (error) {
    throw new Error(`Error finding user by public_id: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
