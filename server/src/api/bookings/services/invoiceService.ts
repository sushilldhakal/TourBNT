import createHttpError from 'http-errors';
import { and, eq } from 'drizzle-orm';
import { db, bookings, tours, tourAuthors, users } from '../../../db';
import { primarySellerOf } from '../../../services/payouts';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/**
 * The traveller's invoice for one booking, built from the price frozen on the booking (never re-priced).
 *
 * Who may see it: the traveller who booked, the tour's seller(s), and admins. Guest bookings have no account,
 * so only the seller and admins can open those (the guest has the emailed confirmation and receipt).
 */
export async function getBookingInvoice(bookingId: string, requester: { id: string; isAdmin: boolean }) {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!b) throw createHttpError(404, 'Booking not found');

  if (!requester.isAdmin && b.userId !== requester.id && b.sellerId !== requester.id) {
    const [author] = await db.select({ u: tourAuthors.userId }).from(tourAuthors)
      .where(and(eq(tourAuthors.tourId, b.tourId), eq(tourAuthors.userId, requester.id))).limit(1);
    if (!author) throw createHttpError(403, 'You do not have access to this booking');
  }

  const [tour] = await db.select({ title: tours.title, code: tours.code, pricePerPerson: tours.pricePerPerson }).from(tours).where(eq(tours.id, b.tourId)).limit(1);
  const sellerId = b.sellerId ?? (await primarySellerOf(b.tourId));
  const [seller] = sellerId
    ? await db.select({ name: users.name, email: users.email, phone: users.phone, sellerInfo: users.sellerInfo }).from(users).where(eq(users.id, sellerId)).limit(1)
    : [];

  const pricing = b.pricing;
  const currency = pricing.currency || 'USD';
  const total = round2(pricing.totalPrice);
  const promoAmount = round2(pricing.promo?.amount ?? 0);
  // The promo was spread across the adult/child amounts; undo that so the lines show the price before it.
  const beforePromo = total + promoAmount;
  const undo = total > 0 ? beforePromo / total : 1;
  const { adults = 0, children = 0, infants = 0 } = b.participants ?? {};
  const title = tour?.title ?? b.tourTitle;

  const lines: InvoiceLine[] = [];
  if (tour?.pricePerPerson === false) {
    const pax = adults + children + infants;
    lines.push({ description: `${title} (group price, ${pax} traveller${pax === 1 ? '' : 's'})`, quantity: 1, unitPrice: round2(beforePromo), amount: round2(beforePromo) });
  } else {
    const adultAmount = round2(pricing.adultPrice * undo);
    const childAmount = round2(pricing.childPrice * undo);
    if (adults) lines.push({ description: `${title}, adult`, quantity: adults, unitPrice: round2(adultAmount / adults), amount: adultAmount });
    if (children) lines.push({ description: `${title}, child`, quantity: children, unitPrice: round2(childAmount / children), amount: childAmount });
    if (infants) lines.push({ description: `${title}, infant (travels free)`, quantity: infants, unitPrice: 0, amount: 0 });
    // Rounding the lines can leave a cent over or under; put it on the first line so the invoice adds up.
    const drift = round2(beforePromo - lines.reduce((n, l) => n + l.amount, 0));
    if (lines.length && drift !== 0) lines[0].amount = round2(lines[0].amount + drift);
  }

  const info = (seller?.sellerInfo ?? {}) as { companyName?: string; taxId?: string; companyRegistrationNumber?: string; businessAddress?: Record<string, string> };
  const addr = info.businessAddress;
  const cancelled = b.status === 'cancelled';
  const refunded = b.paymentStatus === 'refunded';
  const amountPaid = round2(b.paidAmount ?? 0);

  return {
    invoiceNumber: `INV-${b.bookingReference.replace(/^BK-/, '')}`,
    issuedAt: b.bookingDate,
    bookingId: b.id,
    bookingReference: b.bookingReference,
    status: b.status,
    paymentStatus: b.paymentStatus,
    paymentType: b.paymentType,
    paymentMethod: b.paymentMethod,
    transactionId: b.transactionId,
    paidAt: b.paymentDetails?.paidAt ?? null,
    cancelledAt: b.cancelledAt,
    currency,
    tour: { title, code: tour?.code ?? b.tourCode ?? null },
    departureDate: b.departureDate,
    participants: { adults, children, infants },
    billTo: {
      name: b.contactName,
      email: b.contactEmail,
      phone: b.contactPhone,
      country: (b.guestInfo as { country?: string } | null)?.country ?? null,
    },
    seller: seller
      ? {
          name: info.companyName || seller.name,
          email: seller.email,
          phone: seller.phone,
          taxId: info.taxId || null,
          registrationNumber: info.companyRegistrationNumber || null,
          address: addr ? [addr.address, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(', ') || null : null,
        }
      : null,
    lines,
    subtotal: round2(beforePromo),
    promo: pricing.promo ? { code: pricing.promo.code, amount: promoAmount } : null,
    total,
    amountPaid,
    // Nothing is owed on a cancelled booking; the cancellation and refund terms decide what is returned.
    balanceDue: cancelled || refunded ? 0 : round2(Math.max(0, total - amountPaid)),
    depositPercentage: pricing.depositPercentage ?? null,
    amountDueNow: round2(pricing.amountDueNow),
    amountDueLater: round2(pricing.amountDueLater),
  };
}
