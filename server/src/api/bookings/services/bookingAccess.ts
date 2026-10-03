import createHttpError from 'http-errors';
import { and, eq } from 'drizzle-orm';
import { db, tourAuthors } from '../../../db';

export interface BookingViewer {
  id: string;
  isAdmin: boolean;
}

/**
 * Who may see a booking: admins, the traveller who booked it, the seller paid for it, and any author of
 * the tour. Guest bookings have no traveller account, so only the seller side and admins can open those
 * (the guest can still look theirs up by reference plus the contact email; see getBookingByReference).
 */
export async function canViewBooking(b: { userId: string | null; sellerId: string | null; tourId: string }, viewer: BookingViewer | null | undefined): Promise<boolean> {
  if (!viewer) return false;
  if (viewer.isAdmin || b.userId === viewer.id || b.sellerId === viewer.id) return true;
  const [author] = await db.select({ u: tourAuthors.userId }).from(tourAuthors)
    .where(and(eq(tourAuthors.tourId, b.tourId), eq(tourAuthors.userId, viewer.id))).limit(1);
  return !!author;
}

export async function assertCanViewBooking(b: { userId: string | null; sellerId: string | null; tourId: string }, viewer: BookingViewer | null | undefined) {
  if (!(await canViewBooking(b, viewer))) throw createHttpError(403, 'You do not have access to this booking');
}
