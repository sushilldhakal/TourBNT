import { Request, Response } from 'express';
import {
  db,
  users,
  globalCategories,
  globalDestinations,
  sellerCategoryPreferences,
  sellerDestinationPreferences,
} from '@tourbnt/db';
import { and, eq, ilike, inArray, sql } from 'drizzle-orm';

/**
 * Bulk "add existing" for the seller's category / destination lists.
 *
 * The one-at-a-time endpoints did a read-modify-write of `users.sellerInfo`
 * per request, so firing many in parallel raced and wrote duplicate entries.
 * These do the whole job in a handful of queries and one `sellerInfo` write,
 * and dedupe the stored list while they are at it.
 */
interface Kind {
  table: any;
  prefs: any;
  prefFk: string; // column key on the prefs table that points at the global row
  infoKey: 'category' | 'destination';
  idKey: 'categoryId' | 'destinationId';
  nameKey: 'categoryName' | 'destinationName';
  extraApproved: any[]; // additional filters beyond isApproved/approvalStatus
  searchColumns: any[];
}

const kinds: Record<'category' | 'destination', Kind> = {
  category: {
    table: globalCategories,
    prefs: sellerCategoryPreferences,
    prefFk: 'categoryId',
    infoKey: 'category',
    idKey: 'categoryId',
    nameKey: 'categoryName',
    extraApproved: [],
    searchColumns: [globalCategories.name],
  },
  destination: {
    table: globalDestinations,
    prefs: sellerDestinationPreferences,
    prefFk: 'destinationId',
    infoKey: 'destination',
    idKey: 'destinationId',
    nameKey: 'destinationName',
    extraApproved: [eq(globalDestinations.isActive, true)],
    searchColumns: [globalDestinations.name, globalDestinations.city, globalDestinations.country],
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
  const sellerInfo = (user?.sellerInfo as Record<string, any> | null) || {};
  const list: Array<Record<string, any>> = Array.isArray(sellerInfo[kind.infoKey]) ? sellerInfo[kind.infoKey] : [];
  return { user, sellerInfo, list };
}

const dedupe = (list: Array<Record<string, any>>, idKey: string) => {
  const seen = new Set<string>();
  return list.filter((e) => {
    const id = e?.[idKey];
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const approvedConditions = (kind: Kind) => [
  eq(kind.table.isApproved, true),
  eq(kind.table.approvalStatus, 'approved'),
  ...kind.extraApproved,
];

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
    const conditions = [
      ...approvedConditions(kind),
      sql`NOT EXISTS (
        SELECT 1 FROM users u, jsonb_array_elements(COALESCE(u.seller_info->${kind.infoKey}, '[]'::jsonb)) e
        WHERE u.id = ${sellerId} AND e->>${kind.idKey} = ${kind.table.id}
      )`,
    ];
    if (search) conditions.push(searchCondition(kind, search));
    const where = and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      db.select().from(kind.table).where(where).orderBy(kind.table.name).limit(limit).offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)::int` }).from(kind.table).where(where),
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
    const conditions = [...approvedConditions(kind)];
    if (all) {
      if (typeof search === 'string' && search.trim()) conditions.push(searchCondition(kind, search.trim()));
    } else if (Array.isArray(ids) && ids.length > 0) {
      conditions.push(inArray(kind.table.id, [...new Set(ids.filter((i) => typeof i === 'string'))]));
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids, or all: true' });
    }
    const targets: Array<{ id: string; name: string }> = await db
      .select({ id: kind.table.id, name: kind.table.name })
      .from(kind.table)
      .where(and(...conditions));

    const toAdd = targets.filter((t) => !owned.has(t.id));
    const toAddIds = toAdd.map((t) => t.id);

    if (toAddIds.length > 0) {
      const existingPrefIds = new Set<string>();
      for (const part of chunks(toAddIds)) {
        const rows = await db
          .select({ id: kind.prefs[kind.prefFk] })
          .from(kind.prefs)
          .where(and(eq(kind.prefs.sellerId, sellerId), inArray(kind.prefs[kind.prefFk], part)));
        rows.forEach((r: any) => existingPrefIds.add(r.id));
      }

      for (const part of chunks(toAddIds)) {
        await db
          .insert(kind.prefs)
          .values(part.map((id) => ({ sellerId, [kind.prefFk]: id, isVisible: true, isEnabled: true })))
          .onConflictDoUpdate({
            target: [kind.prefs.sellerId, kind.prefs[kind.prefFk]],
            set: { isVisible: true, isEnabled: true, updatedAt: new Date() },
          });
      }

      // Counters, one UPDATE per chunk instead of one per row.
      const newlyLinked = toAddIds.filter((id) => !existingPrefIds.has(id));
      for (const part of chunks(toAddIds)) {
        await db.update(kind.table).set({ usageCount: sql`${kind.table.usageCount} + 1` }).where(inArray(kind.table.id, part));
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
      await db.update(users).set({ sellerInfo: { ...sellerInfo, [kind.infoKey]: merged } as any, updatedAt: now }).where(eq(users.id, sellerId));
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
