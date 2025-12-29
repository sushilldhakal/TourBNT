import { Request, Response, NextFunction } from 'express';
import { updateTour as updateTourV1 } from './tourController'; // Import v1 logic if needed

/**
 * Update tour - Version 2
 * Enhanced with new features, improved validation, etc.
 */
export const updateTourV2 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // V2 specific logic here
        // You can:
        // 1. Add new fields/validation
        // 2. Change response format
        // 3. Add new business logic
        // 4. Or even call v1 logic and enhance it

        console.log('🚀 Using Tour Update API v2');

        // Example: Add v2 specific processing
        const v2EnhancedData = {
            ...req.body,
            // Add v2 specific fields
            apiVersion: 'v2',
            enhancedFeatures: true,
            // New v2 validation or processing
        };

        // You could call v1 logic and enhance it:
        // return await updateTourV1(req, res, next);

        // Or implement completely new v2 logic:
        res.json({
            success: true,
            message: 'Tour updated successfully using API v2',
            data: v2EnhancedData,
            version: 'v2'
        });

    } catch (error) {
        next(error);
    }
};