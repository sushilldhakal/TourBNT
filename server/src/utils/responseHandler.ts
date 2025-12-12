import { Response } from 'express';

/**
 * Send success response
 */
export const sendSuccess = (
    res: Response,
    data: any,
    message: string = 'Success',
    statusCode: number = 200
) => {
    res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

/**
 * Send error response
 */
export const sendError = (
    res: Response,
    message: string = 'Error',
    statusCode: number = 500,
    errors?: any
) => {
    res.status(statusCode).json({
        success: false,
        message,
        errors
    });
};

/**
 * Send paginated response
 */
export const sendPaginatedResponse = (
    res: Response,
    items: any[],
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    },
    message: string = 'Success'
) => {
    res.status(200).json({
        success: true,
        message,
        data: {
            items,
            pagination
        }
    });
};
