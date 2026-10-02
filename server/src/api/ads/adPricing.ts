import { db, adPricingSettings } from '../../db';
import { eq } from 'drizzle-orm';

export type AdBillingModel = 'monthly' | 'per_view';

export interface AdPricing {
  monthlyPrice: number;
  pricePer100Views: number;
  currency: string;
  updatedAt?: Date | string | null;
}

const DEFAULT_PRICING: AdPricing = { monthlyPrice: 5000, pricePer100Views: 50, currency: 'NPR' };
const PRICING_ID = 'default';

export const MAX_DURATION_MONTHS = 12;
export const MIN_VIEWS = 100;
export const MAX_VIEWS = 10_000_000;

export async function getAdPricing(): Promise<AdPricing> {
  const [row] = await db.select().from(adPricingSettings).where(eq(adPricingSettings.id, PRICING_ID)).limit(1);
  if (!row) return DEFAULT_PRICING;
  return { monthlyPrice: row.monthlyPrice, pricePer100Views: row.pricePer100Views, currency: row.currency, updatedAt: row.updatedAt };
}

export async function updateAdPricing(input: { monthlyPrice: number; pricePer100Views: number }, updatedBy: string): Promise<AdPricing> {
  const values = { ...input, updatedBy, updatedAt: new Date() };
  const [row] = await db.insert(adPricingSettings)
    .values({ id: PRICING_ID, currency: DEFAULT_PRICING.currency, ...values })
    .onConflictDoUpdate({ target: adPricingSettings.id, set: values })
    .returning();
  return { monthlyPrice: row.monthlyPrice, pricePer100Views: row.pricePer100Views, currency: row.currency, updatedAt: row.updatedAt };
}

export interface AdOrder {
  billingModel: AdBillingModel;
  durationMonths: number;
  viewQuota: number | null;
}

/**
 * Validates what a business is buying and normalises it:
 *   monthly  — 1..12 months, price = months × monthly price
 *   per_view — views rounded up to the next 100, price = (views / 100) × price per 100 views,
 *              delivered within `durationMonths` (default 1).
 * Returns an error message instead when the order is invalid.
 */
export function normaliseAdOrder(raw: { billingModel?: unknown; durationMonths?: unknown; viewQuota?: unknown }): AdOrder | string {
  const billingModel = (raw.billingModel ?? 'monthly') as string;
  if (billingModel !== 'monthly' && billingModel !== 'per_view') return 'billingModel must be "monthly" or "per_view"';

  const durationMonths = raw.durationMonths === undefined || raw.durationMonths === '' ? 1 : Number(raw.durationMonths);
  if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > MAX_DURATION_MONTHS) {
    return `durationMonths must be a whole number from 1 to ${MAX_DURATION_MONTHS}`;
  }

  if (billingModel === 'monthly') return { billingModel, durationMonths, viewQuota: null };

  const views = Number(raw.viewQuota);
  if (!Number.isFinite(views) || views < MIN_VIEWS || views > MAX_VIEWS) {
    return `viewQuota must be between ${MIN_VIEWS} and ${MAX_VIEWS} views`;
  }
  return { billingModel, durationMonths, viewQuota: Math.ceil(views / 100) * 100 };
}

export function priceAdOrder(order: AdOrder, pricing: AdPricing): number {
  return order.billingModel === 'monthly'
    ? order.durationMonths * pricing.monthlyPrice
    : ((order.viewQuota ?? 0) / 100) * pricing.pricePer100Views;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
