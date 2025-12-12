import { Request, Response, NextFunction } from 'express';
import { BaseService } from '../services/BaseService';
import { sendSuccess } from '../utils/responseHandler';

/**
 * Base Controller Class
 * Provides common CRUD controller methods
 */
export class BaseController<T> {
    constructor(
        protected service: BaseService<T>,
        protected resourceName: string
    ) { }

    /**
     * Get all items
     */
    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 10, sortBy, sortOrder, search } = req.query;

            const result = await this.service.getAll({}, {
                page: Number(page),
                limit: Number(limit),
                sortBy: sortBy as string,
                sortOrder: sortOrder as 'asc' | 'desc',
                search: search as string
            });

            sendSuccess(res, result, `${this.resourceName}s retrieved successfully`);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get item by ID
     */
    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const item = await this.service.getById(req.params.id);
            sendSuccess(res, item, `${this.resourceName} retrieved successfully`);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Create new item
     */
    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const item = await this.service.create(req.body);
            sendSuccess(res, item, `${this.resourceName} created successfully`, 201);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Update item
     */
    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const item = await this.service.update(req.params.id, req.body);
            sendSuccess(res, item, `${this.resourceName} updated successfully`);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Delete item
     */
    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.delete(req.params.id);
            sendSuccess(res, null, `${this.resourceName} deleted successfully`);
        } catch (error) {
            next(error);
        }
    };
}
