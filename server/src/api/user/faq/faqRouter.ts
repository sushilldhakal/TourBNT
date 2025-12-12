import express, { RequestHandler } from "express";
import { authenticate, isAdminOrSeller, AuthRequest } from "../../../middlewares/authenticate";
import { addFaqs, getUserFaqs, updateFaqs, deleteFaqs, getAllFaqs, getSingleFaqs, deleteMultipleFaqs } from "./faqController";
import { uploadNone } from "../../../middlewares/multer";
import { asyncHandler } from "../../../utils/routeWrapper";

const faqsRouter = express.Router();

// Add FAQ (Protected, Admin or Seller)
faqsRouter.post(
    '/',
    authenticate,
    uploadNone,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(addFaqs)
);

// Get All FAQs (Public)
faqsRouter.get('/', asyncHandler(getAllFaqs));

// Get FAQs for a Specific User (Protected, Admin or Seller)
faqsRouter.get(
    '/user/:userId',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(getUserFaqs)
);

// Get a Single FAQ by ID (Public)
faqsRouter.get('/:faqId', asyncHandler(getSingleFaqs));

// Update a FAQ (Protected, Admin or Seller)
faqsRouter.patch(
    '/:faqId',
    authenticate,
    uploadNone,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(updateFaqs)
);

// Delete a FAQ (Protected, Admin or Seller)
faqsRouter.delete(
    '/:faqsId',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(deleteFaqs)
);

// Delete Multiple FAQs (Protected, Admin or Seller)
faqsRouter.post(
    '/bulk-delete',
    authenticate,
    isAdminOrSeller as RequestHandler,
    asyncHandler<AuthRequest>(deleteMultipleFaqs)
);

export default faqsRouter;



