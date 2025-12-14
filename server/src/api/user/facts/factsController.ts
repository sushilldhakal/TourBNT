import { AuthRequest } from './../../../middlewares/authenticate';
import Facts from './factsModel';
import { Response, Request, NextFunction } from 'express';
import TourModel from '../../tours/tourModel';



export const getUserFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const requestedUserId = req.params.userId;  // User ID from URL params
        const authenticatedUserId = req.userId;  // Authenticated user ID
        const userRole = req.roles;  // User role

        let facts;

        // Admin can view any user's facts
        if (userRole === 'admin') {
            if (requestedUserId) {
                facts = await Facts.find({ user: requestedUserId });
            } else {
                facts = await Facts.find();  // All facts if no specific user requested
            }
        } else {
            // Non-admin users can only view their own facts
            if (requestedUserId && requestedUserId !== authenticatedUserId) {
                return res.status(403).json({ message: 'Not authorized to view these facts' });
            }
            facts = await Facts.find({ user: authenticatedUserId });
        }

        // Transform facts for response
        const transformedFacts = facts.map(fact => ({
            id: fact._id,
            _id: fact._id,  // Include both for compatibility
            name: fact.name,
            field_type: fact.field_type,
            value: fact.value,
            icon: fact.icon,
            user: fact.user,
        }));

        console.log("transformedFacts", transformedFacts);
        res.status(200).json(transformedFacts);
    } catch (error) {
        console.error('Error fetching user facts:', error);
        res.status(500).json({ message: 'Failed to fetch facts' });
    }
};

export const getAllFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };

        // Get total count for pagination metadata
        const total = await Facts.countDocuments();

        // Get paginated facts
        const facts = await Facts.find()
            .skip(skip)
            .limit(limit);

        // Calculate total pages
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            facts,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching facts:', error);
        res.status(500).json({ message: 'Failed to fetch facts' });
    }
};

export const getSingleFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { factsId } = req.params;
    try {
        let facts;
        facts = await Facts.findById(factsId);  // Admin can view all facts
        res.status(200).json({ facts });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch facts' });
    }
};

export const addFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { name,
            field_type,
            value,
            icon, } = req.body;

        console.log("req.body", req.body)
        const newFacts = new Facts({
            name,
            field_type,
            value,
            icon,
            user: userId,
        });

        await newFacts.save();
        res.status(201).json(newFacts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add facts' });
    }
};


export const updateFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { factId } = req.params;
        const { name, field_type, value, icon } = req.body;
        console.log("req.body", req.body, factId)
        const facts = await Facts.findById(factId);
        if (!facts) {
            return res.status(404).json({ message: 'Fact not found' });
        }

        if (facts.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this Fact' });
        }

        // Update the master fact
        facts.name = name;
        facts.field_type = field_type;
        facts.value = value;
        facts.icon = icon;
        await facts.save();

        // Cascade update to all tours that use this fact
        // Update tours where facts array contains an item with factId matching this fact's _id
        console.log(`🔍 Looking for tours with factId: ${factId}`);

        const updateResult = await TourModel.updateMany(
            { 'facts.factId': factId },
            {
                $set: {
                    'facts.$[elem].title': name,
                    'facts.$[elem].icon': icon,
                    'facts.$[elem].field_type': field_type,
                    'updatedAt': new Date()
                }
            },
            {
                arrayFilters: [{ 'elem.factId': factId }]
            }
        );

        console.log(`✅ CASCADE UPDATE: Updated ${updateResult.modifiedCount} tours with fact changes`);
        console.log(`   - Fact ID: ${factId}`);
        console.log(`   - New name: "${name}"`);
        console.log(`   - Tours matched: ${updateResult.matchedCount}`);
        console.log(`   - Tours modified: ${updateResult.modifiedCount}`);

        res.status(200).json({
            facts,
            toursUpdated: updateResult.modifiedCount
        });
    } catch (error) {
        console.error('Error updating fact:', error);
        res.status(500).json({ message: 'Failed to update Fact' });
    }
};


export const deleteFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { factsId } = req.params;
        const facts = await Facts.findById(factsId);
        if (!facts) {
            return res.status(404).json({ message: 'Facts not found' });
        }

        if (facts.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this facts' });
        }

        await Facts.findByIdAndDelete(factsId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete facts' });
    }
};

export const deleteMultipleFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        const userRole = req.roles;
        const { ids } = req.body; // Changed from factIds to ids for RESTful consistency

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Invalid or empty ids array',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        console.log(`🗑️  Bulk delete request for ${ids.length} facts`);

        // Find all facts to verify ownership
        const factsToDelete = await Facts.find({ _id: { $in: ids } });

        if (factsToDelete.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'No facts found with provided IDs',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Process each fact and track results
        const success: string[] = [];
        const failed: Array<{ id: string; error: string }> = [];

        for (const factId of ids) {
            const fact = factsToDelete.find(f => f._id.toString() === factId);

            if (!fact) {
                failed.push({ id: factId, error: 'Not found' });
                continue;
            }

            // Check authorization
            if (fact.user.toString() !== userId && userRole !== 'admin') {
                failed.push({ id: factId, error: 'Not authorized' });
                continue;
            }

            // Delete the fact
            try {
                await Facts.findByIdAndDelete(factId);
                success.push(factId);
            } catch (error) {
                failed.push({ id: factId, error: 'Delete failed' });
            }
        }

        console.log(`✅ Bulk delete completed`);
        console.log(`   - Requested: ${ids.length}`);
        console.log(`   - Success: ${success.length}`);
        console.log(`   - Failed: ${failed.length}`);

        res.status(200).json({
            success,
            failed
        });
    } catch (error) {
        console.error('Error deleting multiple facts:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete facts',
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
};