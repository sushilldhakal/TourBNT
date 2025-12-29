
import Faqs from './faqModel';
import { Response, Request, NextFunction } from 'express';
import TourModel from '../../tours/tourModel';
import { sendSuccess, sendPaginatedResponse, HTTP_STATUS, handleUnauthorized, handleForbidden, handleResourceNotFound, handleInvalidId } from '../../../utils/apiResponse';


export const getUserFaqs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requestedUserId = req.params.userId; // Get from URL params
        const authenticatedUserId = req.user?.id;
        const userRole = req.user?.roles || [];

        if (!req.user) {
            return handleUnauthorized(res, 'Not authenticated');
        }

        let faqs;

        // Admin can view any user's FAQs
        if (userRole.includes('admin')) {
            faqs = await Faqs.find({ user: requestedUserId });
        } else {
            // Non-admin users can only view their own FAQs
            // requireOwnerOrAdmin middleware already ensures this, but double-check
            if (requestedUserId !== authenticatedUserId) {
                return handleForbidden(res, 'Not authorized to view these FAQs');
            }
            faqs = await Faqs.find({ user: authenticatedUserId });
        }

        sendSuccess(res, faqs, 'FAQs retrieved successfully');
    } catch (error) {
        console.error('Error fetching user FAQs:', error);
        return next(error);
    }
};

export const getAllFaqs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, skip } = (req as any).pagination;

        const [faqs, total] = await Promise.all([
            Faqs.find().skip(skip).limit(limit),
            Faqs.countDocuments()
        ]);

        const totalPages = Math.ceil(total / limit);

        sendPaginatedResponse(res, faqs, {
            page: page,
            limit: limit,
            totalItems: total,
            totalPages: totalPages
        }, 'FAQs retrieved successfully');
    } catch (error) {
        next(error);
    }
};

export const getSingleFaqs = async (req: Request, res: Response, next: NextFunction) => {
    const { faqId } = req.params;

    try {
        const faq = await Faqs.findById(faqId);
        if (!faq) {
            return handleResourceNotFound(res, 'FAQ not found');
        }

        // If user is authenticated, check ownership (optional - currently public)
        if (req.user) {
            const userId = req.user.id;
            const isAdmin = req.user.roles.includes('admin');

            // Only check ownership if user is authenticated (optional check)
            // Since this is a public route, we don't enforce ownership
            // But we can still return the FAQ
        }

        sendSuccess(res, { faq }, 'FAQ retrieved successfully');
    } catch (error) {
        console.error('Error fetching FAQ:', error);
        return next(error);
    }
};

export const addFaqs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return handleUnauthorized(res, 'Not authenticated');
        }
        const userId = req.user.id;  // Assuming user ID is available in the request
        const { question,
            answer } = req.body;

        const newFaqs = new Faqs({
            question,
            answer,
            user: userId,
        });

        await newFaqs.save();
        sendSuccess(res, newFaqs, 'FAQ created successfully', HTTP_STATUS.CREATED);
    } catch (error) {
        next(error);
    }
};


export const updateFaqs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const userId = req.user.id;  // Assuming user ID is available in the request

        const { faqId } = req.params;
        const { question, answer } = req.body;
        console.log("req.user", userId, faqId, question, answer)
        const faqs = await Faqs.findById(faqId);
        if (!faqs) {
            return handleResourceNotFound(res, 'FAQ not found');
        }

        if (faqs.user.toString() !== userId && !req.user?.roles.includes('admin')) {
            return handleForbidden(res, 'Not authorized to update this FAQ');
        }


        if (question) {
            faqs.question = question;
        }
        if (answer) {
            faqs.answer = answer;
        }
        await faqs.save();

        // Cascade update to all tours that use this FAQ
        console.log(`🔍 Looking for tours with faqId: ${faqId}`);

        const updateResult = await TourModel.updateMany(
            { 'faqs.faqId': faqId },
            {
                $set: {
                    'faqs.$[elem].question': question,
                    'faqs.$[elem].answer': answer,
                    'updatedAt': new Date()
                }
            },
            {
                arrayFilters: [{ 'elem.faqId': faqId }]
            }
        );

        console.log(`✅ CASCADE UPDATE: Updated ${updateResult.modifiedCount} tours with FAQ changes`);
        console.log(`   - FAQ ID: ${faqId}`);
        console.log(`   - New question: "${question}"`);
        console.log(`   - Tours matched: ${updateResult.matchedCount}`);
        console.log(`   - Tours modified: ${updateResult.modifiedCount}`);

        sendSuccess(res, {
            faqs,
            toursUpdated: updateResult.modifiedCount
        }, 'FAQ updated successfully');
    } catch (error) {
        next(error);
    }
};


export const deleteFaqs = async (req: Request
    , res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return handleUnauthorized(res, 'Not authenticated');
        }
        const userId = req.user.id;
        const { faqId } = req.params;
        const faqs = await Faqs.findById(faqId);

        if (!faqs) {
            return handleResourceNotFound(res, 'FAQ not found');
        }

        if (faqs.user.toString() !== userId && !req.user?.roles.includes('admin')) {
            return handleForbidden(res, 'Not authorized to delete this FAQ');
        }

        await Faqs.findByIdAndDelete(faqId);
        sendSuccess(res, null, 'FAQ deleted successfully', HTTP_STATUS.NO_CONTENT);
    } catch (error) {
        next(error);
    }
};

export const bulkDeleteFaqs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.roles;
        const { ids } = req.body; // Expecting an array of FAQ IDs

        if (!Array.isArray(ids) || ids.length === 0) {
            return handleInvalidId(res, 'Invalid or empty ids array');
        }

        console.log(`🗑️  Bulk delete request for ${ids.length} FAQs`);

        // Find all FAQs to verify ownership
        const faqsToDelete = await Faqs.find({ _id: { $in: ids } });

        const success: string[] = [];
        const failed: Array<{ id: string; error: string }> = [];

        // Process each FAQ
        for (const id of ids) {
            const faq = faqsToDelete.find(f => f._id.toString() === id);

            if (!faq) {
                failed.push({ id, error: 'FAQ not found' });
                continue;
            }

            // Check authorization
            if (faq.user.toString() !== userId && !userRole?.includes('admin')) {
                failed.push({ id, error: 'Not authorized to delete this FAQ' });
                continue;
            }

            try {
                await Faqs.findByIdAndDelete(id);
                success.push(id);
            } catch (err) {
                failed.push({ id, error: 'Failed to delete FAQ' });
            }
        }

        console.log(`✅ Bulk delete completed: ${success.length} succeeded, ${failed.length} failed`);

        sendSuccess(res, {
            success,
            failed
        }, 'Bulk delete operation completed');
    } catch (error) {
        console.error('Error in bulk delete FAQs:', error);
        next(error);
    }
};