import { Response, Request, NextFunction } from 'express';
import { db, faqs, tours } from '@tourbnt/db';
import { eq, desc, inArray, count, sql } from 'drizzle-orm';
import { sendSuccess, sendPaginatedResponse, HTTP_STATUS, handleUnauthorized, handleForbidden, handleResourceNotFound, sendValidationError } from '../../../utils/apiResponse';

export const getUserFaqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user?.id;
    const userRole = req.user?.roles || [];

    if (!req.user) {
      return handleUnauthorized(res, 'Not authenticated');
    }

    if (!userRole.includes('admin') && requestedUserId !== authenticatedUserId) {
      return handleForbidden(res, 'Not authorized to view these FAQs');
    }

    const items = await db.select().from(faqs).where(eq(faqs.userId, requestedUserId)).orderBy(desc(faqs.createdAt));
    sendSuccess(res, items, 'FAQs retrieved successfully');
  } catch (error) {
    console.error('Error fetching user FAQs:', error);
    return next(error);
  }
};

export const getAllFaqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.select().from(faqs).orderBy(desc(faqs.createdAt)).limit(pageLimit).offset(skip),
      db.select({ value: count() }).from(faqs),
    ]);

    sendPaginatedResponse(res, items, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'FAQs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getSingleFaqs = async (req: Request, res: Response, next: NextFunction) => {
  const { faqId } = req.params;

  try {
    const [faq] = await db.select().from(faqs).where(eq(faqs.id, faqId)).limit(1);
    if (!faq) {
      return handleResourceNotFound(res, 'FAQ not found');
    }

    sendSuccess(res, { faq }, 'FAQ retrieved successfully');
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return next(error);
  }
};

export const addFaqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return handleUnauthorized(res, 'Not authenticated');
    }
    const userId = req.user.id;
    const { question, answer } = req.body;

    if (!question || !answer) {
      return sendValidationError(res, 'Validation failed', [
        { field: 'question', message: 'question and answer are required' },
      ]);
    }

    const [newFaq] = await db.insert(faqs).values({ userId, question, answer }).returning();
    sendSuccess(res, newFaq, 'FAQ created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const updateFaqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const userId = req.user.id;
    const { faqId } = req.params;
    const { question, answer } = req.body;

    const [existing] = await db.select().from(faqs).where(eq(faqs.id, faqId)).limit(1);
    if (!existing) {
      return handleResourceNotFound(res, 'FAQ not found');
    }

    if (existing.userId !== userId && !req.user?.roles.includes('admin')) {
      return handleForbidden(res, 'Not authorized to update this FAQ');
    }

    const [updatedFaq] = await db
      .update(faqs)
      .set({
        question: question ?? existing.question,
        answer: answer ?? existing.answer,
        updatedAt: new Date(),
      })
      .where(eq(faqs.id, faqId))
      .returning();

    // Cascade update to all tours that embed a snapshot of this FAQ.
    const affectedTours = await db
      .select({ id: tours.id, faqs: tours.faqs })
      .from(tours)
      .where(sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${tours.faqs}) elem WHERE elem->>'faqId' = ${faqId})`);

    for (const tour of affectedTours) {
      const updatedTourFaqs = (tour.faqs as any[]).map((f) =>
        f.faqId === faqId ? { ...f, question: updatedFaq.question, answer: updatedFaq.answer } : f
      );
      await db.update(tours).set({ faqs: updatedTourFaqs, updatedAt: new Date() }).where(eq(tours.id, tour.id));
    }

    sendSuccess(res, {
      faqs: updatedFaq,
      toursUpdated: affectedTours.length,
    }, 'FAQ updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteFaqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return handleUnauthorized(res, 'Not authenticated');
    }
    const userId = req.user.id;
    const { faqId } = req.params;

    const [existing] = await db.select().from(faqs).where(eq(faqs.id, faqId)).limit(1);
    if (!existing) {
      return handleResourceNotFound(res, 'FAQ not found');
    }

    if (existing.userId !== userId && !req.user?.roles.includes('admin')) {
      return handleForbidden(res, 'Not authorized to delete this FAQ');
    }

    await db.delete(faqs).where(eq(faqs.id, faqId));
    sendSuccess(res, null, 'FAQ deleted successfully', HTTP_STATUS.NO_CONTENT);
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteFaqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.roles;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return sendValidationError(res, 'Invalid or empty ids array');
    }

    const faqsToDelete = await db.select().from(faqs).where(inArray(faqs.id, ids));

    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      const faq = faqsToDelete.find((f) => f.id === id);

      if (!faq) {
        failed.push({ id, error: 'FAQ not found' });
        continue;
      }

      if (faq.userId !== userId && !userRole?.includes('admin')) {
        failed.push({ id, error: 'Not authorized to delete this FAQ' });
        continue;
      }

      try {
        await db.delete(faqs).where(eq(faqs.id, id));
        success.push(id);
      } catch (err) {
        failed.push({ id, error: 'Failed to delete FAQ' });
      }
    }

    sendSuccess(res, { success, failed }, 'Bulk delete operation completed');
  } catch (error) {
    console.error('Error in bulk delete FAQs:', error);
    next(error);
  }
};
