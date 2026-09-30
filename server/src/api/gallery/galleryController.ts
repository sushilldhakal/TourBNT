import { Response, NextFunction } from 'express';
import { db, mediaAssets } from '@tourbnt/db';
import { eq, and, inArray, desc, count } from 'drizzle-orm';
import createHttpError from 'http-errors';
import {
  Request
} from '../../middlewares/authenticate';
import fs from 'fs';
import { uploadFileToR2, deleteFromR2 } from '../../config/r2Config';
import { ensureMediaFolder } from '../../services/mediaFolderService';
import { HTTP_STATUS, sendSuccess } from '../../utils/apiResponse';

type MediaKind = 'image' | 'video' | 'pdf';

// R2 has no live metadata-lookup API like Cloudinary's — everything a caller
// needs was already captured on the `media_assets` row at upload time, so a
// single owned-media DB read replaces the old credential-check + API round trip.
export const getSingleMedia = async (req: Request
  , res: Response, next: NextFunction) => {
  try {
    const { mediaId } = req.params;
    if (!mediaId) {
      return next(createHttpError(400, 'mediaId parameter is required'));
    }
    const authUser = req.user;
    if (!authUser) {
      return next(createHttpError(400, 'authentication is required'));
    }

    const [image] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
    if (!image) {
      return next(createHttpError(404, 'Image not found in gallery'));
    }

    const authUserId = authUser.id;
    const authUserRoles = authUser.roles;
    if (!authUserRoles.includes('admin') && image.userId !== authUserId) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'This image does not belong to you.',
        code: 'UNAUTHORIZED_MEDIA_ACCESS'
      });
    }

    const mediaResponse = {
      id: image.id,
      url: image.url,
      secure_url: image.secureUrl,
      description: image.description,
      title: image.title,
      tags: image.tags,
      uploadedAt: image.uploadedAt,
      asset_id: image.assetId,
      width: image.width,
      height: image.height,
      format: image.format,
      bytes: image.bytes,
      resource_type: image.resourceType,
      public_id: image.publicId,
    };

    return sendSuccess(res, mediaResponse, 'Media retrieved successfully');
  } catch (error: any) {
    console.error('getSingleMedia Error:', error);
    next(error);
  }
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
    // Page size is always bounded — `limit=all` / 100+ used to return the
    // whole media table. Callers that need more page through it.
    const MAX_MEDIA_LIMIT = 100;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), MAX_MEDIA_LIMIT);

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

    const skip = (page - 1) * limit;

    const rows = await db
      .select()
      .from(mediaAssets)
      .where(where)
      .orderBy(desc(mediaAssets.uploadedAt))
      .limit(limit)
      .offset(skip);

    const totalPages = Math.ceil(totalMediaCount / limit);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      items: rows,
      pagination: {
        page,
        limit,
        totalItems: totalMediaCount,
        totalPages
      },
      message: 'Media retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const addMedia = async (req: Request
  , res: Response, next: NextFunction) => {
  const { description, title } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    if (!req.user) return next(createHttpError(401, 'User not authenticated'));
    const userId = req.user.id;

    // Every seller/agent's tour media lives under their own folder in the
    // shared R2 bucket — created at onboarding approval, or lazily here as a
    // fallback (e.g. an admin uploading directly).
    const mediaFolder = await ensureMediaFolder(userId);

    const uploads: { kind: MediaKind; folder: string }[] = [
      { kind: 'image', folder: `tour-media/${mediaFolder}/tour-cover` },
      { kind: 'pdf', folder: `tour-media/${mediaFolder}/tour-pdf` },
      { kind: 'video', folder: `tour-media/${mediaFolder}/tour-video` },
    ];
    const fieldByKind: Record<MediaKind, string> = { image: 'imageList', pdf: 'pdf', video: 'video' };

    const insertedRows: (typeof mediaAssets.$inferSelect)[] = [];

    for (const { kind, folder } of uploads) {
      const fieldFiles = files?.[fieldByKind[kind]];
      if (!fieldFiles) continue;

      for (const file of fieldFiles) {
        const result = await uploadFileToR2(file.path, folder, file.originalname, file.mimetype);
        await fs.promises.unlink(file.path).catch(() => undefined);

        const [row] = await db.insert(mediaAssets).values({
          userId,
          kind,
          description,
          title,
          url: result.url,
          secureUrl: result.url,
          publicId: result.key,
          bytes: result.bytes,
          resourceType: kind,
          format: file.originalname.split('.').pop() || '',
          assetFolder: folder,
          originalFilename: file.originalname,
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
    const { imageIds, mediaType } = req.body; // Array of R2 object keys (media_assets.publicId)

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

    for (const media of mediaToDelete) {
      const publicId = media.publicId;
      if (!publicId) {
        results.failed.push({ id: media.id, error: 'Invalid media URL' });
        continue;
      }

      try {
        await deleteFromR2([publicId]);
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

// Helper function to find a media owner by R2 object key
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
