import { Request, Response } from 'express';
import {
  db,
  users,
  globalCategories,
  globalDestinations,
  sellerCategoryPreferences,
  sellerDestinationPreferences,
} from '../../db';
import { and, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';

/**
 * Bulk "add existing" for the seller's category / destination lists.
 *
 * The one-at-a-time endpoints did a read-modify-write of `users.sellerInfo`
 * per request, so firing many in parallel raced and wrote duplicate entries.
 * These do the whole job in a handful of queries and one `sellerInfo` write,
 * and dedupe the stored list while they are at it.
 */
/** A seller-list entry as stored in users.sellerInfo.category / .destination. */
type ListEntry = Record<string, unknown>;

/**
 * Everything the shared flow needs from one kind of list. Each kind gets its own small functions over its
 * own tables, so every query stays fully typed (Drizzle can't type "either table" generically).
 */
interface Kind {
  infoKey: 'category' | 'destination';
  idKey: 'categoryId' | 'destinationId';
  nameKey: 'categoryName' | 'destinationName';
  /** The global row's id column (used inside raw SQL and inArray). */
  idColumn: typeof globalCategories.id | typeof globalDestinations.id;
  /** Approved (and, for destinations, active) rows. */
  approvedConditions: () => SQL[];
  searchColumns: Array<typeof globalCategories.name | typeof globalDestinations.name | typeof globalDestinations.city | typeof globalDestinations.country>;
  listPage: (where: SQL | undefined, limit: number, offset: number) => Promise<unknown[]>;
  countRows: (where: SQL | undefined) => Promise<number>;
  selectTargets: (where: SQL | undefined) => Promise<Array<{ id: string; name: string }>>;
  /** Ids among `ids` this seller already has a preference row for. */
  existingPrefIds: (sellerId: string, ids: string[]) => Promise<string[]>;
  upsertPrefs: (sellerId: string, ids: string[]) => Promise<void>;
  bumpUsage: (ids: string[]) => Promise<void>;
}

const kinds: Record<'category' | 'destination', Kind> = {
  category: {
    infoKey: 'category',
    idKey: 'categoryId',
    nameKey: 'categoryName',
    idColumn: globalCategories.id,
    approvedConditions: () => [eq(globalCategories.isApproved, true), eq(globalCategories.approvalStatus, 'approved')],
    searchColumns: [globalCategories.name],
    listPage: (where, limit, offset) => db.select().from(globalCategories).where(where).orderBy(globalCategories.name).limit(limit).offset(offset),
    countRows: async (where) => (await db.select({ total: sql<number>`count(*)::int` }).from(globalCategories).where(where))[0]?.total ?? 0,
    selectTargets: (where) => db.select({ id: globalCategories.id, name: globalCategories.name }).from(globalCategories).where(where),
    existingPrefIds: async (sellerId, ids) => (await db
      .select({ id: sellerCategoryPreferences.categoryId })
      .from(sellerCategoryPreferences)
      .where(and(eq(sellerCategoryPreferences.sellerId, sellerId), inArray(sellerCategoryPreferences.categoryId, ids)))).map((r) => r.id),
    upsertPrefs: async (sellerId, ids) => {
      await db
        .insert(sellerCategoryPreferences)
        .values(ids.map((categoryId) => ({ sellerId, categoryId, isVisible: true, isEnabled: true })))
        .onConflictDoUpdate({
          target: [sellerCategoryPreferences.sellerId, sellerCategoryPreferences.categoryId],
          set: { isVisible: true, isEnabled: true, updatedAt: new Date() },
        });
    },
    bumpUsage: async (ids) => {
      await db.update(globalCategories).set({ usageCount: sql`${globalCategories.usageCount} + 1` }).where(inArray(globalCategories.id, ids));
    },
  },
  destination: {
    infoKey: 'destination',
    idKey: 'destinationId',
    nameKey: 'destinationName',
    idColumn: globalDestinations.id,
    approvedConditions: () => [eq(globalDestinations.isApproved, true), eq(globalDestinations.approvalStatus, 'approved'), eq(globalDestinations.isActive, true)],
    searchColumns: [globalDestinations.name, globalDestinations.city, globalDestinations.country],
    listPage: (where, limit, offset) => db.select().from(globalDestinations).where(where).orderBy(globalDestinations.name).limit(limit).offset(offset),
    countRows: async (where) => (await db.select({ total: sql<number>`count(*)::int` }).from(globalDestinations).where(where))[0]?.total ?? 0,
    selectTargets: (where) => db.select({ id: globalDestinations.id, name: globalDestinations.name }).from(globalDestinations).where(where),
    existingPrefIds: async (sellerId, ids) => (await db
      .select({ id: sellerDestinationPreferences.destinationId })
      .from(sellerDestinationPreferences)
      .where(and(eq(sellerDestinationPreferences.sellerId, sellerId), inArray(sellerDestinationPreferences.destinationId, ids)))).map((r) => r.id),
    upsertPrefs: async (sellerId, ids) => {
      await db
        .insert(sellerDestinationPreferences)
        .values(ids.map((destinationId) => ({ sellerId, destinationId, isVisible: true, isEnabled: true })))
        .onConflictDoUpdate({
          target: [sellerDestinationPreferences.sellerId, sellerDestinationPreferences.destinationId],
          set: { isVisible: true, isEnabled: true, updatedAt: new Date() },
        });
    },
    bumpUsage: async (ids) => {
      await db.update(globalDestinations).set({ usageCount: sql`${globalDestinations.usageCount} + 1` }).where(inArray(globalDestinations.id, ids));
    },
  },
};

const CHUNK = 1000;
const chunks = <T,>(arr: T[], size = CHUNK): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

async function loadSellerList(kind: Kind, sellerId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
  const sellerInfo: Record<string, unknown> = user?.sellerInfo || {};
  const stored = sellerInfo[kind.infoKey];
  const list: ListEntry[] = Array.isArray(stored) ? (stored as ListEntry[]) : [];
  return { user, sellerInfo, list };
}

const dedupe = (list: ListEntry[], idKey: string) => {
  const seen = new Set<string>();
  return list.filter((e) => {
    const id = e?.[idKey];
    if (typeof id !== 'string' || !id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const searchCondition = (kind: Kind, search: string) => {
  const like = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
  const parts = kind.searchColumns.map((c) => ilike(c, like));
  return parts.length === 1 ? parts[0] : sql`(${sql.join(parts, sql` OR `)})`;
};

/** GET …/available?search=&page=&limit= — approved rows the seller doesn't have yet. */
export const makeGetAvailable = (which: 'category' | 'destination') => async (req: Request, res: Response) => {
  try {
    const kind = kinds[which];
    const sellerId = req.user?.id;
    if (!sellerId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 20, 1), 100);
    const page = Math.max(parseInt(String(req.query.page)) || 1, 1);

    // Exclude what the seller already has inside SQL (no separate fetch of their list,
    // and no giant NOT IN parameter list) so this is a single round trip.
    const conditions: SQL[] = [
      ...kind.approvedConditions(),
      sql`NOT EXISTS (
        SELECT 1 FROM users u, jsonb_array_elements(COALESCE(u.seller_info->${kind.infoKey}, '[]'::jsonb)) e
        WHERE u.id = ${sellerId} AND e->>${kind.idKey} = ${kind.idColumn}
      )`,
    ];
    if (search) conditions.push(searchCondition(kind, search));
    const where = and(...conditions);

    const [items, total] = await Promise.all([
      kind.listPage(where, limit, (page - 1) * limit),
      kind.countRows(where),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(`Error listing available ${which} rows:`, error);
    res.status(500).json({ success: false, message: `Error fetching available ${which} list` });
  }
};

/** POST …/bulk-add  { ids?: string[], all?: boolean, search?: string } */
export const makeBulkAdd = (which: 'category' | 'destination') => async (req: Request, res: Response) => {
  try {
    const kind = kinds[which];
    const sellerId = req.user?.id;
    if (!sellerId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { ids, all, search } = req.body as { ids?: string[]; all?: boolean; search?: string };
    const { user, sellerInfo, list } = await loadSellerList(kind, sellerId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const ownedList = dedupe(list, kind.idKey);
    const owned = new Set(ownedList.map((e) => e[kind.idKey] as string));

    // Resolve which approved rows to add.
    const conditions: SQL[] = [...kind.approvedConditions()];
    if (all) {
      if (typeof search === 'string' && search.trim()) conditions.push(searchCondition(kind, search.trim()));
    } else if (Array.isArray(ids) && ids.length > 0) {
      conditions.push(inArray(kind.idColumn, [...new Set(ids.filter((i) => typeof i === 'string'))]));
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids, or all: true' });
    }
    const targets = await kind.selectTargets(and(...conditions));

    const toAdd = targets.filter((t) => !owned.has(t.id));
    const toAddIds = toAdd.map((t) => t.id);

    if (toAddIds.length > 0) {
      const existingPrefIds = new Set<string>();
      for (const part of chunks(toAddIds)) {
        (await kind.existingPrefIds(sellerId, part)).forEach((id) => existingPrefIds.add(id));
      }

      for (const part of chunks(toAddIds)) {
        await kind.upsertPrefs(sellerId, part);
      }

      // Counters, one UPDATE per chunk instead of one per row.
      const newlyLinked = toAddIds.filter((id) => !existingPrefIds.has(id));
      for (const part of chunks(toAddIds)) {
        await kind.bumpUsage(part);
      }
      if (which === 'destination') {
        for (const part of chunks(newlyLinked)) {
          await db.update(globalDestinations).set({ sellerCount: sql`${globalDestinations.sellerCount} + 1` }).where(inArray(globalDestinations.id, part));
        }
      }
    }

    // Single write of the seller's list (also heals duplicates already stored).
    const now = new Date();
    const merged = [
      ...ownedList,
      ...toAdd.map((t) => ({
        [kind.idKey]: t.id,
        [kind.nameKey]: t.name,
        isActive: true,
        isApproved: true,
        approvalStatus: 'approved',
        addedAt: now,
      })),
    ];
    if (toAdd.length > 0 || merged.length !== list.length) {
      await db.update(users).set({ sellerInfo: { ...sellerInfo, [kind.infoKey]: merged }, updatedAt: now }).where(eq(users.id, sellerId));
    }

    res.json({
      success: true,
      message: toAdd.length ? `Added ${toAdd.length} to your list` : 'Nothing new to add',
      data: { added: toAdd.length, alreadyHad: targets.length - toAdd.length, total: merged.length },
    });
  } catch (error) {
    console.error(`Error bulk-adding ${which} rows:`, error);
    res.status(500).json({ success: false, message: `Error adding ${which} items to your list` });
  }
};
