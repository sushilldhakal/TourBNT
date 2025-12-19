
import Faqs from './faqModel';
import { Response, Request, NextFunction } from 'express';
import TourModel from '../../tours/tourModel';
import createHttpError from 'http-errors';


export const getUserFaqs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requestedUserId = req.params.userId; // Get from URL params
        const authenticatedUserId = req.user?.id;
        const userRole = req.user?.roles || [];

        if (!req.user) {
            return next(createHttpError(401, 'Not authenticated'));
        }

        let faqs;

        // Admin can view any user's FAQs
        if (userRole.includes('admin')) {
            faqs = await Faqs.find({ user: requestedUserId });
        } else {
            // Non-admin users can only view their own FAQs
            // requireOwnerOrAdmin middleware already ensures this, but double-check
            if (requestedUserId !== authenticatedUserId) {
                return next(createHttpError(403, 'Not authorized to view these FAQs'));
            }
            faqs = await Faqs.find({ user: authenticatedUserId });
        }

        // Transform FAQs for response
        const transformedFaqs = faqs.map(faq => ({
            id: faq._id,
            _id: faq._id,
            question: faq.question,
            answer: faq.answer,
            user: faq.user,
        }));

        res.status(200).json(transformedFaqs);
    } catch (error) {
        console.error('Error fetching user FAQs:', error);
        return next(createHttpError(500, 'Failed to fetch FAQs'));
    }
};

export const getAllFaqs = async (req: Request
, res: Response, next: NextFunction) => {
    try {
        const { page, limit, skip } = (req as any).pagination;

        const [faqs, total] = await Promise.all([
            Faqs.find().skip(skip).limit(limit),
            Faqs.countDocuments()
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            faqs,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        res.status(500).json({ message: 'Failed to fetch FAQs' });
    }
};

export const getSingleFaqs = async (req: Request, res: Response, next: NextFunction) => {
    const { faqId } = req.params;

    try {
        const faq = await Faqs.findById(faqId);
        if (!faq) {
            return next(createHttpError(404, 'FAQ not found'));
        }

        // If user is authenticated, check ownership (optional - currently public)
        if (req.user) {
            const userId = req.user.id;
            const isAdmin = req.user.roles.includes('admin');
            
            // Only check ownership if user is authenticated (optional check)
            // Since this is a public route, we don't enforce ownership
            // But we can still return the FAQ
        }

        res.status(200).json({ faq });
    } catch (error) {
        console.error('Error fetching FAQ:', error);
        return next(createHttpError(500, 'Failed to fetch FAQ'));
    }
};

export const addFaqs = async (req: Request
, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
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
        res.status(201).json(newFaqs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add faqs' });
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
            return res.status(404).json({ message: 'FAQ not found' });
        }

        if (faqs.user.toString() !== userId && !req.user?.roles.includes('admin')) {
            return res.status(403).json({ message: 'Not authorized to update this FAQ' });
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

        res.status(200).json({
            faqs,
            toursUpdated: updateResult.modifiedCount
        });
    } catch (error) {
        console.error('Error updating FAQ:', error);
        res.status(500).json({ message: 'Failed to update FAQ' });
    }
};


export const deleteFaqs = async (req: Request
, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { faqId } = req.params;
        const faqs = await Faqs.findById(faqId);

        if (!faqs) {
            return res.status(404).json({ message: 'FAQ not found' });
        }

        if (faqs.user.toString() !== userId && !req.user?.roles.includes('admin')) {
            return res.status(403).json({ message: 'Not authorized to delete this FAQ' });
        }

        await Faqs.findByIdAndDelete(faqId);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        res.status(500).json({ message: 'Failed to delete FAQ' });
    }
};

export const bulkDeleteFaqs = async (req: Request
, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.roles;
        const { ids } = req.body; // Expecting an array of FAQ IDs

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

        res.status(200).json({
            success,
            failed
        });
    } catch (error) {
        console.error('Error in bulk delete FAQs:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete FAQs',
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
};