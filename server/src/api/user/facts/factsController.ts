import Facts from './factsModel';
import { Response, Request, NextFunction } from 'express';
import TourModel from '../../tours/tourModel';
import createHttpError from 'http-errors';
import { 
    sendSuccess, 
    sendPaginatedResponse,
    HTTP_STATUS, 
    sendAuthError,
    handleForbidden,
    handleUnauthorized,
    sendNotFoundError,
    handleResourceNotFound,
    sendValidationError,
    notFoundHandler
} from '../../../utils/apiResponse';
import { hybridPagination } from '../../../utils/paginationUtils';



export const getUserFacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requestedUserId = req.params.userId;
        const authenticatedUserId = req.user?.id;
        const userRole = req.user?.roles || [];

        if (!req.user) {
            return handleUnauthorized(res); // helper sends proper error
        }

        if (!userRole.includes('admin') && requestedUserId !== authenticatedUserId) {
            return handleForbidden(res, 'Not authorized to view these facts');
        }

        const facts = await Facts.find({ user: requestedUserId });

        sendSuccess(res, facts, 'Facts retrieved successfully');
    } catch (error) {
        next(error); // delegate unexpected errors to global errorHandler
    }
};


export const getAllFacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Use hybrid pagination utility
        return hybridPagination(
            Facts,
            {},
            req,
            res,
            {
                sort: { createdAt: -1 },
                memoryThreshold: 100,
                message: 'Facts retrieved successfully'
            }
        );
    } catch (error) {
        console.error('Error fetching facts:', error);
        next(error);
    }
};

export const getSingleFacts = async (req: Request, res: Response, next: NextFunction) => {
    const { factId } = req.params; // Note: param name should match route
    try {
        if (!req.user) {
            return handleUnauthorized(res);
        }

        const fact = await Facts.findById(factId);
        if (!fact) {
            return sendNotFoundError(res, 'Fact not found');
        }

        const userId = req.user.id;
        const isAdmin = req.user.roles.includes('admin');

        // Check ownership: user must be the owner or admin
        if (fact.user.toString() !== userId && !isAdmin) {
            return handleForbidden(res, 'Not authorized to view this fact');
        }

        sendSuccess(res, { fact }, 'Fact retrieved successfully');
    } catch (error) {
        return next(error);
    }
};

export const addFacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return handleUnauthorized(res, 'Not authenticated');
        }
        const userId = req.user.id;  // Assuming user ID is available in the request
        const { name,
            field_type,
            value,
            icon, } = req.body;

        const newFacts = new Facts({
            name,
            field_type,
            value,
            icon,
            user: userId,
        });

        await newFacts.save();
        sendSuccess(res, newFacts, 'Fact created successfully', HTTP_STATUS.CREATED);
    } catch (error) {
        next(error);
    }
};


export const updateFacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return handleUnauthorized(res, 'Not authenticated');
        }
        const userId = req.user.id;  // Assuming user ID is available in the request
        const { factId } = req.params;
        const { name, field_type, value, icon } = req.body;
        console.log("req.body", req.body, factId)
        const facts = await Facts.findById(factId);
        if (!facts) {
            return handleResourceNotFound(res, 'Fact not found');
        }

        if (facts.user.toString() !== userId && !req.user.roles.includes('admin')) {
            return handleForbidden(res, 'Not authorized to update this Fact');
        }

        // Update the master fact
        facts.name = name;
        facts.field_type = field_type;
        facts.value = value;
        facts.icon = icon;
        await facts.save();

        // Cascade update to all tours that use this fact
        // Update tours where facts array contains an item with factId matching this fact's _id

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

        
        sendSuccess(res, {
            facts,
            toursUpdated: updateResult.modifiedCount
        }, 'Fact updated successfully');
    } catch (error) {
        console.error('Error updating fact:', error);
        next(error);
    }
};


export const deleteFacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return handleUnauthorized(res, 'Not authenticated');
        }
        const userId = req.user.id;  // Assuming user ID is available in the request
        const { factsId } = req.params;
        const facts = await Facts.findById(factsId);
        if (!facts) {
            return handleResourceNotFound(res, 'Facts not found');
        }

        if (facts.user.toString() !== userId && !req.user.roles.includes('admin')) {
            return handleForbidden(res, 'Not authorized to delete this facts');
        }

        await Facts.findByIdAndDelete(factsId);
        sendSuccess(res, null, 'Fact deleted successfully', HTTP_STATUS.NO_CONTENT);
    } catch (error) {
        next(error);
    }
};

export const deleteMultipleFacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return handleUnauthorized(res, 'Not authenticated');
        }
        const userId = req.user.id;
        const userRole = req.user.roles;
        const { ids } = req.body; // Changed from factIds to ids for RESTful consistency

        if (!Array.isArray(ids) || ids.length === 0) {
            return sendValidationError(res, 'Invalid or empty ids array');
        }


        // Find all facts to verify ownership
        const factsToDelete = await Facts.find({ _id: { $in: ids } });

        if (factsToDelete.length === 0) {
            return handleResourceNotFound(res, 'No facts found with provided IDs');
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
            if (fact.user.toString() !== userId && !userRole.includes('admin')) {
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

        sendSuccess(res, {
            success,
            failed
        }, 'Bulk delete operation completed');
    } catch (error) {
        console.error('Error deleting multiple facts:', error);
        next(error);
    }
};