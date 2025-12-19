
import express, { RequestHandler } from "express";
import { addMedia, deleteMedia, getMedia, getSingleMedia, updateMedia } from "./galleryController";
import { authenticate, authorizeRoles } from "../../middlewares/authenticate";
import { uploadMultiple, uploadNone } from "../../middlewares/multer";
import { asyncAuthHandler } from "../../utils/routeWrapper";
import { paginationMiddleware } from "../../middlewares/pagination";

const galleryRoutes = express.Router();

// RESTful Gallery Routes

// Get all media (Protected, Admin or Seller) - with pagination
/**
 * @swagger
 * /api/gallery:
 *   get:
 *     summary: Get all media
 *     description: Retrieve all gallery media items (admin/seller only)
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Media items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GalleryItem'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin/Seller access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
galleryRoutes.get(
    '/',
    authenticate,
    (req, res, next) => {
        // Normalize roles to lowercase for comparison
        if (req.user) {
            req.user.roles = req.user.roles.map((role: string) => role.toLowerCase());
        }
        next();
    },
    authorizeRoles('admin', 'seller') as RequestHandler,
    paginationMiddleware,
    asyncAuthHandler(getMedia)
);

// Upload media (Protected, Admin or Seller) - ONLY route with upload middleware
/**
 * @swagger
 * /api/gallery:
 *   post:
 *     summary: Upload media
 *     description: Upload one or more media files to the gallery
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Media files to upload
 *               caption:
 *                 type: string
 *                 description: Caption for the media
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GalleryItem'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
galleryRoutes.post(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    uploadMultiple,
    asyncAuthHandler(addMedia)
);

// Bulk delete media (Protected, Admin or Seller)
/**
 * @swagger
 * /api/gallery:
 *   delete:
 *     summary: Bulk delete media
 *     description: Delete multiple media items from the gallery
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of media IDs to delete
 *               mediaType:
 *                 type: string
 *                 enum: [images, videos, PDF]
 *                 description: Type of media to delete
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
galleryRoutes.delete(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(deleteMedia)
);

// Get single media by ID (Public)
/**
 * @swagger
 * /api/gallery/{mediaId}:
 *   get:
 *     summary: Get media by ID
 *     description: Retrieve a specific media item by its ID
 *     tags: [Gallery]
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media item retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GalleryItem'
 *       404:
 *         description: Media not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
galleryRoutes.get('/:mediaId', authenticate, getSingleMedia as any);

// Update media (Protected, Admin or Seller)
/**
 * @swagger
 * /api/gallery/{mediaId}:
 *   patch:
 *     summary: Update media
 *     description: Update media item details (caption, etc.)
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Media ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caption:
 *                 type: string
 *     responses:
 *       200:
 *         description: Media updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GalleryItem'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
galleryRoutes.patch(
    '/:mediaId',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    uploadNone,
    asyncAuthHandler(updateMedia)
);

export default galleryRoutes;