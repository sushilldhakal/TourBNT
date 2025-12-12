import { AuthRequest } from './../../../middlewares/authenticate';
import Faqs from './faqModel';
import { Response, Request, NextFunction } from 'express';
import TourModel from '../../tours/tourModel';



export const getUserFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const requestedUserId = req.params.userId;  // User ID from URL params
        const authenticatedUserId = req.userId;  // Authenticated user ID
        const userRole = req.roles;  // User role

        let faqs;

        // Admin can view any user's FAQs
        if (userRole === 'admin') {
            if (requestedUserId) {
                faqs = await Faqs.find({ user: requestedUserId });
            } else {
                faqs = await Faqs.find();  // All FAQs if no specific user requested
            }
        } else {
            // Non-admin users can only view their own FAQs
            if (requestedUserId && requestedUserId !== authenticatedUserId) {
                return res.status(403).json({ message: 'Not authorized to view these FAQs' });
            }
            faqs = await Faqs.find({ user: authenticatedUserId });
        }

        // Transform FAQs for response
        const transformedFaqs = faqs.map(faq => ({
            id: faq._id,
            _id: faq._id,  // Include both for compatibility
            question: faq.question,
            answer: faq.answer,
            user: faq.user,
        }));

        console.log("transformedFaqs", transformedFaqs);
        res.status(200).json(transformedFaqs);
    } catch (error) {
        console.error('Error fetching user FAQs:', error);
        res.status(500).json({ message: 'Failed to fetch FAQs' });
    }
};

export const getAllFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let faqs;
        faqs = await Faqs.find();  // Admin can view all faqs
        res.status(200).json({ faqs });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch faqs' });
    }
};

export const getSingleFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { faqId } = req.params;

    try {
        let faqs;
        faqs = await Faqs.findById(faqId);  // Admin can view all faqs
        res.status(200).json({ faqs });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch faqs' });
    }
};

export const addFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
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


export const updateFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { faqId } = req.params;
        const { question, answer } = req.body;
        const faqs = await Faqs.findById(faqId);
        if (!faqs) {
            return res.status(404).json({ message: 'FAQ not found' });
        }

        if (faqs.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this FAQ' });
        }

        // Update the master FAQ
        faqs.question = question;
        faqs.answer = answer;
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


export const deleteFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { faqsId } = req.params;
        const faqs = await Faqs.findById(faqsId);
        if (!faqs) {
            return res.status(404).json({ message: 'Faqs not found' });
        }

        if (faqs.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this faqs' });
        }

        await Faqs.findByIdAndDelete(faqsId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete faqs' });
    }
};

export const deleteMultipleFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        const userRole = req.roles;
        const { faqIds } = req.body; // Expecting an array of FAQ IDs

        if (!Array.isArray(faqIds) || faqIds.length === 0) {
            return res.status(400).json({ message: 'Invalid or empty faqIds array' });
        }

        console.log(`🗑️  Bulk delete request for ${faqIds.length} FAQs`);

        // Find all FAQs to verify ownership
        const faqsToDelete = await Faqs.find({ _id: { $in: faqIds } });

        if (faqsToDelete.length === 0) {
            return res.status(404).json({ message: 'No FAQs found with provided IDs' });
        }

        // Check authorization for each FAQ
        const unauthorizedFaqs = faqsToDelete.filter(
            faq => faq.user.toString() !== userId && userRole !== 'admin'
        );

        if (unauthorizedFaqs.length > 0) {
            return res.status(403).json({
                message: 'Not authorized to delete some FAQs',
                unauthorizedCount: unauthorizedFaqs.length
            });
        }

        // Delete all authorized FAQs
        const deleteResult = await Faqs.deleteMany({ _id: { $in: faqIds } });

        console.log(`✅ Successfully deleted ${deleteResult.deletedCount} FAQs`);
        console.log(`   - Requested: ${faqIds.length}`);
        console.log(`   - Found: ${faqsToDelete.length}`);
        console.log(`   - Deleted: ${deleteResult.deletedCount}`);

        res.status(200).json({
            message: 'FAQs deleted successfully',
            deletedCount: deleteResult.deletedCount,
            requestedCount: faqIds.length
        });
    } catch (error) {
        console.error('Error deleting multiple FAQs:', error);
        res.status(500).json({ message: 'Failed to delete FAQs' });
    }
};