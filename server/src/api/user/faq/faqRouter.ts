import express, { RequestHandler } from "express";
import { authenticate, authorizeRoles, requireOwnerOrAdmin } from "../../../middlewares/authenticate";
import {
  addFaqs,
  getAllFaqs,
  getUserFaqs,
  updateFaqs,
  getSingleFaqs,
  deleteFaqs,
  bulkDeleteFaqs
} from "./faqController";
import { uploadNone } from "../../../middlewares/multer";
import { asyncAuthHandler } from "../../../utils/routeWrapper";
import { paginationMiddleware } from "../../../middlewares/pagination";

const faqsRouter = express.Router();

/**
 * GET /api/v1/faqs
 * List all FAQs (PUBLIC)
 */
faqsRouter.get('/', paginationMiddleware, asyncAuthHandler(getAllFaqs));

/**
 * POST /api/v1/faqs
 * Create FAQ (Admin or Seller)
 */
faqsRouter.post(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    uploadNone,
    asyncAuthHandler(addFaqs)
);

/**
 * DELETE /api/v1/faqs
 * Bulk delete FAQs (Admin or Seller)
 */
faqsRouter.delete(
    '/',
    authenticate,
    authorizeRoles('admin', 'seller') as RequestHandler,
    asyncAuthHandler(bulkDeleteFaqs)
);

/**
 * GET /api/v1/faqs/user/:userId
 * Get FAQs created by a specific user (Owner or Admin)
 */
faqsRouter.get(
    '/user/:userId',
    authenticate,
    requireOwnerOrAdmin(req => req.params.userId),
    asyncAuthHandler(getUserFaqs)
);

/**
 * GET /api/v1/faqs/:faqId
 * Get single FAQ (PUBLIC)
 */
faqsRouter.get('/:faqId', asyncAuthHandler(getSingleFaqs));

/**
 * PATCH /api/v1/faqs/:faqId
 * Update FAQ (Owner or Admin)
 */
faqsRouter.patch(
    '/:faqId',
    authenticate,
    asyncAuthHandler(updateFaqs)
);

/**
 * DELETE /api/v1/faqs/:faqId
 * Delete FAQ (Owner or Admin)
 */
faqsRouter.delete(
    '/:faqId',
    authenticate,
    asyncAuthHandler(deleteFaqs)
);

export default faqsRouter;
