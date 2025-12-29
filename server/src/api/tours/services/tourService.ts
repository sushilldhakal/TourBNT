import mongoose from 'mongoose';
import TourModel from '../tourModel';
import { Tour, PricingOption, DateRange } from '../tourTypes';
import { PaginationParams, paginate } from '../../../utils/pagination';
import { normalizeDoc } from '../../../utils/normalizeDoc';
import createHttpError from 'http-errors';
import { BaseService } from '../../../services/BaseService';
import FactsModel from '../../user/facts/factsModel';

/**
 * Tour Service Layer
 * Contains all business logic for tour operations
 * Extends BaseService for common CRUD operations
 */
export class TourService extends BaseService<Tour> {

  constructor() {
    super(TourModel);
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
  static async getAllTours(filters: any = {}, paginationParams: PaginationParams, sortOptions?: any, includeUnpublished: boolean = false) {
    const now = new Date();
    const baseQuery: any = {
      // Filter out tours that are price locked (past their price lock date)
      $or: [
        { priceLockDate: { $exists: false } }, // Tours without price lock
        { priceLockDate: null }, // Tours with null price lock
        { priceLockDate: { $gt: now } } // Tours with future price lock date
      ],
      ...filters
    };

    // Only filter by tourStatus if we want published tours only (for public/seller views)
    // Admins can see all tours regardless of status
    if (!includeUnpublished) {
      baseQuery.tourStatus = 'Published';
    }

    // Merge sort options into pagination params
    const paginationWithSort = { ...paginationParams };
    if (sortOptions && Object.keys(sortOptions).length > 0) {
      const sortField = Object.keys(sortOptions)[0];
      paginationWithSort.sortBy = sortField;
      paginationWithSort.sortOrder = sortOptions[sortField] === -1 ? 'desc' : 'asc';
    }

    // Use the paginate utility directly with the model and query
    const result = await paginate(TourModel, baseQuery, paginationWithSort);

    // Populate the results manually
    if (result.items && result.items.length > 0) {
      try {
        const populatedItems = await TourModel.populate(result.items, [
          { path: 'author', select: 'name email roles' },
          {
            path: 'category',
            select: 'name description',
            options: { strictPopulate: false }
          }
        ]);
        result.items = populatedItems;
      } catch (error) {
        console.error('Error populating categories in getAllTours:', error);
        // Continue without category population if it fails
      }
    }

    // Normalize the result
    return normalizeDoc(result);
  }

  /**
   * Get a single tour by ID with all populated fields
   */
  static async getTourById(tourId: string) {
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

    // Enrich facts with current data from the master Facts collection
    if (tour.facts && Array.isArray(tour.facts) && tour.facts.length > 0) {
      const enrichedFacts = await Promise.all(
        tour.facts.map(async (tourFact: any) => {
          // If the fact has a factId, look up the current fact data
          if (tourFact.factId) {
            try {
              const masterFact = await FactsModel.findById(tourFact.factId).lean();
              if (masterFact) {
                // Merge master fact data with tour fact data
                // Keep the tour's value, but update name, icon, and field_type from master
                return {
                  ...tourFact,
                  title: masterFact.name, // Update title with current name
                  name: masterFact.name,  // Also set name for consistency
                  icon: masterFact.icon,
                  field_type: masterFact.field_type,
                  _id: masterFact._id
                };
              }
            } catch (error) {
              console.error(`Error fetching master fact ${tourFact.factId}:`, error);
            }
          }
          // If no factId or lookup failed, return the tour fact as-is
          return tourFact;
        })
      );
      tour.facts = enrichedFacts;
    }

    // Normalize the result
    return normalizeDoc(tour);
  }

  /**
   * Create a new tour
   */
  static async createTour(tourData: Partial<Tour>, authorId: string) {
    try {
      console.log('Creating tour with data:', {
        ...tourData,
        author: authorId
      });

      const newTour = new TourModel({
        ...tourData,
        author: authorId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedTour = await newTour.save();

      // Normalize the result
      return normalizeDoc(savedTour);
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
  static async updateTour(tourId: string, updateData: Partial<Tour>, authorId?: string) {
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

    // Normalize the result
    return normalizeDoc(updatedTour);
  }

  /**
   * Delete a tour
   */
  static async deleteTour(tourId: string, authorId?: string) {
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

    // Normalize the result
    return normalizeDoc(deletedTour);
  }

  /**
   * Search tours with multiple criteria
   */
  static async searchTours(searchParams: {
    keyword?: string;
    destination?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    category?: string;
  }, paginationParams: PaginationParams) {
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

    const tourQuery = TourModel.find(query)
      .populate("author", "name roles")
      .populate({
        path: "category",
        select: "name description",
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 });

    return paginate(tourQuery, paginationParams);
  }

  /**
   * Get tours by specific criteria
   */
  static async getToursBy(criteria: 'latest' | 'rating' | 'discounted' | 'special-offers', limit: number = 10) {
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

    const tours = await TourModel.find(query)
      .sort(sort)
      .limit(limit)
      .populate("author", "name roles")
      .lean();

    // Populate category with error handling
    try {
      const populatedTours = await TourModel.populate(tours, {
        path: 'category',
        select: 'name description',
        options: { strictPopulate: false }
      });

      // Normalize the result
      return normalizeDoc(populatedTours);
    } catch (error) {
      console.error('Error populating categories in getToursBy:', error);
      // Return tours without populated categories if populate fails
      return normalizeDoc(tours);
    }
  }

  /**
   * Get user's tours
   */
  static async getUserTours(userId: string, isAdmin: boolean = false, paginationParams: PaginationParams) {
    const query = isAdmin ? {} : { author: userId };

    // Use the paginate utility directly with the model and query
    const result = await paginate(TourModel, query, paginationParams);

    // Populate the results manually
    if (result.items && result.items.length > 0) {
      try {
        const populatedItems = await TourModel.populate(result.items, [
          { path: 'author', select: 'name email roles' },
          {
            path: 'category',
            select: 'name description',
            options: { strictPopulate: false }
          }
        ]);
        result.items = populatedItems;
      } catch (error) {
        console.error('Error populating categories in getUserTours:', error);
        // Continue without category population if it fails
      }
    }

    // Normalize the result
    return normalizeDoc(result);
  }

  /**
   * Get user's tour titles only (for dropdowns)
   */
  static async getUserTourTitles(userId: string) {
    const tours = await TourModel
      .find({ author: userId })
      .select('_id title code')
      .sort({ createdAt: -1 })
      .lean();

    // Normalize the result
    return normalizeDoc(tours);
  }

  /**
   * Increment tour views
   */
  static async incrementTourViews(tourId: string) {
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
  static async incrementTourBookings(tourId: string) {
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
}
