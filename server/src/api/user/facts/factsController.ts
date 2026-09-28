import { Response, Request, NextFunction } from 'express';
import { db, facts, tours } from '@tourbnt/db';
import { eq, desc, inArray, count, sql } from 'drizzle-orm';
import {
  sendSuccess,
  sendPaginatedResponse,
  HTTP_STATUS,
  handleForbidden,
  handleUnauthorized,
  sendNotFoundError,
  handleResourceNotFound,
  sendValidationError,
} from '../../../utils/apiResponse';

export const getUserFacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user?.id;
    const userRole = req.user?.roles || [];

    if (!req.user) {
      return handleUnauthorized(res);
    }

    if (!userRole.includes('admin') && requestedUserId !== authenticatedUserId) {
      return handleForbidden(res, 'Not authorized to view these facts');
    }

    const items = await db.select().from(facts).where(eq(facts.userId, requestedUserId)).orderBy(desc(facts.createdAt));
    sendSuccess(res, items, 'Facts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAllFacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;

    const [items, [{ value: totalItems }]] = await Promise.all([
      db.select().from(facts).orderBy(desc(facts.createdAt)).limit(pageLimit).offset(skip),
      db.select({ value: count() }).from(facts),
    ]);

    sendPaginatedResponse(res, items, {
      page,
      limit: pageLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / pageLimit),
    }, 'Facts retrieved successfully');
  } catch (error) {
    console.error('Error fetching facts:', error);
    next(error);
  }
};

export const getSingleFacts = async (req: Request, res: Response, next: NextFunction) => {
  const { factId } = req.params;
  try {
    if (!req.user) {
      return handleUnauthorized(res);
    }

    const [fact] = await db.select().from(facts).where(eq(facts.id, factId)).limit(1);
    if (!fact) {
      return sendNotFoundError(res, 'Fact not found');
    }

    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    if (fact.userId !== userId && !isAdmin) {
      return handleForbidden(res, 'Not authorized to view this fact');
    }

    sendSuccess(res, { fact }, 'Fact retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const addFacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return handleUnauthorized(res, 'Not authenticated');
    }
    const userId = req.user.id;
    const { name, field_type, value, icon } = req.body;

    if (!name || !field_type) {
      return sendValidationError(res, 'Validation failed', [
        { field: 'name', message: 'name and field_type are required' },
      ]);
    }

    const [newFact] = await db
      .insert(facts)
      .values({ userId, name, fieldType: field_type, value: value ?? [], icon })
      .returning();

    sendSuccess(res, newFact, 'Fact created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const updateFacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return handleUnauthorized(res, 'Not authenticated');
    }
    const userId = req.user.id;
    const { factId } = req.params;
    const { name, field_type, value, icon } = req.body;

    const [existing] = await db.select().from(facts).where(eq(facts.id, factId)).limit(1);
    if (!existing) {
      return handleResourceNotFound(res, 'Fact');
    }

    if (existing.userId !== userId && !req.user.roles.includes('admin')) {
      return handleForbidden(res, 'Not authorized to update this Fact');
    }

    const [updatedFact] = await db
      .update(facts)
      .set({
        name: name ?? existing.name,
        fieldType: field_type ?? existing.fieldType,
        value: value ?? existing.value,
        icon: icon ?? existing.icon,
        updatedAt: new Date(),
      })
      .where(eq(facts.id, factId))
      .returning();

    // Cascade update to all tours that embed a snapshot of this fact.
    const affectedTours = await db
      .select({ id: tours.id, facts: tours.facts })
      .from(tours)
      .where(sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${tours.facts}) elem WHERE elem->>'factId' = ${factId})`);

    for (const tour of affectedTours) {
      const updatedTourFacts = (tour.facts as any[]).map((f) =>
        f.factId === factId ? { ...f, title: updatedFact.name, icon: updatedFact.icon, field_type: updatedFact.fieldType } : f
      );
      await db.update(tours).set({ facts: updatedTourFacts, updatedAt: new Date() }).where(eq(tours.id, tour.id));
    }

    sendSuccess(res, {
      facts: updatedFact,
      toursUpdated: affectedTours.length,
    }, 'Fact updated successfully');
  } catch (error) {
    console.error('Error updating fact:', error);
    next(error);
  }
};

export const deleteFacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return handleUnauthorized(res, 'Not authenticated');
    }
    const userId = req.user.id;
    const { factId } = req.params;

    const [existing] = await db.select().from(facts).where(eq(facts.id, factId)).limit(1);
    if (!existing) {
      return handleResourceNotFound(res, 'Facts');
    }

    if (existing.userId !== userId && !req.user.roles.includes('admin')) {
      return handleForbidden(res, 'Not authorized to delete this facts');
    }

    await db.delete(facts).where(eq(facts.id, factId));
    sendSuccess(res, null, 'Fact deleted successfully', HTTP_STATUS.NO_CONTENT);
  } catch (error) {
    next(error);
  }
};

export const deleteMultipleFacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return handleUnauthorized(res, 'Not authenticated');
    }
    const userId = req.user.id;
    const userRole = req.user.roles;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return sendValidationError(res, 'Invalid or empty ids array');
    }

    const factsToDelete = await db.select().from(facts).where(inArray(facts.id, ids));

    if (factsToDelete.length === 0) {
      return sendNotFoundError(res, 'No facts found with provided IDs');
    }

    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const factId of ids) {
      const fact = factsToDelete.find((f) => f.id === factId);

      if (!fact) {
        failed.push({ id: factId, error: 'Not found' });
        continue;
      }

      if (fact.userId !== userId && !userRole.includes('admin')) {
        failed.push({ id: factId, error: 'Not authorized' });
        continue;
      }

      try {
        await db.delete(facts).where(eq(facts.id, factId));
        success.push(factId);
      } catch (error) {
        failed.push({ id: factId, error: 'Delete failed' });
      }
    }

    sendSuccess(res, { success, failed }, 'Bulk delete operation completed');
  } catch (error) {
    console.error('Error deleting multiple facts:', error);
    next(error);
  }
};
