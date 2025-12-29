import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { validateObjectId } from './middleware/validation';
import { upload } from '../../middlewares';
import { updateTourV2 } from './controllers/tourControllerV2';

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
    (req, res, next) => {
        // Use the upload middleware's .fields method directly here to avoid the lint error
        // and ensure correct middleware signature
        return (upload as any).fields([
            { name: 'coverImage', maxCount: 1 },
            { name: 'file', maxCount: 10 }
        ])(req, res, next);
    },
    updateTourV2  // Your new v2 controller with enhanced logic
);

export default tourRouterV2;