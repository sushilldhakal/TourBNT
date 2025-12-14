import { Response } from 'express';
import { HTTP_STATUS } from './httpStatusCodes';

/**
 * Send success response
 * Default status code is 200 (OK) for GET/PATCH operations
 */
export const sendSuccess = (
    res: Response,
    data: any,
    message: string = 'Success',
    statusCode: number = HTTP_STATUS.OK
) => {
    res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

/**
 * Send error response
 * Default status code is 500 (Internal Server Error)
 */
export const sendError = (
    res: Response,
    message: string = 'Error',
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
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
 * Always returns 200 (OK) for successful list operations
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
    res.status(HTTP_STATUS.OK).json({
        success: true,
        message,
        data: {
            items,
            pagination
        }
    });
};
