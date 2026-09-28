import { api, handleApiError, extractResponseData } from './apiClient';

export interface Notification {
  id: string;
  recipientId: string;
  sender?: { id: string; name?: string; email?: string } | null;
  type:
    | 'destination_rejected'
    | 'destination_approved'
    | 'destination_deleted'
    | 'general'
    | 'business_partner_approved'
    | 'business_partner_rejected'
    | 'business_review_received'
    | 'ad_approved'
    | 'ad_rejected';
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsResult {
  items: Notification[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number };
  unreadCount: number;
}

/**
 * List notifications for the current user (auth required).
 * Server response shape is { success, items, pagination, unreadCount } —
 * not the usual { data } envelope, since this endpoint bypasses
 * sendPaginatedResponse to actually surface unreadCount to the client.
 */
export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<GetNotificationsResult> {
  try {
    const response = await api.get('/notifications', { params });
    const raw = response.data as {
      items?: Notification[];
      pagination?: GetNotificationsResult['pagination'];
      unreadCount?: number;
    };
    return {
      items: Array.isArray(raw?.items) ? raw.items : [],
      pagination: raw?.pagination ?? { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
      unreadCount: raw?.unreadCount ?? 0,
    };
  } catch (error) {
    throw handleApiError(error, 'fetching notifications');
  }
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  try {
    const response = await api.patch(`/notifications/${id}/read`);
    return extractResponseData<Notification>(response);
  } catch (error) {
    throw handleApiError(error, 'marking notification as read');
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await api.delete(`/notifications/${id}`);
  } catch (error) {
    throw handleApiError(error, 'deleting notification');
  }
}
