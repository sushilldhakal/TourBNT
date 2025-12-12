import mongoose from 'mongoose';
import TourModel from '../tourModel';
import { Tour } from '../tourTypes';
import { PaginationParams, paginate } from '../../../utils/pagination';
import createHttpError from 'http-errors';
import { BaseService } from '../../../services/BaseService';

/**
 * Tour Service Layer
 * Contains all business logic for tour operations
 * Extends BaseService for common CRUD operations
 */
export class TourService extends BaseService<Tour> {

    private static instance: TourService;

    constructor() {
        super(TourModel);
    }

    /**
     * Get singleton instance (for backward compatibility with static methods)
     */
    static getInstance(): TourService {
        if (!TourService.instance) {
            TourService.instance = new TourService();
        }
        return TourService.instance;
    }

    /**
     * Build search query for tours
     */
    protected buildSearchQuery(searchParams: any) {
        const query: any = { tourStatus: 'Published' };

        // Keyword search across multiple fields
        if (searchParams.keyword) {
            query.$or = [
                { title: { $regex: searchParams.keyword, $options: 'i' } },
                { description: { $regex: searchParams.keyword, $options: 'i' } },
                { outline: { $regex: searchParams.keyword, $options: 'i' } }
            ];
        }

        // Filter by destination
        if (searchParams.destination) {
            query.destination = searchParams.destination;
        }

        // Price range filtering
        if (searchParams.minPrice || searchParams.maxPrice) {
            query.price = {};
            if (searchParams.minPrice) query.price.$gte = searchParams.minPrice;
            if (searchParams.maxPrice) query.price.$lte = searchParams.maxPrice;
        }

        // Rating filter
        if (searchParams.rating) {
            query.averageRating = { $gte: searchParams.rating };
        }

        // Category filter
        if (searchParams.category) {
            query['category.categoryName'] = { $regex: searchParams.category, $options: 'i' };
        }

        return query;
    }

    /**
     * Get all tours with filtering and pagination
     */
    async getAllTours(filters: any = {}, paginationParams: PaginationParams) {
        const now = new Date();
        const baseQuery = {
            tourStatus: 'Published',
            // Filter out tours that are price locked (past their price lock date)
            $or: [
                { priceLockDate: { $exists: false } }, // Tours without price lock
                { priceLockDate: null }, // Tours with null price lock
                { priceLockDate: { $gt: now } } // Tours with future price lock date
            ],
            ...filters
        };

        const result = await paginate(TourModel, baseQuery, paginationParams);

        // Populate the results manually
        if (result.items && result.items.length > 0) {
            const populatedItems = await TourModel.populate(result.items, [
                { path: 'author', select: 'name email roles' },
                { path: 'category.categoryId', select: 'name' }
            ]);
            result.items = populatedItems;
        }

        return result;
    }

    /**
     * Get a single tour by ID with all populated fields
     */
    async getTourById(tourId: string) {
        if (!mongoose.Types.ObjectId.isValid(tourId)) {
            throw createHttpError(400, 'Invalid Tour ID');
        }

        const tour = await TourModel
            .findById(tourId)
            .populate('author', 'name email roles')
            .populate('reviews.user', 'name email roles')
            .populate({
                path: 'category',
                select: 'name description',
                options: { strictPopulate: false }
            })
            .lean();

        if (!tour) {
            throw createHttpError(404, 'Tour not found');
        }

        return tour;
    }

    /**
     * Create a new tour
     */
    async createTour(tourData: Partial<Tour>, authorId: string) {
        try {
            console.log('Creating tour with data:', {
                ...tourData,
                author: authorId
            });

            return await this.create({
                ...tourData,
                author: authorId as any
            });
        } catch (error: any) {
            console.error('Error creating tour:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
            }
            if (error.name === 'ValidationError') {
                console.error('Validation errors:', error.errors);
            }
            throw error;
        }
    }

    /**
     * Update an existing tour
     */
    async updateTour(tourId: string, updateData: Partial<Tour>, authorId?: string) {
        if (!mongoose.Types.ObjectId.isValid(tourId)) {
            throw createHttpError(400, 'Invalid Tour ID');
        }

        // Build query - only allow authors to update their tours (unless admin)
        const query: any = { _id: tourId };
        if (authorId) {
            query.author = authorId;
        }

        const updatedTour = await TourModel.findOneAndUpdate(
            query,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate('author', 'name email roles');

        if (!updatedTour) {
            throw createHttpError(404, 'Tour not found or unauthorized');
        }

        return updatedTour;
    }

    /**
     * Delete a tour
     */
    async deleteTour(tourId: string, authorId?: string) {
        if (!mongoose.Types.ObjectId.isValid(tourId)) {
            throw createHttpError(400, 'Invalid Tour ID');
        }

        const query: any = { _id: tourId };
        if (authorId) {
            query.author = authorId;
        }

        const deletedTour = await TourModel.findOneAndDelete(query);

        if (!deletedTour) {
            throw createHttpError(404, 'Tour not found or unauthorized');
        }

        return deletedTour;
    }

    /**
     * Search tours with multiple criteria
     */
    async searchTours(searchParams: {
        keyword?: string;
        destination?: string;
        minPrice?: number;
        maxPrice?: number;
        rating?: number;
        category?: string;
    }, paginationParams: PaginationParams) {
        const query = this.buildSearchQuery(searchParams);

        const tourQuery = TourModel.find(query)
            .populate("author", "name roles")
            .sort({ createdAt: -1 });

        return paginate(tourQuery, paginationParams);
    }

    /**
     * Get tours by specific criteria
     */
    async getToursBy(criteria: 'latest' | 'rating' | 'discounted' | 'special-offers', limit: number = 10) {
        let query: any = { tourStatus: 'Published' };
        let sort: any = {};

        switch (criteria) {
            case 'latest':
                sort = { createdAt: -1 };
                break;
            case 'rating':
                query.reviewCount = { $gt: 0 };
                sort = { averageRating: -1 };
                break;
            case 'discounted':
                query.$or = [
                    { discountEnabled: true },
                    { 'pricingOptions.discountEnabled': true }
                ];
                sort = { createdAt: -1 };
                break;
            case 'special-offers':
                query.isSpecialOffer = true;
                sort = { createdAt: -1 };
                break;
        }

        return TourModel.find(query)
            .sort(sort)
            .limit(limit)
            .populate("author", "name roles")
            .lean();
    }

    /**
     * Get user's tours
     */
    async getUserTours(userId: string, isAdmin: boolean = false, paginationParams: PaginationParams) {
        const query = isAdmin ? {} : { author: userId };

        const result = await paginate(TourModel, query, paginationParams);

        // Populate the results manually
        if (result.items && result.items.length > 0) {
            const populatedItems = await TourModel.populate(result.items, {
                path: 'author',
                select: 'name email roles'
            });
            result.items = populatedItems;
        }

        return result;
    }

    /**
     * Get user's tour titles only (for dropdowns)
     */
    async getUserTourTitles(userId: string) {
        return TourModel
            .find({ author: userId })
            .select('title')
            .lean();
    }

    /**
     * Increment tour views
     */
    async incrementTourViews(tourId: string) {
        if (!mongoose.Types.ObjectId.isValid(tourId)) {
            throw createHttpError(400, 'Invalid tour ID');
        }

        const result = await TourModel.findByIdAndUpdate(
            tourId,
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!result) {
            throw createHttpError(404, 'Tour not found');
        }

        return result.views;
    }

    /**
     * Increment tour bookings
     */
    async incrementTourBookings(tourId: string) {
        if (!mongoose.Types.ObjectId.isValid(tourId)) {
            throw createHttpError(400, 'Invalid tour ID');
        }

        const result = await TourModel.findByIdAndUpdate(
            tourId,
            { $inc: { bookingCount: 1 } },
            { new: true }
        );

        if (!result) {
            throw createHttpError(404, 'Tour not found');
        }

        return result.bookingCount;
    }

    // Static methods for backward compatibility
    static async getAllTours(filters: any = {}, paginationParams: PaginationParams) {
        return TourService.getInstance().getAllTours(filters, paginationParams);
    }

    static async getTourById(tourId: string) {
        return TourService.getInstance().getTourById(tourId);
    }

    static async createTour(tourData: Partial<Tour>, authorId: string) {
        return TourService.getInstance().createTour(tourData, authorId);
    }

    static async updateTour(tourId: string, updateData: Partial<Tour>, authorId?: string) {
        return TourService.getInstance().updateTour(tourId, updateData, authorId);
    }

    static async deleteTour(tourId: string, authorId?: string) {
        return TourService.getInstance().deleteTour(tourId, authorId);
    }

    static async searchTours(searchParams: any, paginationParams: PaginationParams) {
        return TourService.getInstance().searchTours(searchParams, paginationParams);
    }

    static async getToursBy(criteria: 'latest' | 'rating' | 'discounted' | 'special-offers', limit: number = 10) {
        return TourService.getInstance().getToursBy(criteria, limit);
    }

    static async getUserTours(userId: string, isAdmin: boolean = false, paginationParams: PaginationParams) {
        return TourService.getInstance().getUserTours(userId, isAdmin, paginationParams);
    }

    static async getUserTourTitles(userId: string) {
        return TourService.getInstance().getUserTourTitles(userId);
    }

    static async incrementTourViews(tourId: string) {
        return TourService.getInstance().incrementTourViews(tourId);
    }

    static async incrementTourBookings(tourId: string) {
        return TourService.getInstance().incrementTourBookings(tourId);
    }
}
