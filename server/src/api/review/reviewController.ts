import { Request, Response } from 'express';
import Tour from '../tours/tourModel';
import mongoose from 'mongoose';
import { Review } from './reviewModel';

// Get average rating for a tour
export const getTourRating = async (req: Request, res: Response) => {
    try {
        const { tourId } = req.params;

        const stats = await Review.aggregate([
            {
                $match: { tour: new mongoose.Types.ObjectId(tourId) }
            },
            {
                $group: {
                    _id: '$tour',
                    averageRating: { $avg: '$rating' },
                    numberOfReviews: { $sum: 1 }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.json({
                averageRating: 0,
                numberOfReviews: 0
            });
        }

        res.json({
            averageRating: stats[0].averageRating,
            numberOfReviews: stats[0].numberOfReviews
        });
    } catch (error) {
        res.status(500).json({ message: 'Error calculating tour rating', error });
    }
};

// Get all approved reviews (public endpoint for guest users)
export const getAllApprovedReviews = async (req: Request, res: Response) => {
    console.log("getAllApprovedReviews")
    try {
        // Get pagination params from middleware
        const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };

        // Get filter and sort params from middleware
        const filters = req.filters || {};
        const sort = req.sort;

        // Import the Tour model here to avoid circular dependencies
        const Tour = require('../tours/tourModel').default;

        // Build query for filtering
        const statusFilter = filters.status || 'approved';

        // Find tours with reviews matching the status filter
        const tours = await Tour.find({ [`reviews.status`]: statusFilter })
            .select('title slug images reviews')
            .populate({
                path: 'reviews.user',
                select: 'name email profileImage'
            })
            .populate({
                path: 'reviews.replies.user',
                select: 'name email profileImage'
            })
            .setOptions({ strictPopulate: false }) // Added to fix StrictPopulateError
            .lean();

        // Extract all reviews matching the status filter from all tours
        let allReviews: Array<any> = [];

        for (const tour of tours) {
            const filteredReviews = tour.reviews
                .filter((review: any) => review.status === statusFilter)
                .map((review: any) => ({
                    ...review,
                    tourId: tour._id,
                    tourTitle: tour.title,
                    tourSlug: tour.slug,
                    tourImage: tour.images && tour.images.length > 0 ? tour.images[0] : null
                }));

            allReviews = [...allReviews, ...filteredReviews];
        }

        // Apply sorting
        if (sort) {
            allReviews.sort((a: any, b: any) => {
                const aValue = a[sort.field];
                const bValue = b[sort.field];

                if (sort.field === 'createdAt') {
                    const aTime = new Date(aValue).getTime();
                    const bTime = new Date(bValue).getTime();
                    return sort.order === 'asc' ? aTime - bTime : bTime - aTime;
                } else if (sort.field === 'rating') {
                    return sort.order === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
            });
        } else {
            // Default sort: by rating (highest first) and then by date (newest first)
            allReviews.sort((a: any, b: any) => {
                if (b.rating !== a.rating) {
                    return b.rating - a.rating;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        }

        // Calculate total and pagination
        const total = allReviews.length;
        const totalPages = Math.ceil(total / limit);

        // Apply pagination
        const paginatedReviews = allReviews.slice(skip, skip + limit);

        console.log(`Found ${total} reviews, returning page ${page} with ${paginatedReviews.length} reviews`);

        res.json({
            reviews: paginatedReviews,
            total,
            page,
            limit,
            totalPages
        });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Error fetching reviews',
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
};

// Add a review to a tour (using embedded reviews in tour model)
export const addReview = async (req: Request, res: Response) => {
    try {
        const { tourId } = req.params;
        const { rating, comment } = req.body;
        const userId = (req as Request
).user?.id;

        // Ensure user is authenticated
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to add a review' });
        }

        if (!mongoose.Types.ObjectId.isValid(tourId)) {
            return res.status(400).json({ message: 'Invalid tour ID' });
        }

        // Validate rating (now allowing 0.5 increments)
        if (!rating || rating < 0.5 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 0.5 and 5' });
        }

        // Round rating to nearest 0.5
        const roundedRating = Math.round(rating * 2) / 2;

        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({ message: 'Tour not found' });
        }

        // Check if user has already reviewed this tour
        const existingReviewIndex = tour.reviews.findIndex(
            (review: any) => review.user.toString() === userId
        );

        if (existingReviewIndex !== -1) {
            // Update existing review
            tour.reviews[existingReviewIndex].rating = roundedRating;
            tour.reviews[existingReviewIndex].comment = comment;
            tour.reviews[existingReviewIndex].status = 'pending'; // Reset to pending when updated
            tour.reviews[existingReviewIndex].createdAt = new Date();
        } else {
            // Add new review
            tour.reviews.push({
                user: new mongoose.Types.ObjectId(userId),
                tour: new mongoose.Types.ObjectId(tourId), // Add the tour reference to satisfy validation
                rating: roundedRating,
                comment,
                status: 'pending', // All new reviews start as pending
                likes: 0,
                views: 0,
                replies: [],
                createdAt: new Date()
            });
        }

        // Save the tour - the pre-save hook will handle recalculating ratings
        await tour.save();

        // Increment the view counter for the tour
        await Tour.findByIdAndUpdate(tourId, { $inc: { views: 1 } });

        res.status(200).json({
            success: true,
            message: existingReviewIndex !== -1 ? 'Review updated successfully' : 'Review added successfully. It will be visible after approval.',
            data: {
                review: existingReviewIndex !== -1 ? tour.reviews[existingReviewIndex] : tour.reviews[tour.reviews.length - 1],
                averageRating: tour.averageRating,
                reviewCount: tour.reviewCount,
                approvedReviewCount: tour.approvedReviewCount || 0
            }
        });
    } catch (error) {
        console.error('Error in addReview:', error);
        res.status(500).json({ message: 'Failed to add review', error });
    }
};

// Get reviews for a tour (using embedded reviews in tour model)
export const getTourReviews = async (req: Request, res: Response) => {
    console.log("Getting reviews for tour:", req.params.tourId);
    try {
        const { tourId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status as string || 'all'; // Default to showing all reviews instead of just approved

        if (!mongoose.Types.ObjectId.isValid(tourId)) {
            return res.status(400).json({ message: 'Invalid tour ID' });
        }

        // Find the tour with populated user info but handle replies more carefully
        const tour = await Tour.findById(tourId)
            .populate({
                path: 'reviews.user',
                select: 'name email profileImage roles'
            })
        // Removed the problematic populate for replies.user since it's not in the schema;

        if (!tour) {
            return res.status(404).json({ message: 'Tour not found' });
        }

        // Filter reviews by status if specified
        let filteredReviews = tour.reviews;
        if (status !== 'all') {
            filteredReviews = tour.reviews.filter((review: any) => review.status === status);
        }

        // Sort reviews by date (newest first) and apply pagination
        const sortedReviews = filteredReviews.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const paginatedReviews = sortedReviews.slice(skip, skip + limit);

        // Increment view counter for each review being viewed
        for (const review of paginatedReviews) {
            await Tour.updateOne(
                { _id: tourId, "reviews._id": review._id },
                { $inc: { "reviews.$.views": 1 } }
            );
        }

        res.status(200).json({
            success: true,
            data: {
                reviews: paginatedReviews,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(filteredReviews.length / limit),
                    totalItems: filteredReviews.length,
                    itemsPerPage: limit
                },
                averageRating: tour.averageRating,
                reviewCount: tour.reviewCount,
                approvedReviewCount: tour.approvedReviewCount || 0
            }
        });
    } catch (error) {
        console.error('Error in getTourReviews:', error);
        res.status(500).json({ message: 'Failed to get reviews', error });
    }
};

// Get pending reviews for a seller's tours (using embedded reviews in tour model)
export const getPendingReviews = async (req: Request, res: Response) => {
    try {
        const authReq = req as Request
;
        const userId = authReq.user?.id;

        // Ensure user is authenticated
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'You must be logged in to view pending reviews',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Check if user is admin
        const isAdmin = authReq.user?.roles.includes('admin') || false;

        // Find all tours with pending reviews (admin sees all, sellers see only their own)
        const query = isAdmin
            ? { 'reviews.status': 'pending' }
            : { author: userId, 'reviews.status': 'pending' };

        const tours = await Tour.find(query).populate({
            path: 'reviews.user',
            select: 'name email profileImage roles'
        });

        if (!tours || tours.length === 0) {
            return res.status(200).json({
                reviews: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            });
        }

        // Extract all pending reviews from all tours
        const pendingReviews = tours.flatMap(tour => {
            const tourReviews = tour.reviews.filter((review: any) => review.status === 'pending');
            return tourReviews.map((review: any) => ({
                ...review.toObject(),
                tourId: tour._id,
                tourTitle: tour.title
            }));
        });

        // Sort reviews by date (newest first) and apply pagination
        const sortedReviews = pendingReviews.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const total = sortedReviews.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedReviews = sortedReviews.slice(skip, skip + limit);

        res.status(200).json({
            reviews: paginatedReviews,
            total,
            page,
            limit,
            totalPages
        });
    } catch (error) {
        console.error('Error in getPendingReviews:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get pending reviews',
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
};

// Get all reviews for a seller (regardless of status) (using embedded reviews in tour model)
export const getAllReviews = async (req: Request, res: Response) => {
    try {
        const authReq = req as Request
;
        const userId = authReq.user?.id;

        // Ensure user is authenticated
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to view reviews' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50; // Increased limit to show more reviews
        const skip = (page - 1) * limit;

        // Check if the user is an admin
        const isAdmin = authReq.user?.roles.includes('admin') || false;

        let tours;
        if (isAdmin) {
            // Admins can see all tours with reviews
            tours = await Tour.find({}).populate({
                path: 'reviews.user',
                select: 'name email profileImage roles'
            }).populate({
                path: 'reviews.replies.user',
                select: 'name email profileImage roles'
            });
        } else {
            // Regular sellers can only see their own tours with reviews
            tours = await Tour.find({
                author: userId
            }).populate({
                path: 'reviews.user',
                select: 'name email profileImage roles'
            }).populate({
                path: 'reviews.replies.user',
                select: 'name email profileImage roles'
            });
        }

        if (!tours || tours.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No reviews found',
                data: {
                    reviews: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: limit
                    }
                }
            });
        }

        // Extract all reviews from all tours
        const allReviews: Array<any> = [];

        // Loop through each tour and extract its reviews
        for (const tour of tours) {
            if (tour.reviews && tour.reviews.length > 0) {
                // Map each review to include the tour information
                const tourReviews = tour.reviews.map((review: any) => {
                    const reviewObj = review.toObject ? review.toObject() : review;
                    return {
                        ...reviewObj,
                        tourId: tour._id,
                        tourTitle: tour.title
                    };
                });

                // Add these reviews to our collection
                allReviews.push(...tourReviews);
            }
        }

        // Sort reviews by date (newest first) and apply pagination
        const sortedReviews = allReviews.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const paginatedReviews = sortedReviews.slice(skip, skip + limit);
        console.log('Returning paginated reviews:', paginatedReviews.length);

        res.status(200).json({
            success: true,
            data: {
                reviews: paginatedReviews,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(allReviews.length / limit),
                    totalItems: allReviews.length,
                    itemsPerPage: limit
                }
            }
        });
    } catch (error) {
        console.error('Error in getAllReviews:', error);
        res.status(500).json({ message: 'Failed to get reviews', error });
    }
};

// Approve or reject a review (using embedded reviews in tour model) - UPDATED for RESTful pattern
export const updateReviewStatus = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const { status } = req.body; // 'approved', 'rejected', or 'pending'
        const authReq = req as Request
;
        const userId = authReq.user?.id;

        // Validate inputs
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_REVIEW_ID',
                    message: 'Invalid review ID',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_STATUS',
                    message: 'Status must be either "approved", "rejected", or "pending"',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Check if user is admin
        const isAdmin = authReq.user?.roles.includes('admin') || false;

        // Find the tour containing this review
        const tour = await Tour.findOne({ 'reviews._id': reviewId });

        if (!tour) {
            return res.status(404).json({
                error: {
                    code: 'REVIEW_NOT_FOUND',
                    message: 'Review not found',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Check authorization: admin can update any review, sellers can only update reviews on their tours
        if (!isAdmin && tour.author.toString() !== userId) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'You are not authorized to manage this review',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Find the review
        const reviewIndex = tour.reviews.findIndex(
            (review: any) => review._id.toString() === reviewId
        );

        if (reviewIndex === -1) {
            return res.status(404).json({
                error: {
                    code: 'REVIEW_NOT_FOUND',
                    message: 'Review not found',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Update the review status
        tour.reviews[reviewIndex].status = status;

        // Save the tour - the pre-save hook will handle recalculating ratings
        await tour.save();

        res.status(200).json({
            review: tour.reviews[reviewIndex],
            averageRating: tour.averageRating,
            reviewCount: tour.reviewCount,
            approvedReviewCount: tour.approvedReviewCount || 0
        });
    } catch (error) {
        console.error('Error in updateReviewStatus:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to update review status`,
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
};

// Add a reply to a review (using embedded reviews in tour model) - UPDATED for RESTful pattern
export const addReviewReply = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const { comment } = req.body;
        const userId = (req as Request
).user?.id;

        // Ensure user is authenticated
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'You must be logged in to reply to a review',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_REVIEW_ID',
                    message: 'Invalid review ID',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        if (!comment || comment.trim() === '') {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Reply comment is required',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Find the tour containing this review
        const tour = await Tour.findOne({ 'reviews._id': reviewId });
        if (!tour) {
            return res.status(404).json({
                error: {
                    code: 'REVIEW_NOT_FOUND',
                    message: 'Review not found',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Find the review
        const reviewIndex = tour.reviews.findIndex(
            (review: any) => review._id.toString() === reviewId
        );

        if (reviewIndex === -1) {
            return res.status(404).json({
                error: {
                    code: 'REVIEW_NOT_FOUND',
                    message: 'Review not found',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Add the reply
        const newReply = {
            user: new mongoose.Types.ObjectId(userId),
            comment,
            createdAt: new Date(),
            likes: 0,
            views: 0
        };

        tour.reviews[reviewIndex].replies.push(newReply);

        // Save the tour
        await tour.save();

        // Populate the user data for the new reply
        const populatedTour = await Tour.findOne({ 'reviews._id': reviewId })
            .populate({
                path: 'reviews.replies.user',
                select: 'name email profileImage roles'
            });

        const updatedReview = populatedTour?.reviews[reviewIndex];
        const newReplyWithUser = updatedReview?.replies[updatedReview.replies.length - 1];

        res.status(201).json({
            reply: newReplyWithUser
        });
    } catch (error) {
        console.error('Error in addReviewReply:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to add reply',
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
};

// Like a review (using embedded reviews in tour model) - UPDATED for RESTful pattern
export const likeReview = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const userId = (req as Request
).user?.id;

        // Ensure user is authenticated
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'You must be logged in to like a review',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_REVIEW_ID',
                    message: 'Invalid review ID',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Update the review's likes count
        const result = await Tour.updateOne(
            { "reviews._id": reviewId },
            { $inc: { "reviews.$.likes": 1 } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: {
                    code: 'REVIEW_NOT_FOUND',
                    message: 'Review not found',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        res.status(200).json({
            message: 'Review liked successfully'
        });
    } catch (error) {
        console.error('Error in likeReview:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to like review',
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
};

// Like a review reply (using embedded reviews in tour model)
export const likeReviewReply = async (req: Request, res: Response) => {
    try {
        const { tourId, reviewId, replyId } = req.params;
        const userId = (req as Request
).user?.id;

        // Ensure user is authenticated
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to like a reply' });
        }

        if (!mongoose.Types.ObjectId.isValid(tourId) ||
            !mongoose.Types.ObjectId.isValid(reviewId) ||
            !mongoose.Types.ObjectId.isValid(replyId)) {
            return res.status(400).json({ message: 'Invalid IDs provided' });
        }

        // Find the tour
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({ message: 'Tour not found' });
        }

        // Find the review
        const reviewIndex = tour.reviews.findIndex(
            (review: any) => review._id.toString() === reviewId
        );

        if (reviewIndex === -1) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Find the reply
        const replyIndex = tour.reviews[reviewIndex].replies.findIndex(
            (reply: any) => reply._id.toString() === replyId
        );

        if (replyIndex === -1) {
            return res.status(404).json({ message: 'Reply not found' });
        }

        // Increment the likes count
        tour.reviews[reviewIndex].replies[replyIndex].likes += 1;

        // Save the tour
        await tour.save();

        res.status(200).json({
            success: true,
            message: 'Reply liked successfully'
        });
    } catch (error) {
        console.error('Error in likeReviewReply:', error);
        res.status(500).json({ message: 'Failed to like reply', error });
    }
};

// Increment view count for a review (using embedded reviews in tour model)
export const incrementReviewView = async (req: Request, res: Response) => {
    try {
        const { tourId, reviewId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(tourId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: 'Invalid tour or review ID' });
        }

        // Update the review's view count
        const result = await Tour.updateOne(
            { _id: tourId, "reviews._id": reviewId },
            { $inc: { "reviews.$.views": 1 } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Tour or review not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Review view count incremented'
        });
    } catch (error) {
        console.error('Error in incrementReviewView:', error);
        res.status(500).json({ message: 'Failed to increment view count', error });
    }
};

// Increment view count for a reply (using embedded reviews in tour model)
export const incrementReplyView = async (req: Request, res: Response) => {
    try {
        const { tourId, reviewId, replyId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(tourId) ||
            !mongoose.Types.ObjectId.isValid(reviewId) ||
            !mongoose.Types.ObjectId.isValid(replyId)) {
            return res.status(400).json({ message: 'Invalid IDs provided' });
        }

        // Find the tour
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({ message: 'Tour not found' });
        }

        // Find the review
        const reviewIndex = tour.reviews.findIndex(
            (review: any) => review._id.toString() === reviewId
        );

        if (reviewIndex === -1) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Find the reply
        const replyIndex = tour.reviews[reviewIndex].replies.findIndex(
            (reply: any) => reply._id.toString() === replyId
        );

        if (replyIndex === -1) {
            return res.status(404).json({ message: 'Reply not found' });
        }

        // Increment the views count
        tour.reviews[reviewIndex].replies[replyIndex].views += 1;

        // Save the tour
        await tour.save();

        res.status(200).json({
            success: true,
            message: 'Reply view count incremented'
        });
    } catch (error) {
        console.error('Error in incrementReplyView:', error);
        res.status(500).json({ message: 'Failed to increment view count', error });
    }
};


// Get review by ID (public endpoint) - NEW RESTful endpoint
export const getReviewById = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_REVIEW_ID',
                    message: 'Invalid review ID',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Find the tour containing this review
        const tour = await Tour.findOne({ 'reviews._id': reviewId })
            .select('title slug images reviews')
            .populate({
                path: 'reviews.user',
                select: 'name email profileImage'
            })
            .populate({
                path: 'reviews.replies.user',
                select: 'name email profileImage'
            })
            .setOptions({ strictPopulate: false });

        if (!tour) {
            return res.status(404).json({
                error: {
                    code: 'REVIEW_NOT_FOUND',
                    message: 'Review not found',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Find the specific review
        const review = tour.reviews.find((r: any) => r._id.toString() === reviewId);

        if (!review) {
            return res.status(404).json({
                error: {
                    code: 'REVIEW_NOT_FOUND',
                    message: 'Review not found',
                    timestamp: new Date().toISOString(),
                    path: req.path
                }
            });
        }

        // Add tour information to the review
        const reviewObj = (review as any).toObject ? (review as any).toObject() : review;
        const reviewWithTour = {
            ...reviewObj,
            tourId: tour._id,
            tourTitle: (tour as any).title,
            tourSlug: (tour as any).slug,
            tourImage: (tour as any).images && (tour as any).images.length > 0 ? (tour as any).images[0] : null
        };

        res.json(reviewWithTour);
    } catch (error) {
        console.error('Error in getReviewById:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get review',
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
};
