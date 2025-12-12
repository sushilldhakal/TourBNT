
import express, { RequestHandler } from "express";
import { addMedia, deleteMedia, getMedia, getSingleMedia, updateMedia } from "./galleryController";
import { authenticate, isAdminOrSeller, AuthRequest } from "../../middlewares/authenticate";
import { uploadMultiple, uploadNone } from "../../middlewares/multer";
import { asyncHandler } from "../../utils/routeWrapper";

const galleryRoutes = express.Router();

// Get all media (Protected, Admin or Seller)
galleryRoutes.get(
    '/media',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(getMedia)
);

// Get single media by public ID (Public)
galleryRoutes.get('/:publicId', asyncHandler(getSingleMedia));

// Add media (Protected)
galleryRoutes.post(
    '/:userId/',
    authenticate,
    uploadMultiple,
    asyncHandler<AuthRequest>(addMedia)
);

// Update media (Protected)
galleryRoutes.patch(
    '/:userId/:imageId',
    authenticate,
    uploadNone,
    asyncHandler<AuthRequest>(updateMedia)
);

// Delete media (Protected)
galleryRoutes.delete(
    '/:userId',
    authenticate,
    asyncHandler<AuthRequest>(deleteMedia)
);

export default galleryRoutes;