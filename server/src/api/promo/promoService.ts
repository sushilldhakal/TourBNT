import createHttpError from 'http-errors';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, promoCodes, tours, tourAuthors, users } from '../../db';
import { isUniqueViolation } from '../../utils/errors';

type PromoRow = typeof promoCodes.$inferSelect;

export interface Requester {
  id: string;
  isAdmin: boolean;
}

export const normaliseCode = (code: unknown): string => String(code ?? '').trim().toUpperCase().replace(/\s+/g, '');

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One message for every "this code can't be used" case, so the endpoint can't be used to probe which codes exist. */
const invalid = () => createHttpError(400, 'This promo code is not valid.');

export interface PromoCheck {
  promo: PromoRow;
  /** How much comes off `subtotal`. */
  amount: number;
}

/**
 * Whether `code` can be used on `tourId` right now for a booking worth `subtotal`, and how much it takes off.
 * Throws a 400 with a traveller-friendly message otherwise. Does NOT use the code up — see redeemPromo.
 */
export async function checkPromo(opts: { code: unknown; tourId: string; subtotal: number; now?: Date }): Promise<PromoCheck> {
  const code = normaliseCode(opts.code);
  if (!code) throw createHttpError(400, 'Enter a promo code.');
  const now = opts.now ?? new Date();

  const [row] = await db
    .select({ promo: promoCodes, ownerRole: users.role })
    .from(promoCodes)
    .innerJoin(users, eq(users.id, promoCodes.ownerId))
    .where(eq(promoCodes.code, code))
    .limit(1);
  if (!row || !row.promo.isActive) throw invalid();
  const { promo } = row;

  if (promo.startsAt && now < promo.startsAt) throw createHttpError(400, 'This promo code is not active yet.');
  if (promo.expiresAt && now > promo.expiresAt) throw createHttpError(400, 'This promo code has expired.');
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) throw createHttpError(400, 'This promo code has reached its usage limit.');
  if (promo.tourIds && promo.tourIds.length > 0 && !promo.tourIds.includes(opts.tourId)) throw createHttpError(400, 'This promo code does not apply to this tour.');

  // A seller's code only works on that seller's own tours; an admin's code works platform-wide.
  if (row.ownerRole !== 'admin') {
    const [own] = await db.select({ u: tourAuthors.userId }).from(tourAuthors).where(and(eq(tourAuthors.tourId, opts.tourId), eq(tourAuthors.userId, promo.ownerId))).limit(1);
    if (!own) throw createHttpError(400, 'This promo code does not apply to this tour.');
  }

  if (promo.minBookingAmount != null && opts.subtotal < promo.minBookingAmount) {
    throw createHttpError(400, `This promo code needs a booking of at least $${promo.minBookingAmount.toFixed(2)}.`);
  }

  let amount = promo.discountType === 'percentage' ? (opts.subtotal * promo.discountValue) / 100 : promo.discountValue;
  if (promo.maxDiscountAmount != null) amount = Math.min(amount, promo.maxDiscountAmount);
  amount = round2(Math.min(amount, opts.subtotal));
  if (amount <= 0) throw invalid();
  return { promo, amount };
}

/**
 * Uses one redemption, atomically: the UPDATE only succeeds while the limit has room, so two travellers
 * can't both take the last use. Returns false if the code ran out in the meantime.
 */
export async function redeemPromo(id: string): Promise<boolean> {
  const rows = await db
    .update(promoCodes)
    .set({ usedCount: sql`${promoCodes.usedCount} + 1`, updatedAt: new Date() })
    .where(and(eq(promoCodes.id, id), sql`(${promoCodes.maxUses} IS NULL OR ${promoCodes.usedCount} < ${promoCodes.maxUses})`))
    .returning({ id: promoCodes.id });
  return rows.length > 0;
}

/** Gives a redemption back (a cancelled booking, or a booking that failed after the code was redeemed). */
export async function releasePromo(idOrCode: { id?: string; code?: string }): Promise<void> {
  const where = idOrCode.id ? eq(promoCodes.id, idOrCode.id) : eq(promoCodes.code, normaliseCode(idOrCode.code));
  await db.update(promoCodes).set({ usedCount: sql`greatest(${promoCodes.usedCount} - 1, 0)`, updatedAt: new Date() }).where(where);
}

// ---------------------------------------------------------------------------
// management (sellers and admins)
// ---------------------------------------------------------------------------
export interface PromoInput {
  code?: unknown;
  description?: unknown;
  discountType?: unknown;
  discountValue?: unknown;
  maxDiscountAmount?: unknown;
  minBookingAmount?: unknown;
  startsAt?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
  isActive?: unknown;
  tourIds?: unknown;
}

const optionalNumber = (v: unknown, field: string, opts: { min?: number; integer?: boolean } = {}): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || (opts.min != null && n < opts.min) || (opts.integer && !Number.isInteger(n))) {
    throw createHttpError(400, `${field} is not a valid number.`);
  }
  return n;
};

const optionalDate = (v: unknown, field: string): Date | null => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw createHttpError(400, `${field} is not a valid date.`);
  return d;
};

async function assertCanDiscountTours(requester: Requester, tourIds: string[]) {
  if (tourIds.length === 0) return;
  const found = await db.select({ id: tours.id }).from(tours).where(inArray(tours.id, tourIds));
  if (found.length !== new Set(tourIds).size) throw createHttpError(400, 'One or more of the selected tours do not exist.');
  if (requester.isAdmin) return;
  const owned = await db.select({ id: tourAuthors.tourId }).from(tourAuthors).where(and(eq(tourAuthors.userId, requester.id), inArray(tourAuthors.tourId, tourIds)));
  if (owned.length !== new Set(tourIds).size) throw createHttpError(403, 'You can only create promo codes for your own tours.');
}

/** Validates the fields of a create or (partial) update and returns what to write. */
async function parseInput(input: PromoInput, requester: Requester, partial: boolean) {
  const out: Partial<typeof promoCodes.$inferInsert> = {};

  if (!partial || input.code !== undefined) {
    const code = normaliseCode(input.code);
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw createHttpError(400, 'Code must be 3–32 characters: letters, numbers, - or _.');
    out.code = code;
  }
  if (!partial || input.discountType !== undefined) {
    if (input.discountType !== 'percentage' && input.discountType !== 'fixed') throw createHttpError(400, "discountType must be 'percentage' or 'fixed'.");
    out.discountType = input.discountType;
  }
  if (!partial || input.discountValue !== undefined) {
    const v = optionalNumber(input.discountValue, 'discountValue', { min: 0.01 });
    if (v == null) throw createHttpError(400, 'discountValue is required.');
    out.discountValue = v;
  }
  const type = out.discountType ?? (input.discountType as string | undefined);
  if (out.discountValue != null && (type ?? 'percentage') === 'percentage' && out.discountValue > 100) throw createHttpError(400, 'A percentage discount cannot be more than 100.');

  if (input.description !== undefined) out.description = input.description ? String(input.description).slice(0, 300) : null;
  if (input.maxDiscountAmount !== undefined) out.maxDiscountAmount = optionalNumber(input.maxDiscountAmount, 'maxDiscountAmount', { min: 0.01 });
  if (input.minBookingAmount !== undefined) out.minBookingAmount = optionalNumber(input.minBookingAmount, 'minBookingAmount', { min: 0 });
  if (input.startsAt !== undefined) out.startsAt = optionalDate(input.startsAt, 'startsAt');
  if (input.expiresAt !== undefined) out.expiresAt = optionalDate(input.expiresAt, 'expiresAt');
  if (out.startsAt && out.expiresAt && out.expiresAt <= out.startsAt) throw createHttpError(400, 'The expiry date must be after the start date.');
  if (input.maxUses !== undefined) out.maxUses = optionalNumber(input.maxUses, 'maxUses', { min: 1, integer: true });
  if (input.isActive !== undefined) out.isActive = input.isActive === true || input.isActive === 'true';
  if (input.tourIds !== undefined) {
    const ids = Array.isArray(input.tourIds) ? input.tourIds.map(String).filter(Boolean) : [];
    await assertCanDiscountTours(requester, ids);
    out.tourIds = ids.length ? ids : null;
  }
  return out;
}

export async function listPromos(requester: Requester) {
  const where = requester.isAdmin ? undefined : eq(promoCodes.ownerId, requester.id);
  return db.select().from(promoCodes).where(where).orderBy(desc(promoCodes.createdAt));
}

export async function createPromo(requester: Requester, input: PromoInput) {
  const values = await parseInput(input, requester, false);
  try {
    const [row] = await db.insert(promoCodes).values({ ...(values as typeof promoCodes.$inferInsert), ownerId: requester.id }).returning();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw createHttpError(409, 'A promo code with that name already exists.');
    throw err;
  }
}

async function loadOwned(requester: Requester, id: string): Promise<PromoRow> {
  const [row] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
  if (!row) throw createHttpError(404, 'Promo code not found.');
  if (!requester.isAdmin && row.ownerId !== requester.id) throw createHttpError(403, 'You can only change your own promo codes.');
  return row;
}

export async function updatePromo(requester: Requester, id: string, input: PromoInput) {
  await loadOwned(requester, id);
  const values = await parseInput(input, requester, true);
  try {
    const [row] = await db.update(promoCodes).set({ ...values, updatedAt: new Date() }).where(eq(promoCodes.id, id)).returning();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw createHttpError(409, 'A promo code with that name already exists.');
    throw err;
  }
}

export async function deletePromo(requester: Requester, id: string) {
  await loadOwned(requester, id);
  await db.delete(promoCodes).where(eq(promoCodes.id, id));
}
