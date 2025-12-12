import { Request, Response } from 'express';
import TourModel from '../tourModel';
import FactsModel from '../../user/facts/factsModel';

/**
 * Migration endpoint to add factId to existing tours
 * This matches facts by name and stores the master fact's _id as factId
 */
export const migrateTourFacts = async (req: Request, res: Response) => {
    try {
        const tours = await TourModel.find({ 'facts.0': { $exists: true } });
        let toursUpdated = 0;
        let factsUpdated = 0;

        for (const tour of tours) {
            let hasChanges = false;

            if (tour.facts && Array.isArray(tour.facts)) {
                for (const fact of tour.facts) {
                    // Only process facts that don't have factId yet
                    if (!fact.factId && fact.title) {
                        // Find matching master fact by name
                        const masterFact = await FactsModel.findOne({ name: fact.title }).lean();
                        if (masterFact) {
                            fact.factId = masterFact._id.toString();
                            hasChanges = true;
                            factsUpdated++;
                            console.log(`Matched fact "${fact.title}" with factId ${masterFact._id}`);
                        } else {
                            console.log(`No master fact found for "${fact.title}"`);
                        }
                    }
                }
            }

            if (hasChanges) {
                tour.updatedAt = new Date();
                await tour.save();
                toursUpdated++;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Migration completed successfully',
            toursProcessed: tours.length,
            toursUpdated,
            factsUpdated
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
