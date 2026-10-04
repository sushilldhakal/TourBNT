import { Response } from 'express';
import { db, notifications, users } from '../../db';
import { eq, and, desc, count } from 'drizzle-orm';
import { Request } from '../../middlewares/authenticate';
import { HTTP_STATUS, sendSuccess } from '../../utils/apiResponse';

// Get notifications for authenticated user
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required', timestamp: new Date().toISOString(), path: req.path }
      });
    }

    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const pageLimit = typeof limit === 'number' ? limit : 10;
    const { unreadOnly } = req.query;

    const where = unreadOnly === 'true'
      ? and(eq(notifications.recipientId, userId), eq(notifications.isRead, false))
      : eq(notifications.recipientId, userId);

    const [rows, [{ value: total }], [{ value: unreadCount }]] = await Promise.all([
      db
        .select({ notification: notifications, sender: { id: users.id, name: users.name, email: users.email } })
        .from(notifications)
        .leftJoin(users, eq(notifications.senderId, users.id))
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(pageLimit)
        .offset(skip),
      db.select({ value: count() }).from(notifications).where(where),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false))),
    ]);

    const items = rows.map(({ notification, sender }) => ({ ...notification, sender }));

    // sendPaginatedResponse doesn't carry a message/extra-fields slot, and
    // unreadCount needs to reach the client (for the header bell's badge)
    // rather than just being computed and discarded — build the envelope
    // directly instead.
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      items,
      pagination: {
        page,
        limit: pageLimit,
        totalItems: total,
        totalPages: Math.ceil(total / pageLimit),
      },
      unreadCount,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'FETCH_NOTIFICATIONS_ERROR',
        message: 'Error fetching notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required', timestamp: new Date().toISOString(), path: req.path }
      });
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.recipientId, userId)))
      .returning();

    if (!updated) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found', timestamp: new Date().toISOString(), path: req.path }
      });
    }

    return sendSuccess(res, updated, 'Notification marked as read');
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'MARK_READ_ERROR',
        message: 'Error marking notification as read',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};

// Delete notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required', timestamp: new Date().toISOString(), path: req.path }
      });
    }

    const [deleted] = await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.recipientId, userId)))
      .returning();

    if (!deleted) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found', timestamp: new Date().toISOString(), path: req.path }
      });
    }

    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'DELETE_NOTIFICATION_ERROR',
        message: 'Error deleting notification',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
};

// Helpers used by other modules (destination approval/rejection flows) to
// create notifications directly, without going through an HTTP route.
export const createDestinationRejectionNotification = async (
  recipientId: string,
  senderId: string,
  destinationName: string,
  destinationId: string,
  rejectionReason: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    senderId,
    type: 'destination_rejected',
    title: 'Destination Submission Rejected',
    message: `Your destination "${destinationName}" has been rejected. Reason: ${rejectionReason}`,
    data: { destinationId, destinationName, rejectionReason },
  }).returning();
  return notification;
};

export const createDestinationApprovalNotification = async (
  recipientId: string,
  senderId: string,
  destinationName: string,
  destinationId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    senderId,
    type: 'destination_approved',
    title: 'Destination Approved',
    message: `Congratulations! Your destination "${destinationName}" has been approved and is now available for tours.`,
    data: { destinationId, destinationName },
  }).returning();
  return notification;
};

// Helpers for the business-partner onboarding flow (guides, hotels,
// guesthouses, restaurants, transport providers, advertisers).
export const createBusinessPartnerApprovalNotification = async (
  recipientId: string,
  senderId: string,
  businessName: string,
  businessPartnerId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    senderId,
    type: 'business_partner_approved',
    title: 'Business Application Approved',
    message: `Congratulations! Your business "${businessName}" has been approved and is now live on the platform.`,
    data: { businessPartnerId, businessName },
  }).returning();
  return notification;
};

export const createBusinessPartnerRejectionNotification = async (
  recipientId: string,
  senderId: string,
  businessName: string,
  businessPartnerId: string,
  rejectionReason: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    senderId,
    type: 'business_partner_rejected',
    title: 'Business Application Rejected',
    message: `Your business application "${businessName}" has been rejected. Reason: ${rejectionReason}`,
    data: { businessPartnerId, businessName, rejectionReason },
  }).returning();
  return notification;
};

export const createBusinessReviewNotification = async (
  recipientId: string,
  senderId: string,
  businessName: string,
  businessPartnerId: string,
  rating: number
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    senderId,
    type: 'business_review_received',
    title: 'New Review Received',
    message: `Your business "${businessName}" received a new ${rating}-star review.`,
    data: { businessPartnerId, businessName, rating },
  }).returning();
  return notification;
};

export const createAdApprovalNotification = async (
  recipientId: string,
  senderId: string,
  adTitle: string,
  adId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    senderId,
    type: 'ad_approved',
    title: 'Ad Campaign Approved',
    message: `Your ad campaign "${adTitle}" has been approved and can now go live.`,
    data: { adId, adTitle },
  }).returning();
  return notification;
};

export const createAdRejectionNotification = async (
  recipientId: string,
  senderId: string,
  adTitle: string,
  adId: string,
  rejectionReason: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    senderId,
    type: 'ad_rejected',
    title: 'Ad Campaign Rejected',
    message: `Your ad campaign "${adTitle}" has been rejected. Reason: ${rejectionReason}`,
    data: { adId, adTitle, rejectionReason },
  }).returning();
  return notification;
};

// System-generated — no human sender (created by tourService/bookingService
// when a tour's fixed departures or a flexible-date booking need a partner
// to confirm capacity for a real service date).
export const createItineraryRequestCreatedNotification = async (
  recipientId: string,
  tourTitle: string,
  serviceDate: string,
  requestId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    type: 'itinerary_request_created',
    title: 'Availability requested',
    message: `"${tourTitle}" needs you to confirm capacity for ${serviceDate}.`,
    data: { requestId, tourTitle, serviceDate },
  }).returning();
  return notification;
};

export const createItineraryRequestConfirmedNotification = async (
  recipientId: string,
  partnerName: string,
  serviceDate: string,
  requestId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    type: 'itinerary_request_confirmed',
    title: 'Availability confirmed',
    message: `${partnerName} confirmed capacity for ${serviceDate}.`,
    data: { requestId, partnerName, serviceDate },
  }).returning();
  return notification;
};

export const createItineraryRequestDeclinedNotification = async (
  recipientId: string,
  partnerName: string,
  serviceDate: string,
  requestId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    type: 'itinerary_request_declined',
    title: 'Availability declined',
    message: `${partnerName} could not confirm capacity for ${serviceDate}. Check the tour's logistics status.`,
    data: { requestId, partnerName, serviceDate },
  }).returning();
  return notification;
};

// Neutral wording (tour title, not "partner did X") since this fires in
// both directions: partner holding a request (recipient = agency) and
// agency accepting a partner's counter-offer (recipient = partner).
export const createItineraryRequestHeldNotification = async (
  recipientId: string,
  tourTitle: string,
  serviceDate: string,
  requestId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    type: 'itinerary_request_held',
    title: 'Capacity held',
    message: `Capacity is tentatively held for "${tourTitle}" on ${serviceDate}, pending final confirmation.`,
    data: { requestId, tourTitle, serviceDate },
  }).returning();
  return notification;
};

export const createItineraryRequestCounteredNotification = async (
  recipientId: string,
  tourTitle: string,
  serviceDate: string,
  requestId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    type: 'itinerary_request_countered',
    title: 'Alternative offered',
    message: `A different date, time, or quantity was proposed for "${tourTitle}" on ${serviceDate}. Review and respond.`,
    data: { requestId, tourTitle, serviceDate },
  }).returning();
  return notification;
};

// System-generated — the expiry sweep, not a person, caused this transition.
export const createItineraryRequestExpiredNotification = async (
  recipientId: string,
  tourTitle: string,
  serviceDate: string,
  requestId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    type: 'itinerary_request_expired',
    title: 'Request expired',
    message: `The request for "${tourTitle}" on ${serviceDate} went unanswered and expired. Send a new request or pick another supplier.`,
    data: { requestId, tourTitle, serviceDate },
  }).returning();
  return notification;
};

export const createItineraryRequestReplacedNotification = async (
  recipientId: string,
  tourTitle: string,
  serviceDate: string,
  requestId: string
) => {
  const [notification] = await db.insert(notifications).values({
    recipientId,
    type: 'itinerary_request_replaced',
    title: 'Replaced by agency',
    message: `You were replaced by another supplier for "${tourTitle}" on ${serviceDate}.`,
    data: { requestId, tourTitle, serviceDate },
  }).returning();
  return notification;
};
