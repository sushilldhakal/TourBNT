import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { validateObjectId } from './middleware/validation';
import { upload } from '../../middlewares';
import { updateTour } from './controllers/tourController';

const tourRouterV2 = express.Router();

/**
 * @swagger
 * /api/v2/tours/{tourId}:
 *   patch:
 *     summary: Update tour (v2 - Enhanced version)
 *     description: Updated tour endpoint with new features in v2
 *     tags: [Tours V2]
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               # Your v2 specific fields here
 *     responses:
 *       200:
 *         description: Tour updated successfully (v2 format)
 */
tourRouterV2.patch(
    '/:tourId',
    authenticate,
    authorizeRoles('admin', 'seller'),
    validateObjectId(),
    // Already a multer .fields() handler for coverImage and file (calling .fields on it again threw).
    upload,
    updateTour
);

export default tourRouterV2;