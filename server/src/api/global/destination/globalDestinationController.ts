import { Request, Response } from 'express';
import { db, globalDestinations, sellerDestinationPreferences, sellerSettings, users, tours, tourAuthors } from '@tourbnt/db';
import { eq, and, or, ilike, ne, desc, isNull, isNotNull, inArray, sql } from 'drizzle-orm';
import type { SellerInfo } from '../../user/userTypes';
import * as notifications from '../../notifications/notificationController';

// Get all approved destinations (public)
export const getApprovedDestinations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { country, region, search } = req.query;
    // Bounded: ?limit (max 100 when explicitly paging, else a 500 ceiling for
    // dropdowns) plus ?page. Previously every approved row came back.
    const explicitLimit = req.query.limit !== undefined;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 0, 0), explicitLimit ? 100 : 500) || (explicitLimit ? 10 : 500);
    const page = Math.max(parseInt(String(req.query.page)) || 1, 1);

    const conditions = [eq(globalDestinations.isActive, true), eq(globalDestinations.isApproved, true), eq(globalDestinations.approvalStatus, 'approved')];
    if (country && typeof country === 'string') conditions.push(ilike(globalDestinations.country, `%${country}%`));
    if (region && typeof region === 'string') conditions.push(ilike(globalDestinations.region, `%${region}%`));
    if (search && typeof search === 'string') conditions.push(or(ilike(globalDestinations.name, `%${search}%`), ilike(globalDestinations.description, `%${search}%`))!);
    const where = and(...conditions);

    const [destinations, [{ total }]] = await Promise.all([
      db
        .select()
        .from(globalDestinations)
        .where(where)
        .orderBy(desc(globalDestinations.popularity), globalDestinations.name)
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)::int` }).from(globalDestinations).where(where),
    ]);

    res.json({
      success: true,
      message: 'Approved destinations retrieved successfully',
      data: destinations,
      pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching approved destinations' });
  }
};

// Get a single destination by ID (public) — there was no route for this at
// all before; the frontend's single-destination page called a URL that
// simply didn't exist on the server.
export const getDestinationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { destinationId } = req.params;
    if (!destinationId) {
      res.status(400).json({ success: false, message: 'Destination ID is required' });
      return;
    }

    const [destination] = await db.select().from(globalDestinations).where(eq(globalDestinations.id, destinationId)).limit(1);
    if (!destination) {
      res.status(404).json({ success: false, message: 'Destination not found' });
      return;
    }

    // Same as getCategoryById: the public destination page renders a
    // "Tours in this Destination" list off this same response.
    const destinationTours = await db
      .select({ id: tours.id, title: tours.title, code: tours.code })
      .from(tours)
      .where(and(eq(tours.destinationId, destinationId), eq(tours.tourStatus, 'Published')));

    res.json({ success: true, message: 'Destination retrieved successfully', data: { ...destination, tours: destinationTours } });
  } catch (error) {
    console.error('Error fetching destination by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch destination' });
  }
};

// Get destinations by country
export const getDestinationsByCountry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { country } = req.params;
    const destinations = await db
      .select()
      .from(globalDestinations)
      .where(and(ilike(globalDestinations.country, `%${country}%`), eq(globalDestinations.isActive, true), eq(globalDestinations.isApproved, true), eq(globalDestinations.approvalStatus, 'approved')));

    res.json({ success: true, message: 'Destinations by country retrieved successfully', data: destinations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching destinations by country' });
  }
};

// Get destinations for seller (own + enabled from preferences)
export const getSellerDestinations = async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.id;
    const isAdmin = req.user?.roles.includes('admin') || false;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (isAdmin) {
      const allDestinations = await db.select().from(globalDestinations).orderBy(desc(globalDestinations.submittedAt));
      return res.json({ success: true, data: allDestinations, count: allDestinations.length });
    }

    const prefRows = await db.select().from(sellerDestinationPreferences).where(eq(sellerDestinationPreferences.sellerId, sellerId));
    const hiddenIds = new Set(prefRows.filter((p) => !p.isVisible || !p.isEnabled).map((p) => p.destinationId));
    const enabledIds = prefRows.filter((p) => p.isVisible && p.isEnabled).map((p) => p.destinationId);

    const sellerCreated = await db
      .select()
      .from(globalDestinations)
      .where(and(eq(globalDestinations.createdBy, sellerId), ne(globalDestinations.approvalStatus, 'rejected'), isNull(globalDestinations.deletedAt)))
      .orderBy(desc(globalDestinations.submittedAt));

    const visibleSellerCreated = sellerCreated.filter((d) => !hiddenIds.has(d.id));

    const enabledDestinations = enabledIds.length
      ? await db.select().from(globalDestinations).where(and(inArray(globalDestinations.id, enabledIds), eq(globalDestinations.isActive, true), eq(globalDestinations.isApproved, true), eq(globalDestinations.approvalStatus, 'approved')))
      : [];

    const combined = [...visibleSellerCreated];
    const existingIds = new Set(visibleSellerCreated.map((d) => d.id));
    for (const dest of enabledDestinations) {
      if (!existingIds.has(dest.id)) combined.push(dest);
    }
    combined.sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime());

    res.json({ success: true, data: combined, count: combined.length, message: 'Seller destinations retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching seller destinations' });
  }
};

// Search destinations for sellers
export const searchDestinations = async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { query, country, region, city } = req.query;
    const conditions = [
      eq(globalDestinations.isActive, true),
      or(and(eq(globalDestinations.isApproved, true), eq(globalDestinations.approvalStatus, 'approved')), eq(globalDestinations.createdBy, sellerId))!,
    ];
    if (query && typeof query === 'string') conditions.push(or(ilike(globalDestinations.name, `%${query}%`), ilike(globalDestinations.description, `%${query}%`))!);
    if (country && typeof country === 'string') conditions.push(ilike(globalDestinations.country, `%${country}%`));
    if (region && typeof region === 'string') conditions.push(ilike(globalDestinations.region, `%${region}%`));
    if (city && typeof city === 'string') conditions.push(ilike(globalDestinations.city, `%${city}%`));

    const rows = await db
      .select({ destination: globalDestinations, creator: { id: users.id, name: users.name, email: users.email } })
      .from(globalDestinations)
      .leftJoin(users, eq(globalDestinations.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(globalDestinations.usageCount), desc(globalDestinations.popularity), desc(globalDestinations.submittedAt))
      .limit(50);

    const destinations = rows.map(({ destination, creator }) => ({ ...destination, createdBy: creator }));
    res.json({ success: true, message: 'Destinations search completed successfully', data: destinations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error searching destinations' });
  }
};

// Get enabled destinations for seller (for tour creation)
export const getEnabledDestinations = async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const rows = await db
      .select({ pref: sellerDestinationPreferences, destination: globalDestinations })
      .from(sellerDestinationPreferences)
      .innerJoin(globalDestinations, eq(sellerDestinationPreferences.destinationId, globalDestinations.id))
      .where(and(
        eq(sellerDestinationPreferences.sellerId, sellerId),
        eq(sellerDestinationPreferences.isEnabled, true),
        eq(globalDestinations.isActive, true),
        eq(globalDestinations.isApproved, true),
        eq(globalDestinations.approvalStatus, 'approved'),
      ))
      .orderBy(sellerDestinationPreferences.sortOrder);

    const enabledDestinations = rows.map(({ pref, destination }) => ({ ...pref, destination }));
    res.json({ success: true, data: enabledDestinations, count: enabledDestinations.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching enabled destinations' });
  }
};

// Get seller's favorite destinations
export const getFavoriteDestinations = async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const rows = await db
      .select({ destination: globalDestinations })
      .from(sellerDestinationPreferences)
      .innerJoin(globalDestinations, eq(sellerDestinationPreferences.destinationId, globalDestinations.id))
      .where(and(
        eq(sellerDestinationPreferences.sellerId, sellerId),
        eq(sellerDestinationPreferences.isFavorite, true),
        eq(globalDestinations.isActive, true),
        eq(globalDestinations.isApproved, true),
        eq(globalDestinations.approvalStatus, 'approved'),
      ));

    const favoriteDestinations = rows.map((r) => r.destination);
    res.json({ success: true, data: favoriteDestinations, count: favoriteDestinations.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching favorite destinations' });
  }
};

// Submit new destination for approval
export const submitDestination = async (req: Request, res: Response) => {
  try {
    const { name, description, reason, coverImage, country, region, city, coordinates, popularity, metadata } = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!name || !description || !country) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: [{ field: 'name', message: 'Name is required' }, { field: 'description', message: 'Description is required' }, { field: 'country', message: 'Country is required' }],
      });
    }

    const [existingDestination] = await db
      .select()
      .from(globalDestinations)
      .where(and(ilike(globalDestinations.name, name), ilike(globalDestinations.country, country), eq(globalDestinations.isActive, true), city ? ilike(globalDestinations.city, city) : isNull(globalDestinations.city)))
      .limit(1);

    if (existingDestination) {
      return res.status(400).json({ success: false, message: 'A destination with this name and location already exists' });
    }

    const [destination] = await db
      .insert(globalDestinations)
      .values({
        name,
        description,
        reason,
        coverImage,
        country,
        region,
        city,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        isActive: false,
        isApproved: false,
        approvalStatus: 'pending',
        popularity: popularity ?? 0,
        metadata,
        createdBy,
        submittedAt: new Date(),
      })
      .returning();

    // Track this submission against the creator regardless of role — a
    // guide/hotel/restaurant/transport/advertiser submitting a destination
    // has no sellerInfo at all (that's seller-onboarding-specific), so
    // gating this on `user?.sellerInfo` being already truthy silently
    // dropped their submission from their own "my destinations" list
    // (getUserDestinations reads only sellerInfo.destination) with no way
    // to ever find it again.
    const [user] = await db.select().from(users).where(eq(users.id, createdBy)).limit(1);
    if (user) {
      const sellerInfo = (user.sellerInfo as SellerInfo | null) || ({ destination: [] } as unknown as SellerInfo);
      const destinationList = sellerInfo.destination || [];
      destinationList.push({ destinationId: destination.id, destinationName: destination.name, isActive: false, isApproved: false, approvalStatus: 'pending', addedAt: new Date() });
      await db.update(users).set({ sellerInfo: { ...sellerInfo, destination: destinationList }, updatedAt: new Date() }).where(eq(users.id, createdBy));
    }

    res.status(201).json({ success: true, message: 'Destination submitted for approval', data: destination });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error submitting destination' });
  }
};

// Admin: Get pending destinations
export const getPendingDestinations = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const rows = await db
      .select({ destination: globalDestinations, creator: { id: users.id, name: users.name, email: users.email } })
      .from(globalDestinations)
      .leftJoin(users, eq(globalDestinations.createdBy, users.id))
      .where(eq(globalDestinations.approvalStatus, 'pending'))
      .orderBy(desc(globalDestinations.submittedAt));

    const pendingDestinations = rows.map(({ destination, creator }) => ({ ...destination, createdBy: creator }));
    res.json({ success: true, message: 'Pending destinations retrieved successfully', data: pendingDestinations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pending destinations' });
  }
};

// Admin: every destination regardless of who created it (the dashboard
// list used to fall back to "the signed-in user's own", which is empty for
// admins). Optional approvalStatus filter; capped page size.
export const getAllDestinationsAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const { approvalStatus } = req.query;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1), 500);
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const where = typeof approvalStatus === 'string' && approvalStatus ? eq(globalDestinations.approvalStatus, approvalStatus as any) : undefined;

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({ item: globalDestinations, creator: { id: users.id, name: users.name, email: users.email } })
        .from(globalDestinations)
        .leftJoin(users, eq(globalDestinations.createdBy, users.id))
        .where(where)
        .orderBy(desc(globalDestinations.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)::int` }).from(globalDestinations).where(where),
    ]);

    const data = rows.map(({ item, creator }) => ({ ...item, createdBy: creator }));
    res.json({ success: true, data, count: data.length, pagination: { page, limit, totalItems: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching destinations' });
  }
};

// Edits by owners/admins are applied directly (see updateDestination), so there is
// no change-request queue. The dashboard still polls for one; answer with an
// empty list rather than a 404, and 404 honestly on approve/reject.
export const getChangeRequests = (_req: Request, res: Response) => {
  res.json({ success: true, data: [], count: 0 });
};
export const changeRequestNotFound = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Change request not found' });
};

const syncUserDestinationStatus = async (createdBy: string | null, destinationId: string, patch: Partial<{ isApproved: boolean; approvalStatus: string; isActive: boolean }>) => {
  if (!createdBy) return;
  const [creator] = await db.select().from(users).where(eq(users.id, createdBy)).limit(1);
  const sellerInfo = creator?.sellerInfo as SellerInfo | null;
  const destinationList = sellerInfo?.destination;
  if (!creator || !sellerInfo || !destinationList) return;

  const entry = destinationList.find((d) => d.destinationId === destinationId);
  if (!entry) return;
  Object.assign(entry, patch);
  await db.update(users).set({ sellerInfo: { ...sellerInfo, destination: destinationList }, updatedAt: new Date() }).where(eq(users.id, createdBy));
};

// Admin: Approve destination
export const approveDestination = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { destinationId } = req.params;
    const approvedBy = req.user.id;

    const [destination] = await db.select().from(globalDestinations).where(eq(globalDestinations.id, destinationId)).limit(1);
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const [updated] = await db
      .update(globalDestinations)
      .set({
        isApproved: true,
        approvalStatus: 'approved',
        approvedBy,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        deletedAt: null,
        deletedBy: null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(globalDestinations.id, destinationId))
      .returning();

    await syncUserDestinationStatus(destination.createdBy, destinationId, { isApproved: true, approvalStatus: 'approved', isActive: true });

    if (destination.createdBy) {
      try {
        await notifications.createDestinationApprovalNotification(destination.createdBy, approvedBy, destination.name, destination.id);
      } catch (notificationError) {
        console.error('Error creating approval notification:', notificationError);
      }
    }

    res.json({ success: true, message: 'Destination approved successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving destination' });
  }
};

// Admin: Reject destination
export const rejectDestination = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { destinationId } = req.params;
    const { reason } = req.body;
    const rejectedBy = req.user.id;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const [destination] = await db.select().from(globalDestinations).where(eq(globalDestinations.id, destinationId)).limit(1);
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const [updated] = await db
      .update(globalDestinations)
      .set({
        isApproved: false,
        approvalStatus: 'rejected',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason,
        approvedBy: null,
        approvedAt: null,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(globalDestinations.id, destinationId))
      .returning();

    await syncUserDestinationStatus(destination.createdBy, destinationId, { isApproved: false, approvalStatus: 'rejected', isActive: false });

    if (destination.createdBy) {
      try {
        await notifications.createDestinationRejectionNotification(destination.createdBy, rejectedBy, destination.name, destination.id, reason);
      } catch (notificationError) {
        console.error('Error creating rejection notification:', notificationError);
      }
    }

    res.json({ success: true, message: 'Destination rejected successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting destination' });
  }
};

// How many sellers have this destination in their profile, and which tours
// use it (tours.destinationId is a direct column — a tour has exactly one
// destination, unlike the many-to-many tourCategories join). sellerCount on
// the row isn't trustworthy: it's manually incremented/decremented and
// submitDestination never touches it for the creator, so it drifts. This
// scans the actual data instead. Shared by getDestinationUsage (the
// admin-facing lookup) and deleteDestination (which refuses to delete
// while either count is non-zero).
async function computeDestinationUsage(destinationId: string) {
  const sellers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(sql`${users.sellerInfo} IS NOT NULL AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(${users.sellerInfo}->'destination') AS elem
      WHERE elem->>'destinationId' = ${destinationId}
    )`);

  const tourRows = await db.select({ id: tours.id, title: tours.title, code: tours.code }).from(tours).where(eq(tours.destinationId, destinationId));

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

// Admin: usage lookup shown before deletion (see computeDestinationUsage).
export const getDestinationUsage = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const { destinationId } = req.params;
    const usage = await computeDestinationUsage(destinationId);
    res.json({ success: true, data: usage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching destination usage' });
  }
};

// Admin: Delete destination (hard delete) — refuses while any seller or
// tour still references it (see computeDestinationUsage). They have to be
// removed from every profile/tour first; this has no undo.
export const deleteDestination = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { destinationId } = req.params;
    const [existing] = await db.select({ id: globalDestinations.id }).from(globalDestinations).where(eq(globalDestinations.id, destinationId)).limit(1);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const usage = await computeDestinationUsage(destinationId);
    if (usage.sellerCount > 0 || usage.tourCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${usage.sellerCount} seller(s) and ${usage.tourCount} tour(s) still reference this destination. Remove it from their profiles/tours first.`,
        data: usage,
      });
    }

    await db.delete(globalDestinations).where(eq(globalDestinations.id, destinationId));
    res.json({ success: true, message: 'Destination permanently deleted from database' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting destination' });
  }
};

// Update destination (sellers can update their own, admins any)
export const updateDestination = async (req: Request, res: Response) => {
  try {
    const { destinationId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [destination] = await db.select().from(globalDestinations).where(eq(globalDestinations.id, destinationId)).limit(1);
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const isOwner = destination.createdBy === userId;
    const isAdmin = req.user?.roles.includes('admin') || false;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only update destinations you created' });
    }

    const { name, description, coverImage, country, region, city, coordinates, isActive, popularity, metadata } = req.body;

    if (!name || !description || !country) {
      const missingFields = [];
      if (!name) missingFields.push({ field: 'name', message: 'name is required' });
      if (!description) missingFields.push({ field: 'description', message: 'description is required' });
      if (!country) missingFields.push({ field: 'country', message: 'country is required' });
      return res.status(400).json({ success: false, message: 'Missing required fields', errors: missingFields });
    }

    const [duplicate] = await db
      .select()
      .from(globalDestinations)
      .where(and(ne(globalDestinations.id, destinationId), ilike(globalDestinations.name, name), ilike(globalDestinations.country, country), city ? ilike(globalDestinations.city, city) : isNull(globalDestinations.city)))
      .limit(1);

    if (duplicate) {
      return res.status(400).json({ success: false, message: 'A destination with this name and location already exists' });
    }

    const isOnlyActiveToggle = isActive !== undefined &&
      isActive !== destination.isActive &&
      name === destination.name &&
      description === destination.description &&
      coverImage === destination.coverImage &&
      country === destination.country &&
      region === destination.region &&
      city === destination.city;

    const updates: Partial<typeof globalDestinations.$inferInsert> = {
      name,
      description,
      coverImage,
      country,
      region,
      city,
      latitude: coordinates?.latitude ?? destination.latitude,
      longitude: coordinates?.longitude ?? destination.longitude,
      isActive: isActive !== undefined ? isActive : destination.isActive,
      popularity: popularity !== undefined ? popularity : destination.popularity,
      metadata: metadata ?? destination.metadata,
      updatedAt: new Date(),
    };

    // Re-review is needed when a non-admin edits something already
    // approved (it's live and changing) or resubmits something rejected
    // (the whole point of editing per the rejectionReason they were shown)
    // — but not for a no-op edit to an already-pending destination, and not
    // for a trivial active/inactive toggle on an approved one.
    const needsReReview = !isAdmin && (
      (destination.approvalStatus === 'approved' && !isOnlyActiveToggle) ||
      destination.approvalStatus === 'rejected'
    );
    if (needsReReview) {
      updates.isApproved = false;
      updates.approvalStatus = 'pending';
      updates.approvedBy = null;
      updates.approvedAt = null;
      updates.rejectedBy = null;
      updates.rejectedAt = null;
      updates.rejectionReason = null;
      updates.submittedAt = new Date();
      await syncUserDestinationStatus(destination.createdBy, destinationId, { isApproved: false, approvalStatus: 'pending' });
    }

    const [updated] = await db.update(globalDestinations).set(updates).where(eq(globalDestinations.id, destinationId)).returning();

    res.json({
      success: true,
      message: updated.approvalStatus === 'pending' && !isAdmin ? 'Destination updated and submitted for approval' : 'Destination updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating destination' });
  }
};

export const updateDestinationPreferences = async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { preferences, globalSettings } = req.body;

    if (preferences && Array.isArray(preferences)) {
      for (const update of preferences) {
        await db
          .insert(sellerDestinationPreferences)
          .values({
            sellerId,
            destinationId: update.destinationId,
            isVisible: update.isVisible ?? true,
            isEnabled: update.isEnabled ?? true,
            customName: update.customName,
            sortOrder: update.sortOrder ?? 0,
            isFavorite: update.isFavorite ?? false,
          })
          .onConflictDoUpdate({
            target: [sellerDestinationPreferences.sellerId, sellerDestinationPreferences.destinationId],
            set: {
              ...(update.isVisible !== undefined && { isVisible: update.isVisible }),
              ...(update.isEnabled !== undefined && { isEnabled: update.isEnabled }),
              ...(update.customName !== undefined && { customName: update.customName }),
              ...(update.sortOrder !== undefined && { sortOrder: update.sortOrder }),
              ...(update.isFavorite !== undefined && { isFavorite: update.isFavorite }),
              updatedAt: new Date(),
            },
          });
      }
    }

    if (globalSettings) {
      await db
        .insert(sellerSettings)
        .values({ sellerId, destinationSettings: globalSettings })
        .onConflictDoUpdate({ target: sellerSettings.sellerId, set: { destinationSettings: globalSettings, updatedAt: new Date() } });
    }

    const rows = await db.select().from(sellerDestinationPreferences).where(eq(sellerDestinationPreferences.sellerId, sellerId));
    res.json({ success: true, message: 'Destination preferences updated successfully', data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating destination preferences' });
  }
};

// Toggle favorite destination
export const toggleFavoriteDestination = async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { destinationId } = req.params;

    const [existing] = await db
      .select()
      .from(sellerDestinationPreferences)
      .where(and(eq(sellerDestinationPreferences.sellerId, sellerId), eq(sellerDestinationPreferences.destinationId, destinationId)))
      .limit(1);

    if (existing) {
      await db.update(sellerDestinationPreferences).set({ isFavorite: !existing.isFavorite, updatedAt: new Date() }).where(eq(sellerDestinationPreferences.id, existing.id));
    } else {
      await db.insert(sellerDestinationPreferences).values({ sellerId, destinationId, isVisible: true, isEnabled: true, isFavorite: true });
    }

    const rows = await db.select().from(sellerDestinationPreferences).where(eq(sellerDestinationPreferences.sellerId, sellerId));
    res.json({ success: true, message: 'Destination favorite status updated', data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating favorite status' });
  }
};

// Add existing destination to seller's list
export const addExistingDestinationToSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    const { destinationId } = req.params;
    const sellerId = req.user?.id;

    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const [destination] = await db
      .select()
      .from(globalDestinations)
      .where(and(eq(globalDestinations.id, destinationId), eq(globalDestinations.isActive, true), eq(globalDestinations.isApproved, true), eq(globalDestinations.approvalStatus, 'approved')))
      .limit(1);

    if (!destination) {
      res.status(404).json({ success: false, message: 'Approved destination not found' });
      return;
    }

    const [existingPref] = await db
      .select()
      .from(sellerDestinationPreferences)
      .where(and(eq(sellerDestinationPreferences.sellerId, sellerId), eq(sellerDestinationPreferences.destinationId, destinationId)))
      .limit(1);

    if (existingPref) {
      await db.update(sellerDestinationPreferences).set({ isVisible: true, isEnabled: true, isFavorite: true, updatedAt: new Date() }).where(eq(sellerDestinationPreferences.id, existingPref.id));
    } else {
      await db.insert(sellerDestinationPreferences).values({ sellerId, destinationId, isVisible: true, isEnabled: true, isFavorite: true });
      await db.update(globalDestinations).set({ sellerCount: sql`${globalDestinations.sellerCount} + 1` }).where(eq(globalDestinations.id, destinationId));
    }

    await db.update(globalDestinations).set({ usageCount: sql`${globalDestinations.usageCount} + 1` }).where(eq(globalDestinations.id, destinationId));

    const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    if (user) {
      const sellerInfo = (user.sellerInfo as SellerInfo | null) || ({ destination: [] } as unknown as SellerInfo);
      const destinationList = sellerInfo.destination || [];
      const existingEntry = destinationList.find((d) => d.destinationId === destinationId);

      if (existingEntry) {
        existingEntry.isActive = true;
        existingEntry.isApproved = true;
        existingEntry.approvalStatus = 'approved';
      } else {
        destinationList.push({ destinationId, destinationName: destination.name, isActive: true, isApproved: true, approvalStatus: 'approved', addedAt: new Date() });
      }

      await db.update(users).set({ sellerInfo: { ...sellerInfo, destination: destinationList }, updatedAt: new Date() }).where(eq(users.id, sellerId));
    }

    const prefs = await db.select().from(sellerDestinationPreferences).where(eq(sellerDestinationPreferences.sellerId, sellerId));
    res.json({ success: true, message: 'Destination added to your list successfully', data: { destination, preferences: prefs } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding destination to your list' });
  }
};

// Toggle destination active status (user-specific, not global)
export const toggleDestinationActiveStatus = async (req: Request, res: Response) => {
  try {
    const { destinationId } = req.params;
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
      sellerInfo = { destination: [] } as unknown as SellerInfo;
    }

    const [globalDestination] = await db.select().from(globalDestinations).where(eq(globalDestinations.id, destinationId)).limit(1);
    if (!globalDestination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const isCreator = globalDestination.createdBy === sellerId;
    const isApproved = globalDestination.approvalStatus === 'approved';
    if (!isApproved && !isCreator) {
      return res.status(404).json({ success: false, message: 'Destination not approved and you are not the creator' });
    }

    const destinationList = sellerInfo.destination || [];
    const entry = destinationList.find((d) => d.destinationId === destinationId);

    if (!entry) {
      destinationList.push({ destinationId, destinationName: globalDestination.name, isActive: isApproved, isApproved, approvalStatus: globalDestination.approvalStatus, addedAt: new Date() });
      await db.update(users).set({ sellerInfo: { ...sellerInfo, destination: destinationList }, updatedAt: new Date() }).where(eq(users.id, sellerId));

      return res.json({
        success: true,
        message: `Destination added successfully (${globalDestination.approvalStatus})`,
        data: { id: destinationId, name: globalDestination.name, isActive: isApproved, approvalStatus: globalDestination.approvalStatus }
      });
    }

    if (!entry.isActive && entry.approvalStatus === 'pending' && !isCreator) {
      return res.status(400).json({ success: false, message: 'Cannot activate pending destination. Wait for admin approval.' });
    }
    if (!entry.isActive && entry.approvalStatus === 'rejected') {
      return res.status(400).json({ success: false, message: 'Cannot activate rejected destination.' });
    }

    entry.isActive = !entry.isActive;
    await db.update(users).set({ sellerInfo: { ...sellerInfo, destination: destinationList }, updatedAt: new Date() }).where(eq(users.id, sellerId));

    res.json({
      success: true,
      message: `Destination ${entry.isActive ? 'activated' : 'deactivated'} successfully for your account`,
      data: { id: destinationId, name: globalDestination.name, isActive: entry.isActive, approvalStatus: entry.approvalStatus, globalApprovalStatus: globalDestination.approvalStatus }
    });
  } catch (error) {
    console.error('Error in toggleDestinationActiveStatus:', error);
    res.status(500).json({ success: false, message: 'Error toggling destination status' });
  }
};

// Get user-specific destinations with their personal active status
export const getUserDestinations = async (req: Request, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const sellerInfo = user.sellerInfo as SellerInfo | null;

    const destinationList = sellerInfo?.destination || [];
    if (destinationList.length === 0) {
      return res.json({ success: true, data: [], count: 0, message: 'User destinations retrieved successfully' });
    }

    const ids = destinationList.map((d) => d.destinationId);
    // No approvalStatus filter — this is "destinations this seller is
    // associated with", including pending and rejected ones, so a
    // rejection stays visible with its reason and can be edited/
    // resubmitted (see updateDestination). Filtering them out made a
    // rejected (or even still-pending) destination vanish from the
    // seller's own list with no way back to it.
    const globalRows = await db.select().from(globalDestinations).where(inArray(globalDestinations.id, ids));
    const byId = new Map(globalRows.map((d) => [d.id, d]));

    const userDestinations = destinationList
      .map((userDest) => {
        const globalDest = byId.get(userDest.destinationId);
        if (!globalDest) return null;
        return {
          _id: globalDest.id,
          name: globalDest.name,
          description: globalDest.description,
          coverImage: globalDest.coverImage,
          country: globalDest.country,
          region: globalDest.region,
          city: globalDest.city,
          coordinates: { latitude: globalDest.latitude, longitude: globalDest.longitude },
          popularity: globalDest.popularity,
          // isActive is a genuine per-seller preference; approvalStatus/
          // isApproved/rejectionReason are facts about the destination
          // itself, so read those from globalDest (the one place they're
          // ever written) rather than this per-seller mirror, which can
          // otherwise drift stale.
          isActive: userDest.isActive,
          approvalStatus: globalDest.approvalStatus,
          isApproved: globalDest.isApproved,
          rejectionReason: globalDest.rejectionReason,
          addedAt: userDest.addedAt,
        };
      })
      .filter(Boolean);

    res.json({ success: true, data: userDestinations, count: userDestinations.length, message: 'User destinations retrieved successfully' });
  } catch (error) {
    console.error('Error in getUserDestinations:', error);
    res.status(500).json({ success: false, message: 'Error fetching user destinations' });
  }
};

// Fix destinations with deletedAt but approved status (temporary fix)
export const fixDeletedApprovedDestinations = async (req: Request, res: Response) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const broken = await db
      .select()
      .from(globalDestinations)
      .where(and(eq(globalDestinations.approvalStatus, 'approved'), eq(globalDestinations.isApproved, true), isNotNull(globalDestinations.deletedAt)));

    if (broken.length > 0) {
      await db
        .update(globalDestinations)
        .set({ deletedAt: null, deletedBy: null })
        .where(and(eq(globalDestinations.approvalStatus, 'approved'), eq(globalDestinations.isApproved, true), isNotNull(globalDestinations.deletedAt)));
    }

    res.json({ success: true, message: `Fixed ${broken.length} destinations with conflicting deletion/approval status`, data: { found: broken.length, fixed: broken.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fixing destinations' });
  }
};

export const removeExistingDestinationFromSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    const { destinationId } = req.params;
    const sellerId = req.user?.id;

    if (!sellerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const [sellerCreatedDestination] = await db
      .select()
      .from(globalDestinations)
      .where(and(eq(globalDestinations.id, destinationId), eq(globalDestinations.createdBy, sellerId), eq(globalDestinations.isActive, true)))
      .limit(1);

    if (sellerCreatedDestination) {
      if (sellerCreatedDestination.isApproved && sellerCreatedDestination.approvalStatus === 'approved') {
        // Approved seller-created destination: hide from dashboard only, don't delete.
        await db
          .insert(sellerDestinationPreferences)
          .values({ sellerId, destinationId, isVisible: false, isEnabled: false })
          .onConflictDoUpdate({
            target: [sellerDestinationPreferences.sellerId, sellerDestinationPreferences.destinationId],
            set: { isVisible: false, isEnabled: false, updatedAt: new Date() },
          });

        await db.update(globalDestinations).set({ sellerCount: sql`greatest(${globalDestinations.sellerCount} - 1, 0)` }).where(eq(globalDestinations.id, destinationId));

        const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
        const sellerInfo = user?.sellerInfo as SellerInfo | null;
        if (user && sellerInfo?.destination) {
          const entry = sellerInfo.destination.find((d) => d.destinationId === destinationId);
          if (entry) {
            entry.isActive = false;
            await db.update(users).set({ sellerInfo, updatedAt: new Date() }).where(eq(users.id, sellerId));
          }
        }

        res.json({ success: true, message: 'Destination removed from your dashboard successfully' });
        return;
      } else {
        // Not approved yet: seller can hard delete it completely.
        await db.delete(globalDestinations).where(eq(globalDestinations.id, destinationId));

        const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
        const sellerInfo = user?.sellerInfo as SellerInfo | null;
        if (user && sellerInfo?.destination) {
          const filtered = sellerInfo.destination.filter((d) => d.destinationId !== destinationId);
          await db.update(users).set({ sellerInfo: { ...sellerInfo, destination: filtered }, updatedAt: new Date() }).where(eq(users.id, sellerId));
        }

        res.json({ success: true, message: 'Destination deleted successfully' });
        return;
      }
    }

    // Destination added from the existing/approved list — just remove the preference.
    const [existingPref] = await db
      .select()
      .from(sellerDestinationPreferences)
      .where(and(eq(sellerDestinationPreferences.sellerId, sellerId), eq(sellerDestinationPreferences.destinationId, destinationId)))
      .limit(1);

    if (!existingPref) {
      res.status(404).json({ success: false, message: 'Destination not found in your list' });
      return;
    }

    await db.delete(sellerDestinationPreferences).where(eq(sellerDestinationPreferences.id, existingPref.id));
    await db.update(globalDestinations).set({ sellerCount: sql`greatest(${globalDestinations.sellerCount} - 1, 0)` }).where(eq(globalDestinations.id, destinationId));

    const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    const sellerInfo = user?.sellerInfo as SellerInfo | null;
    if (user && sellerInfo?.destination) {
      const filtered = sellerInfo.destination.filter((d) => d.destinationId !== destinationId);
      if (filtered.length < sellerInfo.destination.length) {
        await db.update(users).set({ sellerInfo: { ...sellerInfo, destination: filtered }, updatedAt: new Date() }).where(eq(users.id, sellerId));
      }
    }

    const prefs = await db.select().from(sellerDestinationPreferences).where(eq(sellerDestinationPreferences.sellerId, sellerId));
    res.json({ success: true, message: 'Destination removed from your list successfully', data: prefs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing destination from your list' });
  }
};
