import { NextFunction, Request, Response } from "express";
import { HttpError } from "http-errors";
import { config } from "../config/config";
import { HTTP_STATUS } from "../utils/httpStatusCodes";


//global error handler

const globalErrorHandler = (
    err: HttpError,
    req: Request,
    res: Response,
    next: NextFunction
) => {

    const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({
        message: err.message,
        errorStack: err.stack
    })

}
export default globalErrorHandler;