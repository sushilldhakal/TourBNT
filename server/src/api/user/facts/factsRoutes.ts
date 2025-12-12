import express, { RequestHandler } from "express";
import { authenticate, isAdminOrSeller, AuthRequest } from "../../../middlewares/authenticate";
import { addFacts, getAllFacts, getUserFacts, updateFacts, deleteFacts, getSingleFacts, deleteMultipleFacts } from "./factsController";
import { uploadNone } from "../../../middlewares/multer";
import { asyncHandler } from "../../../utils/routeWrapper";

const factsRouter = express.Router();

// Add Facts (Protected, Admin or Seller)
factsRouter.post(
    '/',
    authenticate,
    uploadNone,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(addFacts)
);

// Get All Facts (Public)
factsRouter.get('/', asyncHandler(getAllFacts));

// Get Facts for a Specific User (Protected, Admin or Seller)
factsRouter.get(
    '/user/:userId',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(getUserFacts)
);

// Get a Single Fact by ID (Public)
factsRouter.get('/:factsId', asyncHandler(getSingleFacts));

// Update a Fact (Protected, Admin or Seller)
factsRouter.patch(
    '/:factId',
    authenticate,
    uploadNone,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(updateFacts)
);

// Delete a Fact (Protected, Admin or Seller)
factsRouter.delete(
    '/:factsId',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(deleteFacts)
);

// Delete Multiple Facts (Protected, Admin or Seller)
factsRouter.post(
    '/bulk-delete',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(deleteMultipleFacts)
);

export default factsRouter;