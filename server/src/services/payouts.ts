import createHttpError from 'http-errors';
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db, appSettings, bookings, payouts, tourAuthors, users } from '../db';

/**
 * Seller commission and payouts.
 *
 *  - Each booking records who earns from it (the tour's primary seller) and the platform's cut, frozen when the
 *    booking is made (bookings.commission_*), so changing the rate later never rewrites history.
 *  - A booking becomes payable once it is PAID, confirmed/completed, and its trip is over (a day after departure).
 *  - An admin gathers a seller's payable bookings into a payout, transfers the money, and marks the payout paid.
 */

const COMMISSION_KEY = 'commission';
const FALLBACK_RATE = 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// rates
// ---------------------------------------------------------------------------
export async function getDefaultCommissionRate(): Promise<number> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, COMMISSION_KEY)).limit(1);
  const stored = Number((row?.value as { defaultRate?: unknown } | undefined)?.defaultRate);
  if (Number.isFinite(stored) && stored >= 0 && stored <= 100) return stored;
  const env = Number(process.env.DEFAULT_COMMISSION_RATE);
  return Number.isFinite(env) && env >= 0 && env <= 100 ? env : FALLBACK_RATE;
}

function assertRate(rate: unknown): number {
  const n = Number(rate);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw createHttpError(400, 'Commission must be a percentage between 0 and 100.');
  return n;
}

export async function setDefaultCommissionRate(rate: unknown): Promise<number> {
  const defaultRate = assertRate(rate);
  await db
    .insert(appSettings)
    .values({ key: COMMISSION_KEY, value: { defaultRate } })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: { defaultRate }, updatedAt: new Date() } });
  return defaultRate;
}

/** A seller's own rate if an admin set one, otherwise the platform default. */
export async function getSellerCommissionRate(sellerId: string): Promise<number> {
  const [u] = await db.select({ rate: users.commissionRate }).from(users).where(eq(users.id, sellerId)).limit(1);
  return u?.rate != null ? u.rate : getDefaultCommissionRate();
}

/** Admin: set (or with null, clear) one seller's rate. */
export async function setSellerCommissionRate(sellerId: string, rate: unknown): Promise<number | null> {
  const value = rate === null || rate === '' || rate === undefined ? null : assertRate(rate);
  const updated = await db.update(users).set({ commissionRate: value, updatedAt: new Date() }).where(eq(users.id, sellerId)).returning({ id: users.id });
  if (updated.length === 0) throw createHttpError(404, 'Seller not found.');
  return value;
}

// ---------------------------------------------------------------------------
// per-booking split
// ---------------------------------------------------------------------------
export function splitBooking(total: number, ratePercent: number) {
  const commissionAmount = round2((total * ratePercent) / 100);
  return { commissionAmount, sellerEarning: round2(total - commissionAmount) };
}

/** The seller who is paid for a tour: its primary author (the same one enquiries are assigned to). */
export async function primarySellerOf(tourId: string): Promise<string | null> {
  const [row] = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(eq(tourAuthors.tourId, tourId)).orderBy(asc(tourAuthors.userId)).limit(1);
  return row?.userId ?? null;
}

/** The fields to store on a new booking for its seller, commission and earning. */
export async function earningsForNewBooking(tourId: string, totalPrice: number) {
  const sellerId = await primarySellerOf(tourId);
  if (!sellerId) return { sellerId: null, commissionRate: null, commissionAmount: 0, sellerEarning: 0 };
  const commissionRate = await getSellerCommissionRate(sellerId);
  return { sellerId, commissionRate, ...splitBooking(totalPrice, commissionRate) };
}

// ---------------------------------------------------------------------------
// what is payable
// ---------------------------------------------------------------------------
const dayAgo = () => new Date(Date.now() - 24 * 3600 * 1000);

/** Paid, confirmed/completed, trip over, and not yet in a payout. */
const payableCondition = (sellerId?: string) =>
  and(
    sellerId ? eq(bookings.sellerId, sellerId) : undefined,
    isNull(bookings.payoutId),
    eq(bookings.paymentStatus, 'paid'),
    inArray(bookings.status, ['confirmed', 'completed']),
    lt(bookings.departureDate, dayAgo()),
    sql`${bookings.sellerEarning} > 0`,
  );

export async function sellerSummary(sellerId: string) {
  const [payable] = await db
    .select({ amount: sql<number>`coalesce(sum(${bookings.sellerEarning}), 0)::float`, count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(payableCondition(sellerId));
  const [upcoming] = await db
    .select({ amount: sql<number>`coalesce(sum(${bookings.sellerEarning}), 0)::float`, count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.sellerId, sellerId), isNull(bookings.payoutId), eq(bookings.paymentStatus, 'paid'), inArray(bookings.status, ['pending', 'confirmed', 'completed']), gte(bookings.departureDate, dayAgo()), sql`${bookings.sellerEarning} > 0`));
  const [pending] = await db
    .select({ amount: sql<number>`coalesce(sum(${payouts.amount}), 0)::float` })
    .from(payouts)
    .where(and(eq(payouts.sellerId, sellerId), eq(payouts.status, 'pending')));
  const [paid] = await db
    .select({ amount: sql<number>`coalesce(sum(${payouts.amount}), 0)::float` })
    .from(payouts)
    .where(and(eq(payouts.sellerId, sellerId), eq(payouts.status, 'paid')));
  return {
    commissionRate: await getSellerCommissionRate(sellerId),
    currency: 'USD',
    payable: { amount: round2(payable.amount), bookings: payable.count },        // ready for the next payout
    upcoming: { amount: round2(upcoming.amount), bookings: upcoming.count },      // paid, trip not finished yet
    inPendingPayouts: round2(pending.amount),                                      // a payout exists, transfer not made
    paidOut: round2(paid.amount),
  };
}

/** Admin: each seller with money ready to pay out. */
export async function adminBalances() {
  const rows = await db
    .select({
      sellerId: bookings.sellerId,
      name: users.name,
      email: users.email,
      commissionRate: users.commissionRate,
      amount: sql<number>`sum(${bookings.sellerEarning})::float`,
      bookings: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.sellerId))
    .where(payableCondition())
    .groupBy(bookings.sellerId, users.name, users.email, users.commissionRate)
    .orderBy(desc(sql`sum(${bookings.sellerEarning})`));
  return rows.map((r) => ({ ...r, amount: round2(r.amount) }));
}

// ---------------------------------------------------------------------------
// payouts
// ---------------------------------------------------------------------------
/** Gathers every payable booking of a seller into one pending payout. */
export async function createPayout(adminId: string, sellerId: string, notes?: string) {
  return db.transaction(async (tx) => {
    const eligible = await tx
      .select({ id: bookings.id, earning: bookings.sellerEarning })
      .from(bookings)
      .where(payableCondition(sellerId))
      .for('update');
    if (eligible.length === 0) throw createHttpError(400, 'This seller has nothing payable right now.');
    const amount = round2(eligible.reduce((n, b) => n + b.earning, 0));
    const [payout] = await tx
      .insert(payouts)
      .values({ sellerId, amount, bookingCount: eligible.length, createdBy: adminId, notes: notes?.trim() || null })
      .returning();
    await tx.update(bookings).set({ payoutId: payout.id, updatedAt: new Date() }).where(inArray(bookings.id, eligible.map((b) => b.id)));
    return payout;
  });
}

export async function markPayoutPaid(payoutId: string, reference: string) {
  const ref = reference?.trim();
  if (!ref) throw createHttpError(400, 'Enter the transfer reference (bank transaction id) for this payout.');
  const [payout] = await db.select().from(payouts).where(eq(payouts.id, payoutId)).limit(1);
  if (!payout) throw createHttpError(404, 'Payout not found.');
  if (payout.status === 'paid') throw createHttpError(400, 'This payout is already marked as paid.');
  const [updated] = await db.update(payouts).set({ status: 'paid', reference: ref, paidAt: new Date(), updatedAt: new Date() }).where(eq(payouts.id, payoutId)).returning();
  return updated;
}

/** A payout that has not been paid can be undone: its bookings become payable again. */
export async function deletePendingPayout(payoutId: string) {
  await db.transaction(async (tx) => {
    const [payout] = await tx.select().from(payouts).where(eq(payouts.id, payoutId)).limit(1);
    if (!payout) throw createHttpError(404, 'Payout not found.');
    if (payout.status === 'paid') throw createHttpError(400, 'A paid payout cannot be deleted.');
    await tx.update(bookings).set({ payoutId: null, updatedAt: new Date() }).where(eq(bookings.payoutId, payoutId));
    await tx.delete(payouts).where(eq(payouts.id, payoutId));
  });
}

export async function listPayouts(filter: { sellerId?: string } = {}) {
  return db
    .select({ payout: payouts, sellerName: users.name, sellerEmail: users.email })
    .from(payouts)
    .innerJoin(users, eq(users.id, payouts.sellerId))
    .where(filter.sellerId ? eq(payouts.sellerId, filter.sellerId) : undefined)
    .orderBy(desc(payouts.createdAt))
    .then((rows) => rows.map((r) => ({ ...r.payout, sellerName: r.sellerName, sellerEmail: r.sellerEmail })));
}

/** One payout with the bookings it covers — the data behind the printable statement. */
export async function getPayoutStatement(payoutId: string, requester: { id: string; isAdmin: boolean }) {
  const [row] = await db
    .select({ payout: payouts, sellerName: users.name, sellerEmail: users.email })
    .from(payouts)
    .innerJoin(users, eq(users.id, payouts.sellerId))
    .where(eq(payouts.id, payoutId))
    .limit(1);
  if (!row) throw createHttpError(404, 'Payout not found.');
  if (!requester.isAdmin && row.payout.sellerId !== requester.id) throw createHttpError(403, 'You can only view your own payouts.');
  const items = await db
    .select({
      id: bookings.id,
      bookingReference: bookings.bookingReference,
      tourTitle: bookings.tourTitle,
      departureDate: bookings.departureDate,
      contactName: bookings.contactName,
      total: sql<number>`(${bookings.pricing}->>'totalPrice')::float`,
      commissionRate: bookings.commissionRate,
      commissionAmount: bookings.commissionAmount,
      sellerEarning: bookings.sellerEarning,
    })
    .from(bookings)
    .where(eq(bookings.payoutId, payoutId))
    .orderBy(asc(bookings.departureDate));
  return { ...row.payout, sellerName: row.sellerName, sellerEmail: row.sellerEmail, items };
}
