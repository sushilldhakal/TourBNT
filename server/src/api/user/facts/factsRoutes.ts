import express, { RequestHandler } from "express";
import { authenticate, authorizeRoles, requireOwnerOrAdmin } from "../../../middlewares/authenticate";
import { addFacts, getAllFacts, getUserFacts, updateFacts, getSingleFacts, deleteMultipleFacts, deleteFacts } from "./factsController";
import { uploadNone } from "../../../middlewares/multer";
import { asyncAuthHandler } from "../../../utils/routeWrapper";
import { paginationMiddleware } from "../../../middlewares/pagination";

const factsRouter = express.Router();

/**
 * GET /api/v1/facts
 * List all facts (Admin or Seller only)
 */
factsRouter.get(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    paginationMiddleware,
    asyncAuthHandler(getAllFacts)
);

/**
 * POST /api/v1/facts
 * Create a new fact (Admin or Seller only)
 */
factsRouter.post(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    uploadNone,
    asyncAuthHandler(addFacts)
);

factsRouter.delete(
    '/:factId',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(deleteFacts)
);

/**
 * DELETE /api/v1/facts
 * Bulk delete facts (Admin or Seller only)
 */
factsRouter.delete(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(deleteMultipleFacts)
);

/**
 * GET /api/v1/facts/user/:userId
 * Get facts created by a specific user
 * Owner of the facts or Admin
 */
factsRouter.get(
    '/user/:userId',
    authenticate,
    requireOwnerOrAdmin(req => req.params.userId),
    asyncAuthHandler(getUserFacts)
);

/**
 * GET /api/v1/facts/:factId
 * Get single fact (Owner or Admin)
 */
factsRouter.get(
    '/:factId',
    authenticate,
    asyncAuthHandler(getSingleFacts)
);

/**
 * PATCH /api/v1/facts/:factId
 * Update a fact (Owner or Admin)
 */
factsRouter.patch(
    '/:factId',
    authenticate,
    uploadNone,
    asyncAuthHandler(updateFacts)
);

export default factsRouter;
