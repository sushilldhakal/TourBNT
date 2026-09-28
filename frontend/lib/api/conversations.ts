import { api, handleApiError, extractResponseData } from './apiClient';

export interface Conversation {
  id: string;
  fromUserId?: { id: string; name?: string; email?: string };
  guestName?: string;
  guestEmail?: string;
  type: 'contact' | 'enquiry' | 'broadcast' | 'direct' | 'group';
  tourId?: {
    id: string;
    title?: string;
    code?: string;
    slug?: string;
    coverImage?: string;
    images?: string[];
  };
  subject: string;
  status: 'open' | 'replied' | 'closed';
  assignedTo?: { id: string; name?: string; email?: string };
  isBroadcast?: boolean;
  broadcastAudience?: 'sellers' | 'users' | 'all';
  allowParticipantReplies?: boolean;
  groupName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id?: string;
  conversationId: string;
  senderId?: { id: string; name?: string; email?: string };
  role: 'customer' | 'support';
  content: string;
  createdAt: string;
}

export interface CreateConversationPayload {
  type: 'contact' | 'enquiry';
  subject: string;
  message: string;
  guestName?: string;
  guestEmail?: string;
  tourId?: string;
}

/**
 * Create a conversation (contact form or tour enquiry). Works with or without auth.
 */
export async function createConversation(payload: CreateConversationPayload): Promise<Conversation> {
  try {
    const response = await api.post('/conversations', payload);
    const data = extractResponseData(response) as Conversation | Conversation[] | { data?: Conversation };
    if (Array.isArray(data)) return data[0];
    const single = (data as { data?: Conversation }).data ?? data;
    return single as Conversation;
  } catch (error) {
    throw handleApiError(error, 'sending message');
  }
}

export interface CreateBroadcastPayload {
  subject: string;
  message: string;
  broadcastAudience: 'sellers' | 'users' | 'all';
  allowParticipantReplies?: boolean;
  groupName?: string;
}

/**
 * Create an admin broadcast / group conversation.
 * Only admins can call this; the server enforces role checks.
 */
export async function createBroadcastConversation(
  payload: CreateBroadcastPayload
): Promise<Conversation> {
  try {
    const response = await api.post('/conversations/broadcast', payload);
    const data = extractResponseData(response) as Conversation | { data?: Conversation };
    const single = (data as { data?: Conversation }).data ?? data;
    return single as Conversation;
  } catch (error) {
    throw handleApiError(error, 'creating broadcast message');
  }
}

export interface CreateDirectConversationPayload {
  targetUserId: string;
  subject: string;
  message: string;
}

/**
 * Create a direct 1:1 conversation from admin to a specific user.
 */
export async function createDirectConversation(
  payload: CreateDirectConversationPayload
): Promise<Conversation> {
  try {
    const response = await api.post('/conversations/direct', payload);
    const data = extractResponseData(response) as Conversation | { data?: Conversation };
    const single = (data as { data?: Conversation }).data ?? data;
    return single as Conversation;
  } catch (error) {
    throw handleApiError(error, 'creating direct conversation');
  }
}

export interface CreateGroupConversationPayload {
  subject: string;
  message: string;
  participantIds: string[];
  groupName?: string;
}

/**
 * Create a group conversation from admin to a hand-picked list of specific
 * people (as opposed to createBroadcastConversation's role-based audience).
 * Only admins can call this; the server enforces role checks.
 */
export async function createGroupConversation(
  payload: CreateGroupConversationPayload
): Promise<Conversation> {
  try {
    const response = await api.post('/conversations/group', payload);
    const data = extractResponseData(response) as Conversation | { data?: Conversation };
    const single = (data as { data?: Conversation }).data ?? data;
    return single as Conversation;
  } catch (error) {
    throw handleApiError(error, 'creating group conversation');
  }
}

/**
 * Admin-only: add one or more additional people to an existing conversation.
 * Nobody but admin can ever add a participant — sellers/end users have no
 * equivalent call.
 */
export async function addConversationParticipants(
  id: string,
  userIds: string[]
): Promise<Conversation> {
  try {
    const response = await api.post(`/conversations/${id}/participants`, { userIds });
    const data = extractResponseData(response) as Conversation | { data?: Conversation };
    const single = (data as { data?: Conversation }).data ?? data;
    return single as Conversation;
  } catch (error) {
    throw handleApiError(error, 'adding participants');
  }
}

/**
 * Archive a conversation for the current user.
 */
export async function archiveConversation(id: string): Promise<void> {
  try {
    await api.patch(`/conversations/${id}/archive`);
  } catch (error) {
    throw handleApiError(error, 'archiving conversation');
  }
}

/**
 * Soft-delete a conversation (move to trash / hide for current user).
 * Currently implemented as an admin-only hard delete on the server.
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    await api.delete(`/conversations/${id}`);
  } catch (error) {
    throw handleApiError(error, 'deleting conversation');
  }
}

/**
 * List conversations for dashboard (auth required).
 */
export async function getConversations(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ items: Conversation[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }> {
  try {
    const response = await api.get('/conversations', { params });
    const raw = extractResponseData(response) as { data?: Conversation[]; items?: Conversation[]; pagination?: { page: number; limit: number; totalItems: number; totalPages: number } };
    // Server sendPaginatedResponse returns { data: [...], pagination } not { items, pagination }
    const items: Conversation[] = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? (raw as Conversation[]) : []);
    const pagination = raw?.pagination ?? { page: 1, limit: 20, totalItems: 0, totalPages: 0 };
    return { items, pagination };
  } catch (error) {
    throw handleApiError(error, 'fetching conversations');
  }
}

/**
 * Get one conversation by id (auth required).
 */
export async function getConversation(id: string): Promise<Conversation> {
  try {
    const response = await api.get(`/conversations/${id}`);
    return extractResponseData(response);
  } catch (error) {
    throw handleApiError(error, 'fetching conversation');
  }
}

/**
 * Get messages for a conversation (auth required).
 * Server now returns { messages, hasMore, nextCursor, page, limit } – extract messages.
 */
export async function getConversationMessages(id: string): Promise<ConversationMessage[]> {
  try {
    const response = await api.get(`/conversations/${id}/messages`);
    const raw = extractResponseData(response) as
      | ConversationMessage[]
      | { messages?: ConversationMessage[] }
      | { data?: { messages?: ConversationMessage[] } };

    let list: ConversationMessage[] | undefined;

    if (Array.isArray(raw)) {
      list = raw;
    } else if ((raw as any)?.messages) {
      list = (raw as any).messages;
    } else if ((raw as any)?.data?.messages) {
      list = (raw as any).data.messages;
    }

    return Array.isArray(list) ? list : [];
  } catch (error) {
    throw handleApiError(error, 'fetching messages');
  }
}

/**
 * Send a reply to a conversation (auth required, admin/seller).
 * Server returns { success, message, data: [ messages ] } – extract the data array.
 */
export async function sendConversationMessage(id: string, content: string): Promise<ConversationMessage[]> {
  try {
    const response = await api.post(`/conversations/${id}/messages`, { content });
    const raw = extractResponseData(response) as ConversationMessage[] | { data?: ConversationMessage[] };
    const list = Array.isArray(raw) ? raw : raw?.data;
    return Array.isArray(list) ? list : [];
  } catch (error) {
    throw handleApiError(error, 'sending reply');
  }
}
