import { Request, Response } from 'express';
import { db, globalCategories, sellerCategoryPreferences, sellerSettings, users, tours, tourCategories, tourAuthors } from '../../../db';
import { eq, and, or, ilike, desc, inArray, sql } from 'drizzle-orm';
import type { SellerInfo } from '../../user/userTypes';

type CategoryRow = typeof globalCategories.$inferSelect;

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const withCreator = async (category: CategoryRow) => {
  const [creator] = category.createdBy
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, category.createdBy)).limit(1)
    : [null];
  let parentCategory: { name: string; slug: string } | null = null;
  const parentId = (category.metadata as { parentCategory?: string } | null)?.parentCategory;
  if (parentId) {
    const [parent] = await db.select({ name: globalCategories.name, slug: globalCategories.slug }).from(globalCategories).where(eq(globalCategories.id, parentId)).limit(1);
    parentCategory = parent || null;
  }
  return { ...category, createdBy: creator, metadata: { ...(category.metadata as object), parentCategory } };
};

// Get category by ID (public)
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      res.status(400).json({ success: false, message: 'Category ID is required' });
      return;
    }

    const [category] = await db.select().from(globalCategories).where(eq(globalCategories.id, categoryId)).limit(1);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    // The public category page renders a "Tours in this Category" list off
    // this same response — without it every category silently shows "No
    // tours available" regardless of how many are actually linked.
    const categoryTours = await db
      .select({ id: tours.id, title: tours.title, code: tours.code })
      .from(tourCategories)
      .innerJoin(tours, eq(tourCategories.tourId, tours.id))
      .where(and(eq(tourCategories.categoryId, categoryId), eq(tours.tourStatus, 'Published')));

    res.json({ success: true, message: 'Category retrieved successfully', data: { ...(await withCreator(category)), tours: categoryTours } });
  } catch (error) {
    console.error('Error fetching category by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
};

// Get all approved categories (public)
export const getApprovedCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    // Bounded: ?limit (max 100 when explicitly paging, else a 500 ceiling for
    // dropdowns) plus ?page and ?search. Previously every approved row came back.
    const explicitLimit = req.query.limit !== undefined;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 0, 0), explicitLimit ? 100 : 500) || (explicitLimit ? 10 : 500);
    const page = Math.max(parseInt(String(req.query.page)) || 1, 1);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const conditions = [eq(globalCategories.isApproved, true), eq(globalCategories.approvalStatus, 'approved')];
    if (search) conditions.push(ilike(globalCategories.name, `%${search}%`));
    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ category: globalCategories, creator: { id: users.id, name: users.name, email: users.email } })
        .from(globalCategories)
        .leftJoin(users, eq(globalCategories.createdBy, users.id))
        .where(where)
        .orderBy(desc(globalCategories.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)::int` }).from(globalCategories).where(where),
    ]);

    const categories = rows.map(({ category, creator }) => ({ ...category, createdBy: creator }));
    res.json({
      success: true,
      message: 'Approved categories retrieved successfully',
      data: categories,
      pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching approved categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

// Get categories by type (public) — kept for route compatibility; the
// underlying schema has no `type` field (it never did in Mongo either), so
// this behaves as a plain approved-categories search.
export const getCategoriesByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const conditions = [eq(globalCategories.isApproved, true), eq(globalCategories.approvalStatus, 'approved')];
    if (search && typeof search === 'string') {
      conditions.push(ilike(globalCategories.name, `%${search}%`));
    }

    const categories = await db
      .select({
        name: globalCategories.name,
        description: globalCategories.description,
        slug: globalCategories.slug,
        imageUrl: globalCategories.imageUrl,
        popularity: globalCategories.popularity,
        usageCount: globalCategories.usageCount,
      })
      .from(globalCategories)
      .where(and(...conditions))
      .orderBy(desc(globalCategories.popularity), globalCategories.name);

    res.json({ success: true, message: 'Categories retrieved successfully', data: { categories, count: categories.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching categories by type', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get user-specific categories (from user.sellerInfo.category array)
export const getUserCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Two independent queries issued together: one network round trip to the
    // (remote) database instead of three in sequence. No approvalStatus filter —
    // this is "categories this seller is associated with" including rejected ones.
    const [[userRow], globalRows] = await Promise.all([
      db.select({ list: sql<SellerInfo['category']>`${users.sellerInfo}->'category'` }).from(users).where(eq(users.id, userId)).limit(1),
      db.select().from(globalCategories).where(sql`${globalCategories.id} IN (
        SELECT e->>'categoryId' FROM users u, jsonb_array_elements(COALESCE(u.seller_info->'category', '[]'::jsonb)) e WHERE u.id = ${userId}
      )`),
    ]);
    if (!userRow) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Stored list can contain duplicates from older racing add-requests; show each once.
    const userCategories = ((userRow.list as NonNullable<SellerInfo['category']> | null) || []).filter((c, i, arr) => arr.findIndex((x) => x.categoryId === c.categoryId) === i);
    if (userCategories.length === 0) {
      res.json({ success: true, data: [], count: 0 });
      return;
    }

    const globalById = new Map(globalRows.map((c) => [c.id, c]));

    const validCategories = userCategories
      .filter((uc) => globalById.has(uc.categoryId))
      .map((uc) => {
        const global = globalById.get(uc.categoryId)!;
        return {
          ...global,
          // isActive is a genuine per-seller preference (not tracked on the
          // global row), but isApproved/approvalStatus are facts about the
          // category itself — read those from `global`, the one place
          // they're ever written, rather than this per-seller mirror,
          // which only gets updated by approveCategory/rejectCategory/
          // updateCategory and can otherwise drift stale.
          isActive: uc.isActive,
        };
      });

    res.json({ success: true, data: validCategories, count: validCategories.length });
  } catch (error) {
    console.error('Error fetching user categories:', error);
    res.status(500).json({ success: false, message: 'Error fetching user categories', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get categories for seller (own categories, or all for admin)
export const getSellerCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.id;
    const isAdmin = req.user?.roles?.includes('admin') || false;
    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const rows = isAdmin
      ? await db.select().from(globalCategories).orderBy(desc(globalCategories.submittedAt))
      : await db.select().from(globalCategories).where(eq(globalCategories.createdBy, sellerId)).orderBy(desc(globalCategories.submittedAt));

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching seller categories', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Search categories for sellers
export const searchCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { query, parentCategory } = req.query;

    const conditions = [
      or(and(eq(globalCategories.isApproved, true), eq(globalCategories.approvalStatus, 'approved')), eq(globalCategories.createdBy, sellerId))!,
    ];
    if (query && typeof query === 'string') {
      conditions.push(or(ilike(globalCategories.name, `%${query}%`), ilike(globalCategories.description, `%${query}%`))!);
    }
    if (parentCategory && typeof parentCategory === 'string') {
      conditions.push(sql`(${globalCategories.metadata}->>'parentCategory') = ${parentCategory}`);
    }

    const categories = await db
      .select()
      .from(globalCategories)
      .where(and(...conditions))
      .orderBy(desc(globalCategories.usageCount), desc(globalCategories.popularity), desc(globalCategories.submittedAt))
      .limit(50);

    res.json({ success: true, data: categories, count: categories.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error searching categories', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get enabled categories for seller (for tour creation)
export const getEnabledCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const rows = await db
      .select({ pref: sellerCategoryPreferences, category: globalCategories })
      .from(sellerCategoryPreferences)
      .innerJoin(globalCategories, eq(sellerCategoryPreferences.categoryId, globalCategories.id))
      .where(and(
        eq(sellerCategoryPreferences.sellerId, sellerId),
        eq(sellerCategoryPreferences.isEnabled, true),
        eq(globalCategories.isApproved, true),
        eq(globalCategories.approvalStatus, 'approved'),
      ))
      .orderBy(sellerCategoryPreferences.sortOrder);

    const enabledCategories = rows.map(({ pref, category }) => ({ ...pref, category }));
    res.json({ success: true, data: enabledCategories, count: enabledCategories.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching enabled categories', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Submit new category for approval
export const submitCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, imageUrl, parentCategory, reason } = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!name || !description) {
      res.status(400).json({ success: false, message: 'Name and description are required' });
      return;
    }

    const [existingCategory] = await db.select().from(globalCategories).where(ilike(globalCategories.name, name)).limit(1);
    if (existingCategory) {
      res.status(400).json({ success: false, message: 'A category with this name already exists' });
      return;
    }

    const [category] = await db
      .insert(globalCategories)
      .values({
        name,
        description,
        imageUrl,
        reason,
        slug: toSlug(name),
        metadata: parentCategory ? { parentCategory } : null,
        createdBy,
        submittedAt: new Date(),
      })
      .returning();

    // Track this submission against the creator regardless of role — a
    // guide/hotel/restaurant/transport/advertiser submitting a category has
    // no sellerInfo at all (that's seller-onboarding-specific), so gating
    // this on `user?.sellerInfo` being already truthy silently dropped
    // their submission from their own "my categories" list (getUserCategories
    // reads only sellerInfo.category) with no way to ever find it again.
    const [user] = await db.select().from(users).where(eq(users.id, createdBy)).limit(1);
    if (user) {
      const sellerInfo = (user.sellerInfo as SellerInfo | null) || ({ category: [] } as unknown as SellerInfo);
      const categoryList = sellerInfo.category || [];
      categoryList.push({
        categoryId: category.id,
        categoryName: category.name,
        isActive: false,
        isApproved: false,
        approvalStatus: 'pending',
        addedAt: new Date(),
      });
      await db.update(users).set({ sellerInfo: { ...sellerInfo, category: categoryList }, updatedAt: new Date() }).where(eq(users.id, createdBy));
    }

    res.status(201).json({ success: true, message: 'Category submitted for approval', data: category });
  } catch (error) {
    console.error('Error submitting category:', error);
    res.status(500).json({ success: false, message: 'Error submitting category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const sellerId = req.user?.id;
    const updateData = req.body;

    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const isAdmin = req.user?.roles.includes('admin') || false;
    const [category] = await db.select().from(globalCategories).where(eq(globalCategories.id, categoryId)).limit(1);

    if (!category || (!isAdmin && category.createdBy !== sellerId)) {
      res.status(404).json({
        success: false,
        message: isAdmin ? 'Category not found' : 'Category not found or you do not have permission to update it'
      });
      return;
    }

    const { isActive, name, description, imageUrl, reason, metadata } = updateData;
    void isActive; // user-specific, not part of the global category

    const updates: Partial<typeof globalCategories.$inferInsert> = {
      name: name ?? category.name,
      description: description ?? category.description,
      imageUrl: imageUrl ?? category.imageUrl,
      reason: reason ?? category.reason,
      metadata: metadata ?? category.metadata,
      updatedAt: new Date(),
    };

    // A non-admin editing their own category is a resubmission — most often
    // after a rejection, per the rejectionReason the seller was shown. Put
    // it back in the review queue and clear the stale rejection fields
    // (rejectCategory will set fresh ones if it's rejected again), and sync
    // the per-seller mirror in sellerInfo.category so getUserCategories
    // reflects 'pending' immediately instead of the old 'rejected' — that
    // mirror is only otherwise updated by approveCategory/rejectCategory.
    if (!isAdmin) {
      updates.approvalStatus = 'pending';
      updates.isApproved = false;
      updates.rejectionReason = null;
      updates.rejectedBy = null;
      updates.rejectedAt = null;
      await syncUserCategoryStatus(category.createdBy, categoryId, { isApproved: false, approvalStatus: 'pending' });
    }

    const [updated] = await db.update(globalCategories).set(updates).where(eq(globalCategories.id, categoryId)).returning();
    res.json({ success: true, message: 'Category updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Admin: Get pending categories
export const getPendingCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const rows = await db
      .select({ category: globalCategories, creator: { id: users.id, name: users.name, email: users.email } })
      .from(globalCategories)
      .leftJoin(users, eq(globalCategories.createdBy, users.id))
      .where(eq(globalCategories.approvalStatus, 'pending'))
      .orderBy(desc(globalCategories.submittedAt));

    const pendingCategories = rows.map(({ category, creator }) => ({ ...category, createdBy: creator }));
    res.json({ success: true, data: pendingCategories, count: pendingCategories.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pending categories', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Admin: every category regardless of who created it (the dashboard
// list used to fall back to "the signed-in user's own", which is empty for
// admins). Optional approvalStatus filter; capped page size.
export const getAllCategoriesAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const { approvalStatus } = req.query;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1), 500);
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const where = typeof approvalStatus === 'string' && approvalStatus ? eq(globalCategories.approvalStatus, approvalStatus as any) : undefined;

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({ item: globalCategories, creator: { id: users.id, name: users.name, email: users.email } })
        .from(globalCategories)
        .leftJoin(users, eq(globalCategories.createdBy, users.id))
        .where(where)
        .orderBy(desc(globalCategories.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)::int` }).from(globalCategories).where(where),
    ]);

    const data = rows.map(({ item, creator }) => ({ ...item, createdBy: creator }));
    res.json({ success: true, data, count: data.length, pagination: { page, limit, totalItems: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
};

// Edits by owners/admins are applied directly (see updateCategory), so there is
// no change-request queue. The dashboard still polls for one; answer with an
// empty list rather than a 404, and 404 honestly on approve/reject.
export const getChangeRequests = (_req: Request, res: Response) => {
  res.json({ success: true, data: [], count: 0 });
};
export const changeRequestNotFound = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Change request not found' });
};

const syncUserCategoryStatus = async (createdBy: string | null, categoryId: string, patch: Partial<{ isApproved: boolean; approvalStatus: string; isActive: boolean }>) => {
  if (!createdBy) return;
  const [creator] = await db.select().from(users).where(eq(users.id, createdBy)).limit(1);
  const sellerInfo = creator?.sellerInfo as SellerInfo | null;
  const categoryList = sellerInfo?.category;
  if (!creator || !sellerInfo || !categoryList) return;

  const entry = categoryList.find((c) => c.categoryId === categoryId);
  if (!entry) return;
  Object.assign(entry, patch);
  await db.update(users).set({ sellerInfo: { ...sellerInfo, category: categoryList }, updatedAt: new Date() }).where(eq(users.id, createdBy));
};

// Admin: Approve category
export const approveCategory = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { categoryId } = req.params;
    const approvedBy = req.user.id;

    const [category] = await db.select().from(globalCategories).where(eq(globalCategories.id, categoryId)).limit(1);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const [updated] = await db
      .update(globalCategories)
      .set({
        isApproved: true,
        approvalStatus: 'approved',
        approvedBy,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(globalCategories.id, categoryId))
      .returning();

    await syncUserCategoryStatus(category.createdBy, categoryId, { isApproved: true, approvalStatus: 'approved', isActive: true });

    res.json({ success: true, message: 'Category approved successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Admin: Reject category
export const rejectCategory = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { categoryId } = req.params;
    const { reason } = req.body;
    const rejectedBy = req.user.id;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const [category] = await db.select().from(globalCategories).where(eq(globalCategories.id, categoryId)).limit(1);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const [updated] = await db
      .update(globalCategories)
      .set({
        isApproved: false,
        approvalStatus: 'rejected',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason,
        approvedBy: null,
        approvedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(globalCategories.id, categoryId))
      .returning();

    await syncUserCategoryStatus(category.createdBy, categoryId, { isApproved: false, approvalStatus: 'rejected', isActive: false });

    res.json({ success: true, message: 'Category rejected successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// How many sellers have this category in their profile, and which tours
// reference it. sellerCount/usageCount on the row itself aren't trustworthy
// here: they're manually incremented/decremented and several write paths
// (submitCategory for the creator, toggleCategoryActiveStatus) never touch
// them, so they drift. This scans the actual data instead: sellerInfo.category
// (the one place every write path lands) and the tourCategories join table.
// Shared by getCategoryUsage (the admin-facing lookup) and deleteCategory
// (which refuses to delete while either count is non-zero).
async function computeCategoryUsage(categoryId: string) {
  const sellers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(sql`${users.sellerInfo} IS NOT NULL AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(${users.sellerInfo}->'category') AS elem
      WHERE elem->>'categoryId' = ${categoryId}
    )`);

  const tourRows = await db
    .select({ id: tours.id, title: tours.title, code: tours.code })
    .from(tourCategories)
    .innerJoin(tours, eq(tourCategories.tourId, tours.id))
    .where(eq(tourCategories.categoryId, categoryId));

  const tourIds = tourRows.map((t) => t.id);
  const authorRows = tourIds.length
    ? await db.select({ tourId: tourAuthors.tourId, name: users.name }).from(tourAuthors).innerJoin(users, eq(tourAuthors.userId, users.id)).where(inArray(tourAuthors.tourId, tourIds))
    : [];
  const sellerNamesByTour = new Map<string, string[]>();
  for (const { tourId, name } of authorRows) {
    const list = sellerNamesByTour.get(tourId) || [];
    list.push(name);
    sellerNamesByTour.set(tourId, list);
  }
  const tourList = tourRows.map((t) => ({ ...t, sellerNames: sellerNamesByTour.get(t.id) || [] }));

  return { sellerCount: sellers.length, sellers, tourCount: tourList.length, tours: tourList };
}

// Admin: usage lookup shown before deletion (see computeCategoryUsage).
export const getCategoryUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }
    const { categoryId } = req.params;
    const usage = await computeCategoryUsage(categoryId);
    res.json({ success: true, data: usage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching category usage', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Admin: Delete category — refuses while any seller or tour still
// references it (see computeCategoryUsage). They have to be removed from
// every profile/tour first; this is a hard delete with no undo, and
// tourCategories cascades, so it would otherwise silently un-categorize
// live tour packages.
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const { categoryId } = req.params;
    const [existing] = await db.select({ id: globalCategories.id }).from(globalCategories).where(eq(globalCategories.id, categoryId)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const usage = await computeCategoryUsage(categoryId);
    if (usage.sellerCount > 0 || usage.tourCount > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete — ${usage.sellerCount} seller(s) and ${usage.tourCount} tour(s) still reference this category. Remove it from their profiles/tours first.`,
        data: usage,
      });
      return;
    }

    await db.delete(globalCategories).where(eq(globalCategories.id, categoryId));
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Update seller category preferences
export const updateCategoryPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { preferences, globalSettings } = req.body;

    if (preferences && Array.isArray(preferences)) {
      for (const update of preferences) {
        await db
          .insert(sellerCategoryPreferences)
          .values({
            sellerId,
            categoryId: update.categoryId,
            isVisible: update.isVisible ?? true,
            isEnabled: update.isEnabled ?? true,
            customName: update.customName,
            sortOrder: update.sortOrder ?? 0,
          })
          .onConflictDoUpdate({
            target: [sellerCategoryPreferences.sellerId, sellerCategoryPreferences.categoryId],
            set: {
              ...(update.isVisible !== undefined && { isVisible: update.isVisible }),
              ...(update.isEnabled !== undefined && { isEnabled: update.isEnabled }),
              ...(update.customName !== undefined && { customName: update.customName }),
              ...(update.sortOrder !== undefined && { sortOrder: update.sortOrder }),
              updatedAt: new Date(),
            },
          });
      }
    }

    if (globalSettings) {
      await db
        .insert(sellerSettings)
        .values({ sellerId, categorySettings: globalSettings })
        .onConflictDoUpdate({
          target: sellerSettings.sellerId,
          set: { categorySettings: globalSettings, updatedAt: new Date() },
        });
    }

    const rows = await db.select().from(sellerCategoryPreferences).where(eq(sellerCategoryPreferences.sellerId, sellerId));
    res.json({ success: true, message: 'Category preferences updated successfully', data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating category preferences', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get favorite categories
export const getFavoriteCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const rows = await db
      .select({ category: globalCategories })
      .from(sellerCategoryPreferences)
      .innerJoin(globalCategories, eq(sellerCategoryPreferences.categoryId, globalCategories.id))
      .where(and(eq(sellerCategoryPreferences.sellerId, sellerId), eq(sellerCategoryPreferences.isFavorite, true), eq(globalCategories.isApproved, true)));

    const favoriteCategories = rows.map((r) => r.category);
    res.json({ success: true, data: favoriteCategories, count: favoriteCategories.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching favorite categories', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Toggle favorite category
export const toggleFavoriteCategory = async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { categoryId } = req.params;

    const [existing] = await db
      .select()
      .from(sellerCategoryPreferences)
      .where(and(eq(sellerCategoryPreferences.sellerId, sellerId), eq(sellerCategoryPreferences.categoryId, categoryId)))
      .limit(1);

    if (existing) {
      await db.update(sellerCategoryPreferences).set({ isFavorite: !existing.isFavorite, updatedAt: new Date() }).where(eq(sellerCategoryPreferences.id, existing.id));
    } else {
      await db.insert(sellerCategoryPreferences).values({ sellerId, categoryId, isVisible: true, isEnabled: true, isFavorite: true });
    }

    const rows = await db.select().from(sellerCategoryPreferences).where(eq(sellerCategoryPreferences.sellerId, sellerId));
    res.json({ success: true, message: 'Category favorite status updated', data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating favorite status', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Add existing category to seller's list
export const addExistingCategoryToSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const sellerId = req.user?.id;

    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const [category] = await db
      .select()
      .from(globalCategories)
      .where(and(eq(globalCategories.id, categoryId), eq(globalCategories.isApproved, true), eq(globalCategories.approvalStatus, 'approved')))
      .limit(1);

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found or not approved' });
      return;
    }

    await db
      .insert(sellerCategoryPreferences)
      .values({ sellerId, categoryId, isVisible: true, isEnabled: true })
      .onConflictDoUpdate({
        target: [sellerCategoryPreferences.sellerId, sellerCategoryPreferences.categoryId],
        set: { isVisible: true, isEnabled: true, updatedAt: new Date() },
      });

    await db.update(globalCategories).set({ usageCount: sql`${globalCategories.usageCount} + 1` }).where(eq(globalCategories.id, categoryId));

    const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    if (user) {
      const sellerInfo = (user.sellerInfo as SellerInfo | null) || ({ category: [] } as unknown as SellerInfo);
      const categoryList = sellerInfo.category || [];
      const existingEntry = categoryList.find((c) => c.categoryId === categoryId);

      if (existingEntry) {
        existingEntry.isActive = true;
        existingEntry.isApproved = true;
        existingEntry.approvalStatus = 'approved';
      } else {
        categoryList.push({ categoryId, categoryName: category.name, isActive: true, isApproved: true, approvalStatus: 'approved', addedAt: new Date() });
      }

      await db.update(users).set({ sellerInfo: { ...sellerInfo, category: categoryList }, updatedAt: new Date() }).where(eq(users.id, sellerId));
    }

    const prefs = await db.select().from(sellerCategoryPreferences).where(eq(sellerCategoryPreferences.sellerId, sellerId));
    res.json({ success: true, message: 'Category added to your list successfully', data: { category, preferences: prefs } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding category to seller list', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Toggle category active status (user-specific, not global)
export const toggleCategoryActiveStatus = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let sellerInfo = user.sellerInfo as SellerInfo | null;
    if (!sellerInfo) {
      if (user.role !== 'seller') {
        return res.status(404).json({ success: false, message: 'User is not a seller' });
      }
      sellerInfo = { category: [] } as unknown as SellerInfo;
    }

    const [globalCategory] = await db.select().from(globalCategories).where(eq(globalCategories.id, categoryId)).limit(1);
    if (!globalCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const isCreator = globalCategory.createdBy === sellerId;
    const isApproved = globalCategory.approvalStatus === 'approved';
    if (!isApproved && !isCreator) {
      return res.status(404).json({ success: false, message: 'Category not approved and you are not the creator' });
    }

    const categoryList = sellerInfo.category || [];
    const entry = categoryList.find((c) => c.categoryId === categoryId);

    if (!entry) {
      categoryList.push({ categoryId, categoryName: globalCategory.name, isActive: isApproved, isApproved, approvalStatus: globalCategory.approvalStatus, addedAt: new Date() });
      await db.update(users).set({ sellerInfo: { ...sellerInfo, category: categoryList }, updatedAt: new Date() }).where(eq(users.id, sellerId));

      return res.json({
        success: true,
        message: `Category added successfully (${globalCategory.approvalStatus})`,
        data: { id: categoryId, name: globalCategory.name, isActive: isApproved, approvalStatus: globalCategory.approvalStatus }
      });
    }

    if (!entry.isActive && entry.approvalStatus === 'pending' && !isCreator) {
      return res.status(400).json({ success: false, message: 'Cannot activate pending category. Wait for admin approval.' });
    }
    if (!entry.isActive && entry.approvalStatus === 'rejected') {
      return res.status(400).json({ success: false, message: 'Cannot activate rejected category.' });
    }

    entry.isActive = !entry.isActive;
    await db.update(users).set({ sellerInfo: { ...sellerInfo, category: categoryList }, updatedAt: new Date() }).where(eq(users.id, sellerId));

    res.json({
      success: true,
      message: `Category ${entry.isActive ? 'activated' : 'deactivated'} successfully for your account`,
      data: { id: categoryId, name: globalCategory.name, isActive: entry.isActive, approvalStatus: entry.approvalStatus, globalApprovalStatus: globalCategory.approvalStatus }
    });
  } catch (error) {
    console.error('Error in toggleCategoryActiveStatus:', error);
    res.status(500).json({ success: false, message: 'Error toggling category status', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Remove existing category from seller's list (user-specific)
export const removeExistingCategoryFromSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const sellerId = req.user?.id;

    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const sellerInfo = (user.sellerInfo as SellerInfo | null) || ({ category: [] } as unknown as SellerInfo);
    const categoryList = sellerInfo.category || [];
    const idx = categoryList.findIndex((c) => c.categoryId === categoryId);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Category not found in your list' });
      return;
    }

    const categoryName = categoryList[idx].categoryName;
    categoryList.splice(idx, 1);
    await db.update(users).set({ sellerInfo: { ...sellerInfo, category: categoryList }, updatedAt: new Date() }).where(eq(users.id, sellerId));

    await db.update(globalCategories).set({ usageCount: sql`greatest(${globalCategories.usageCount} - 1, 0)` }).where(eq(globalCategories.id, categoryId));

    res.json({ success: true, message: 'Category removed from your list successfully', data: { categoryId, categoryName, removedAt: new Date() } });
  } catch (error) {
    console.error('Error removing category from seller list:', error);
    res.status(500).json({ success: false, message: 'Error removing category from seller list', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
