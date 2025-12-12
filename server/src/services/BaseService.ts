import mongoose, { Model, Document, FilterQuery } from 'mongoose';
import { PaginationParams, paginate } from '../utils/pagination';
import createHttpError from 'http-errors';

/**
 * Base Service Class
 * Provides common CRUD operations for all services
 */
export class BaseService<T extends Document> {
    constructor(protected model: Model<T>) { }

    /**
     * Get all items with optional filtering and pagination
     */
    async getAll(filters: FilterQuery<T> = {}, paginationParams: PaginationParams) {
        return paginate(this.model, filters, paginationParams);
    }

    /**
     * Get a single item by ID
     */
    async getById(id: string, populateFields?: string | string[]) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw createHttpError(400, 'Invalid ID format');
        }

        let query = this.model.findById(id);

        if (populateFields) {
            if (Array.isArray(populateFields)) {
                populateFields.forEach(field => {
                    query = query.populate(field);
                });
            } else {
                query = query.populate(populateFields);
            }
        }

        const item = await query.lean();

        if (!item) {
            throw createHttpError(404, `${this.model.modelName} not found`);
        }

        return item;
    }

    /**
     * Create a new item
     */
    async create(data: Partial<T>) {
        try {
            const item = new this.model(data);
            return await item.save();
        } catch (error: any) {
            if (error.name === 'ValidationError') {
                throw createHttpError(400, `Validation error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Update an existing item
     */
    async update(id: string, data: Partial<T>) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw createHttpError(400, 'Invalid ID format');
        }

        const item = await this.model.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!item) {
            throw createHttpError(404, `${this.model.modelName} not found`);
        }

        return item;
    }

    /**
     * Delete an item
     */
    async delete(id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw createHttpError(400, 'Invalid ID format');
        }

        const item = await this.model.findByIdAndDelete(id);

        if (!item) {
            throw createHttpError(404, `${this.model.modelName} not found`);
        }

        return item;
    }

    /**
     * Search items with custom query
     */
    async search(searchParams: any, paginationParams: PaginationParams) {
        const query = this.buildSearchQuery(searchParams);
        return paginate(this.model, query, paginationParams);
    }

    /**
     * Count documents matching a query
     */
    async count(filters: FilterQuery<T> = {}) {
        return this.model.countDocuments(filters);
    }

    /**
     * Check if an item exists
     */
    async exists(filters: FilterQuery<T>) {
        const count = await this.model.countDocuments(filters);
        return count > 0;
    }

    /**
     * Build search query - Override in child classes for specific search logic
     */
    protected buildSearchQuery(searchParams: any): FilterQuery<T> {
        return {};
    }
}
