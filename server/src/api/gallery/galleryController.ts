import { Response, NextFunction } from 'express';
import { db, mediaAssets, users } from '@tourbnt/db';
import { eq, and, inArray, desc, count } from 'drizzle-orm';
import { v2 as cloudinary } from "cloudinary";
import createHttpError from 'http-errors';
import {
  Request
} from '../../middlewares/authenticate';
import fs from 'fs';
import { EncryptedKeyService } from '../../services/encryptedKeyService';
import { HTTP_STATUS, sendSuccess } from '../../utils/apiResponse';

type MediaKind = 'image' | 'video' | 'pdf';

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
    let kind: MediaKind;
    let fetchPublicId;
    if (queryMediaType === 'tour-pdf') {
      folderPrefix = 'main/tour-pdf/';
      kind = 'pdf';
      fetchPublicId = `${folderPrefix}${publicId}.pdf`;
    } else if (queryMediaType === 'tour-cover') {
      folderPrefix = 'main/tour-cover/';
      kind = 'image';
      fetchPublicId = `${folderPrefix}${publicId}`;
    } else if (queryMediaType === 'tour-video') {
      folderPrefix = 'main/tour-video/';
      kind = 'video';
      fetchPublicId = `${folderPrefix}${publicId}`;
    } else {
      return next(createHttpError(400, 'Invalid mediaType'));
    }

    // Fetch media asset from the database using its public_id
    const [image] = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.publicId, fetchPublicId), eq(mediaAssets.kind, kind)))
      .limit(1);

    if (!image) {
      return next(createHttpError(404, 'Image not found in gallery'));
    }
    const ownerId = image.userId;

    const authUserId = authUser.id;
    const authUserRoles = authUser.roles;
    // Confirm the authenticated user still exists
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, authUserId)).limit(1);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }
    // If the user is neither admin nor the owner, deny access
    if (!authUserRoles.includes('admin') && ownerId !== authUserId) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'This image does not belong to you.',
        code: 'UNAUTHORIZED_MEDIA_ACCESS'
      });
    }
    // Fetch the uploader's (seller's) Cloudinary credentials
    const cloudinaryResource = await fetchResourceByPublicId(kind, fetchPublicId, ownerId, res);

    if (!cloudinaryResource) {
      // If null is returned, it means credentials were invalid and response was already sent
      if (res.headersSent) {
        return; // Response already sent, don't continue
      }
      return next(createHttpError(404, 'Image not found on Cloudinary'));
    }
    // Respond with image details
    const mediaResponse = {
      url: cloudinaryResource.secure_url,
      id: image.id,
      description: image.description,
      title: image.title,
      tags: image.tags,
      uploadedAt: image.uploadedAt,
      asset_id: image.assetId,
      width: cloudinaryResource.width,
      height: cloudinaryResource.height,
      format: cloudinaryResource.format,
      bytes: cloudinaryResource.bytes,
      resource_type: cloudinaryResource.resource_type,
      created_at: cloudinaryResource.created_at,
      public_id: cloudinaryResource.public_id,
      secure_url: cloudinaryResource.secure_url,
    };

    return sendSuccess(res, mediaResponse, 'Media retrieved successfully');
  } catch (error: any) {
    console.error('getSingleMedia Error:', error);
    next(error);
  }
};

// Fetches Cloudinary resource using the uploader's Cloudinary credentials
const fetchResourceByPublicId = async (kind: MediaKind, publicId: string, ownerId: string, res: Response): Promise<CloudinaryResource | null> => {
  // Get Cloudinary credentials using unified service
  const credentials = await EncryptedKeyService.getCloudinaryCredentials(ownerId);

  if (!credentials) {
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
        console.error('Cloudinary credentials validation failed:', pingErr);

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

      // Now proceed with the actual resource fetch
      const resourceOptions = kind === 'pdf' ? { resource_type: 'raw' } : kind === 'video' ? { resource_type: 'video' } : undefined;

      cloudinary.api.resource(
        publicId,
        resourceOptions,
        (err: unknown, result: CloudinaryResource) => {
          if (err) {
            console.error('Cloudinary API error:', err);
            return reject(err);
          }
          resolve(result);
        }
      );
    });
  });
};

function mediaTypeToKind(mediaType: string): MediaKind {
  if (mediaType === 'images') return 'image';
  if (mediaType === 'pdfs') return 'pdf';
  return 'video';
}

export const getMedia = async (req: Request
  , res: Response, next: NextFunction) => {
  try {
    const { mediaType } = req.query as { mediaType: string };
    const page = parseInt(req.query.page as string) || 1;
    const limitParam = req.query.limit as string;
    const limit = limitParam === 'all' || parseInt(limitParam) >= 100
      ? 'all'
      : parseInt(limitParam) || 10;

    if (!['images', 'pdfs', 'videos'].includes(mediaType)) {
      return next(createHttpError(400, 'Invalid mediaType parameter'));
    }
    if (!req.user) return next(createHttpError(401, 'User not authenticated'));

    const isAdmin = req.user.roles.includes('admin');
    const kind = mediaTypeToKind(mediaType);
    const where = isAdmin
      ? eq(mediaAssets.kind, kind)
      : and(eq(mediaAssets.kind, kind), eq(mediaAssets.userId, req.user.id));

    const [{ value: totalMediaCount }] = await db.select({ value: count() }).from(mediaAssets).where(where);

    const isAll = limit === 'all';
    const pageNum = isAll ? 1 : page;
    const limitNum = isAll ? Math.max(totalMediaCount, 1) : limit;
    const skip = isAll ? 0 : (pageNum - 1) * limitNum;

    const rows = await db
      .select()
      .from(mediaAssets)
      .where(where)
      .orderBy(desc(mediaAssets.uploadedAt))
      .limit(isAll ? undefined as any : limitNum)
      .offset(isAll ? 0 : skip);

    const totalPages = isAll ? 1 : Math.ceil(totalMediaCount / limitNum);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      items: rows,
      pagination: {
        page: pageNum,
        limit: isAll ? totalMediaCount : limitNum,
        totalItems: totalMediaCount,
        totalPages
      },
      message: 'Media retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

const uploadFileToCloudinary = async (file: Express.Multer.File, folder: string, resourceType: string, title?: string, description?: string) => {
  try {
    const filePath = file.path;

    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: resourceType as 'image' | 'video' | 'raw' | 'auto',
      context: {
        title: title || '',
        description: description || '',
      },
    });

    const fileData = {
      url: result.secure_url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: result.resource_type,
      pages: result.pages,
      bytes: result.bytes,
      etag: result.etag,
      assetFolder: result.asset_folder,
      assetId: result.asset_id,
      originalFilename: file.originalname,
    };

    await fs.promises.unlink(filePath); // Remove the file after upload
    return fileData;
  } catch (error) {
    console.error('Cloudinary Upload: Error uploading file:', file.originalname, error);
    throw error;
  }
};

export const addMedia = async (req: Request
  , res: Response, next: NextFunction) => {
  const { description, title } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    if (!req.user) return next(createHttpError(401, 'User not authenticated'));
    const userId = req.user.id;

    // Get Cloudinary credentials using unified service
    const credentials = await EncryptedKeyService.getCloudinaryCredentials(userId);

    if (!credentials) {
      return res.status(400).json({
        error: 'Missing Cloudinary credentials',
        message: 'Please configure your Cloudinary API credentials in settings before uploading media.',
        details: 'Go to Settings > API Configuration to add your Cloudinary credentials.'
      });
    }

    // Configure Cloudinary with decrypted credentials
    cloudinary.config(credentials);

    const uploads: { kind: MediaKind; folder: string; resourceType: string }[] = [
      { kind: 'image', folder: 'main/tour-cover/', resourceType: 'image' },
      { kind: 'pdf', folder: 'main/tour-pdf/', resourceType: 'raw' },
      { kind: 'video', folder: 'main/tour-video/', resourceType: 'video' },
    ];
    const fieldByKind: Record<MediaKind, string> = { image: 'imageList', pdf: 'pdf', video: 'video' };

    const insertedRows: (typeof mediaAssets.$inferSelect)[] = [];

    for (const { kind, folder, resourceType } of uploads) {
      const fieldFiles = files?.[fieldByKind[kind]];
      if (!fieldFiles) continue;

      for (const file of fieldFiles) {
        const data = await uploadFileToCloudinary(file, folder, resourceType, title, description);
        const [row] = await db.insert(mediaAssets).values({
          userId,
          kind,
          description,
          title,
          ...data,
        }).returning();
        insertedRows.push(row);
      }
    }

    return sendSuccess(res, { items: insertedRows }, 'Media uploaded successfully', 201);
  } catch (error) {
    console.error('AddMedia: Error during upload process:', error);
    return next(createHttpError(500, `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
};

const updateMediaTypeToKind: Record<string, MediaKind> = { image: 'image', video: 'video', raw: 'pdf' };

export const updateMedia = async (req: Request
  , res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { mediaId } = req.params;
    const { description, title, tags } = req.body;
    const { mediaType } = req.query as { mediaType: string };

    if (!mediaType || !updateMediaTypeToKind[mediaType]) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MEDIA_TYPE',
          message: 'Invalid media type',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    const [existing] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: 'Media not found',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    const [updated] = await db.update(mediaAssets).set({
      description: description ?? existing.description,
      title: title ?? existing.title,
      tags: tags ?? existing.tags,
    }).where(eq(mediaAssets.id, mediaId)).returning();

    return sendSuccess(res, updated, 'Media updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteMediaTypeToKind: Record<string, MediaKind> = { images: 'image', videos: 'video', PDF: 'pdf' };

export const deleteMedia = async (req: Request
  , res: Response, next: NextFunction) => {
  try {
    const { user } = req;
    const { imageIds, mediaType } = req.body; // Array of Cloudinary public_ids

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

    const kind = deleteMediaTypeToKind[mediaType];
    if (!kind) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MEDIA_TYPE',
          message: 'Invalid media type',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
    }

    // Get the actual owner of the media if the requester is admin
    let targetUserId = user.id;
    if (user.roles.includes('admin')) {
      const owner = await findUserByPublicId(imageIds[0], kind);
      if (typeof owner === 'string') {
        targetUserId = owner;
      } else {
        return res.status(404).json({
          error: {
            code: 'MEDIA_OWNER_NOT_FOUND',
            message: 'Media owner not found',
            details: owner.message,
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

    const mediaToDelete = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.userId, targetUserId), eq(mediaAssets.kind, kind), inArray(mediaAssets.publicId, imageIds)));

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
      const publicId = media.publicId;
      if (!publicId) {
        results.failed.push({ id: media.id, error: 'Invalid media URL' });
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

    // Remove successfully deleted media from the database
    if (results.success.length > 0) {
      await db
        .delete(mediaAssets)
        .where(and(eq(mediaAssets.userId, targetUserId), eq(mediaAssets.kind, kind), inArray(mediaAssets.publicId, results.success)));
    }

    const deleteResponse = {
      message: `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} deletion completed`,
      results
    };

    return sendSuccess(res, deleteResponse, 'Media deletion completed');
  } catch (error) {
    next(error);
  }
};

// Helper function to find a media owner by Cloudinary public_id
const findUserByPublicId = async (publicId: string, kind: MediaKind) => {
  try {
    const [media] = await db.select({ userId: mediaAssets.userId }).from(mediaAssets).where(and(eq(mediaAssets.publicId, publicId), eq(mediaAssets.kind, kind))).limit(1);
    if (!media) {
      return { message: 'No gallery found with this public_id' };
    }
    return media.userId;
  } catch (error) {
    throw new Error(`Error finding user by public_id: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
