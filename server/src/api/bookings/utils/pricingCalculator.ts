import createHttpError from 'http-errors';
import type { tours } from '../../../db';

type TourRow = typeof tours.$inferSelect;

interface DiscountConfig {
  discountEnabled?: boolean;
  discountPrice?: number;
  discountPercentage?: number;
  percentageOrPrice?: boolean;
  discountDateRange?: { from?: string | Date; to?: string | Date };
}

interface PricingOptionRow {
  id?: string;
  category: string;
  price: number;
  discount?: DiscountConfig;
}

interface Participants {
  adults: number;
  children: number;
  infants: number;
}

export type PaymentType = 'full_payment' | 'deposit_percentage' | 'pay_on_arrival';

export interface CalculatedBookingPricing {
  basePrice: number;
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  totalPrice: number;
  currency: string;
  amountDueNow: number;
  amountDueLater: number;
  depositPercentage?: number;
  /** A promo code taken off the total (totalPrice and the amounts due already reflect it). */
  promo?: { code: string; amount: number };
}

/** Children are priced at this fraction of the adult price when the tour
 * hasn't defined an explicit "child" pricing option — a documented, named
 * default rather than a silently invented number. */
const DEFAULT_CHILD_PRICE_RATIO = 0.7;

const DEFAULT_PAYMENT_OPTIONS = { fullPaymentEnabled: true, depositEnabled: false, depositPercentage: 20, payOnArrivalEnabled: false };

function isDiscountActive(discount: DiscountConfig | undefined, now: Date): boolean {
  if (!discount?.discountEnabled) return false;
  const from = discount.discountDateRange?.from ? new Date(discount.discountDateRange.from) : null;
  const to = discount.discountDateRange?.to ? new Date(discount.discountDateRange.to) : null;
  if (from && now < from) return false;
  if (to && now > to) return false;
  return true;
}

/** Applies a discount ONCE to a subtotal (not per unit) — matches "$X off" / "Y% off" coupon semantics. */
function applyDiscountToSubtotal(subtotal: number, discount: DiscountConfig | undefined, now: Date): number {
  if (!isDiscountActive(discount, now)) return subtotal;
  if (discount!.percentageOrPrice) {
    return Math.max(0, subtotal * (1 - (discount!.discountPercentage || 0) / 100));
  }
  return Math.max(0, subtotal - (discount!.discountPrice || 0));
}

/** The tour's flat per-unit price before any per-category pricing options — sale price takes precedence over the discount config. */
function baseUnitPrice(tour: TourRow): number {
  if (tour.saleEnabled && tour.salePrice != null) return tour.salePrice;
  return tour.price ?? 0;
}

/**
 * Computes the authoritative price for a booking from the tour's own stored
 * pricing configuration — never trusts a client-submitted total. Mirrors (and
 * is the source of truth for) the preview shown in FrontBooking.tsx.
 */
export function calculateBookingPricing(
  tour: TourRow,
  participants: Participants,
  paymentType: PaymentType,
  pricingOptionId?: string | null,
  /** A promo discount already validated and sized by the promo service (see api/promo/promoService.ts). */
  promo?: { code: string; amount: number } | null
): CalculatedBookingPricing {
  const base = calculateBasePricing(tour, participants, paymentType, pricingOptionId);
  if (!promo || promo.amount <= 0) return base;

  // Take the promo off the total and recompute what is due now / later against the new total. The line items
  // shrink proportionally so they still add up to the total (same approach as the tour's own discounts).
  const amount = Math.min(promo.amount, base.totalPrice);
  const totalPrice = Math.max(0, base.totalPrice - amount);
  const ratio = base.totalPrice > 0 ? totalPrice / base.totalPrice : 1;
  return {
    ...base,
    adultPrice: base.adultPrice * ratio,
    childPrice: base.childPrice * ratio,
    totalPrice,
    ...computeDueAmounts(totalPrice, paymentType, tour),
    promo: { code: promo.code, amount: Math.round(amount * 100) / 100 },
  };
}

function calculateBasePricing(
  tour: TourRow,
  participants: Participants,
  paymentType: PaymentType,
  pricingOptionId?: string | null
): CalculatedBookingPricing {
  const now = new Date();
  const currency = 'USD';

  if (tour.pricePerPerson === false) {
    // Flat group price — participant counts don't multiply the price.
    let groupPrice = baseUnitPrice(tour);
    if (!(tour.saleEnabled && tour.salePrice != null)) {
      groupPrice = applyDiscountToSubtotal(groupPrice, tour.discount as DiscountConfig, now);
    }
    return {
      basePrice: groupPrice,
      adultPrice: groupPrice,
      childPrice: 0,
      infantPrice: 0,
      totalPrice: groupPrice,
      currency,
      ...computeDueAmounts(groupPrice, paymentType, tour),
    };
  }

  const pricingOptions = (tour.pricingOptions as PricingOptionRow[] | null) || [];
  let adultUnit: number;
  let childUnit: number;
  let adultSubtotal: number;
  let childSubtotal: number;

  if (tour.pricingOptionsEnabled && pricingOptions.length > 0) {
    const adultOption = pricingOptionId
      ? pricingOptions.find((o) => o.id === pricingOptionId)
      : pricingOptions.find((o) => o.category === 'adult');
    const childOption = pricingOptions.find((o) => o.category === 'child');

    if (!adultOption) {
      throw createHttpError(400, 'This tour has pricing options enabled but no matching adult pricing option was found');
    }

    adultUnit = adultOption.price;
    adultSubtotal = applyDiscountToSubtotal(adultUnit * participants.adults, adultOption.discount, now);

    childUnit = childOption ? childOption.price : adultUnit;
    childSubtotal = childOption
      ? applyDiscountToSubtotal(childUnit * participants.children, childOption.discount, now)
      : applyDiscountToSubtotal(childUnit * participants.children, adultOption.discount, now);
  } else {
    adultUnit = baseUnitPrice(tour);
    childUnit = adultUnit * DEFAULT_CHILD_PRICE_RATIO;

    const rawSubtotal = adultUnit * participants.adults + childUnit * participants.children;
    const discountedSubtotal = (tour.saleEnabled && tour.salePrice != null)
      ? rawSubtotal
      : applyDiscountToSubtotal(rawSubtotal, tour.discount as DiscountConfig, now);

    // Split the (possibly discounted) combined subtotal back proportionally
    // so adultPrice/childPrice remain meaningful line items that sum to the total.
    const ratio = rawSubtotal > 0 ? discountedSubtotal / rawSubtotal : 1;
    adultSubtotal = adultUnit * participants.adults * ratio;
    childSubtotal = childUnit * participants.children * ratio;
  }

  const infantPrice = 0; // infants travel free — no pricing-option category exists for them today.
  const totalPrice = adultSubtotal + childSubtotal + infantPrice;

  return {
    basePrice: adultUnit,
    adultPrice: adultSubtotal,
    childPrice: childSubtotal,
    infantPrice,
    totalPrice,
    currency,
    ...computeDueAmounts(totalPrice, paymentType, tour),
  };
}

function computeDueAmounts(totalPrice: number, paymentType: PaymentType, tour: TourRow): { amountDueNow: number; amountDueLater: number; depositPercentage?: number } {
  const options = (tour.paymentOptions as typeof DEFAULT_PAYMENT_OPTIONS | null) || DEFAULT_PAYMENT_OPTIONS;

  const enabledByType: Record<PaymentType, boolean> = {
    full_payment: options.fullPaymentEnabled,
    deposit_percentage: options.depositEnabled,
    pay_on_arrival: options.payOnArrivalEnabled,
  };

  if (!enabledByType[paymentType]) {
    throw createHttpError(400, `This tour does not offer "${paymentType.replace('_', ' ')}" as a payment option`);
  }

  switch (paymentType) {
    case 'full_payment':
      return { amountDueNow: totalPrice, amountDueLater: 0 };
    case 'pay_on_arrival':
      return { amountDueNow: 0, amountDueLater: totalPrice };
    case 'deposit_percentage': {
      const amountDueNow = Math.round(totalPrice * (options.depositPercentage / 100) * 100) / 100;
      return { amountDueNow, amountDueLater: Math.round((totalPrice - amountDueNow) * 100) / 100, depositPercentage: options.depositPercentage };
    }
  }
}
