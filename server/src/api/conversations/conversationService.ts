import { db, conversations, conversationParticipants, conversationMessages, users, tours, tourAuthors } from '@tourbnt/db';
import { eq, and, or, inArray, desc, asc, count } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { USER_ROLES, type UserRole } from '../../utils/roles';

/** Every role except the two that are never on the internal/support side of a conversation. */
const INTERNAL_ROLES: UserRole[] = USER_ROLES.filter((r) => r !== 'user' && r !== 'subscriber');

const userSummary = { id: users.id, name: users.name, email: users.email };
const tourSummary = { id: tours.id, title: tours.title, code: tours.code, coverImage: tours.coverImage };

export interface RequesterUser {
  id: string;
  roles: string[];
}

const isAdmin = (requester: RequesterUser) => requester.roles.includes('admin');

/** Resolves the audience for a broadcast into concrete user ids (never the sender). */
async function resolveBroadcastAudience(audience: 'sellers' | 'users' | 'all', excludeUserId: string): Promise<string[]> {
  const roleFilter =
    audience === 'sellers' ? inArray(users.role, INTERNAL_ROLES) :
    audience === 'users' ? eq(users.role, 'user') :
    inArray(users.role, [...INTERNAL_ROLES, 'user']);

  const rows = await db.select({ id: users.id }).from(users).where(roleFilter);
  return rows.map((r) => r.id).filter((id) => id !== excludeUserId);
}

async function addParticipants(conversationId: string, userIds: string[]) {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return;
  await db
    .insert(conversationParticipants)
    .values(unique.map((userId) => ({ conversationId, userId })))
    .onConflictDoNothing();
}

/** Confirms every id is a real user; throws 400 naming the bad ones rather than letting a bare FK error through. */
async function validateUserIds(userIds: string[]): Promise<string[]> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) throw createHttpError(400, 'At least one participant is required');

  const found = await db.select({ id: users.id }).from(users).where(inArray(users.id, unique));
  const foundIds = new Set(found.map((u) => u.id));
  const missing = unique.filter((id) => !foundIds.has(id));
  if (missing.length) throw createHttpError(400, `Unknown user id(s): ${missing.join(', ')}`);

  return unique;
}

async function populateConversation(row: typeof conversations.$inferSelect) {
  const [fromUser, tour, assignee] = await Promise.all([
    row.fromUserId ? db.select(userSummary).from(users).where(eq(users.id, row.fromUserId)).then((r) => r[0]) : undefined,
    row.tourId ? db.select(tourSummary).from(tours).where(eq(tours.id, row.tourId)).then((r) => r[0]) : undefined,
    row.assignedTo ? db.select(userSummary).from(users).where(eq(users.id, row.assignedTo)).then((r) => r[0]) : undefined,
  ]);

  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    status: row.status,
    fromUserId: fromUser,
    guestName: row.guestName ?? undefined,
    guestEmail: row.guestEmail ?? undefined,
    tourId: tour,
    assignedTo: assignee,
    isBroadcast: row.isBroadcast,
    broadcastAudience: row.broadcastAudience ?? undefined,
    allowParticipantReplies: row.allowParticipantReplies,
    groupName: row.groupName ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** A requester may act on a conversation if they're an admin, its originator, or a listed participant. */
async function assertAccess(conversationId: string, requester: RequesterUser) {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!row) throw createHttpError(404, 'Conversation not found');
  if (isAdmin(requester) || row.fromUserId === requester.id) return row;

  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, requester.id)))
    .limit(1);
  if (!participant) throw createHttpError(403, 'You do not have access to this conversation');
  return row;
}

export const ConversationService = {
  /** Contact-form or tour-enquiry submission. Works for a logged-in user or a guest. */
  async create(input: {
    type: 'contact' | 'enquiry';
    subject: string;
    message: string;
    tourId?: string;
    guestName?: string;
    guestEmail?: string;
    fromUserId?: string;
  }) {
    let assignedTo: string | undefined;
    let participantIds: string[] = [];

    if (input.type === 'enquiry') {
      if (!input.tourId) throw createHttpError(400, 'tourId is required for a tour enquiry');
      const authors = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(eq(tourAuthors.tourId, input.tourId));
      participantIds = authors.map((a) => a.userId);
      assignedTo = participantIds[0]; // primary seller shown in the UI; every author still gets the thread
    }
    // type === 'contact': no participants yet — admin sees it via the
    // admin-sees-everything rule below and assigns a seller if needed.

    const [row] = await db
      .insert(conversations)
      .values({
        type: input.type,
        subject: input.subject,
        tourId: input.type === 'enquiry' ? input.tourId : undefined,
        fromUserId: input.fromUserId,
        guestName: input.fromUserId ? undefined : input.guestName,
        guestEmail: input.fromUserId ? undefined : input.guestEmail,
        assignedTo,
      })
      .returning();

    if (participantIds.length) await addParticipants(row.id, participantIds);

    await db.insert(conversationMessages).values({
      conversationId: row.id,
      senderId: input.fromUserId,
      role: 'customer',
      content: input.message,
    });

    return populateConversation(row);
  },

  /** Admin -> many recipients, one shared thread. */
  async createBroadcast(admin: RequesterUser, input: {
    subject: string;
    message: string;
    broadcastAudience: 'sellers' | 'users' | 'all';
    allowParticipantReplies?: boolean;
    groupName?: string;
  }) {
    const recipientIds = await resolveBroadcastAudience(input.broadcastAudience, admin.id);

    const [row] = await db
      .insert(conversations)
      .values({
        type: 'broadcast',
        subject: input.subject,
        fromUserId: admin.id,
        assignedTo: admin.id,
        isBroadcast: true,
        broadcastAudience: input.broadcastAudience,
        allowParticipantReplies: input.allowParticipantReplies ?? true,
        groupName: input.groupName,
      })
      .returning();

    await addParticipants(row.id, [admin.id, ...recipientIds]);

    await db.insert(conversationMessages).values({
      conversationId: row.id,
      senderId: admin.id,
      role: 'customer',
      content: input.message,
    });

    return populateConversation(row);
  },

  /** Admin -> one specific user, 1:1. */
  async createDirect(admin: RequesterUser, input: { targetUserId: string; subject: string; message: string }) {
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.targetUserId)).limit(1);
    if (!target) throw createHttpError(404, 'Target user not found');

    const [row] = await db
      .insert(conversations)
      .values({
        type: 'direct',
        subject: input.subject,
        fromUserId: admin.id,
        assignedTo: input.targetUserId,
      })
      .returning();

    await addParticipants(row.id, [admin.id, input.targetUserId]);

    await db.insert(conversationMessages).values({
      conversationId: row.id,
      senderId: admin.id,
      role: 'customer',
      content: input.message,
    });

    return populateConversation(row);
  },

  /**
   * Admin -> a hand-picked list of specific people, one shared thread.
   * Unlike createBroadcast (role-based audience), the admin names exact
   * individuals here — internal staff, or a mix of staff and an external
   * customer (e.g. looping a hotel partner into an existing traveler
   * enquiry's group). Only admin can ever call this or addParticipants
   * below — nobody else has a route to add a member to a conversation.
   */
  async createGroup(admin: RequesterUser, input: { subject: string; message: string; participantIds: string[]; groupName?: string }) {
    const participantIds = await validateUserIds(input.participantIds.filter((id) => id !== admin.id));

    const [row] = await db
      .insert(conversations)
      .values({
        type: 'group',
        subject: input.subject,
        fromUserId: admin.id,
        assignedTo: admin.id,
        groupName: input.groupName,
        allowParticipantReplies: true,
      })
      .returning();

    await addParticipants(row.id, [admin.id, ...participantIds]);

    await db.insert(conversationMessages).values({
      conversationId: row.id,
      senderId: admin.id,
      role: 'customer',
      content: input.message,
    });

    return populateConversation(row);
  },

  async list(requester: RequesterUser, params: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const accessCondition = isAdmin(requester)
      ? undefined
      : or(
          eq(conversations.fromUserId, requester.id),
          inArray(
            conversations.id,
            db.select({ id: conversationParticipants.conversationId }).from(conversationParticipants).where(eq(conversationParticipants.userId, requester.id))
          )
        );

    const statusCondition = status && ['open', 'replied', 'closed'].includes(status) ? eq(conversations.status, status as 'open' | 'replied' | 'closed') : undefined;
    const where = accessCondition && statusCondition ? and(accessCondition, statusCondition) : accessCondition ?? statusCondition;

    const [rows, [{ value: totalItems }]] = await Promise.all([
      db.select().from(conversations).where(where).orderBy(desc(conversations.lastMessageAt)).limit(limit).offset(skip),
      db.select({ value: count() }).from(conversations).where(where),
    ]);

    const items = await Promise.all(rows.map(populateConversation));
    return { items, page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) };
  },

  async getById(conversationId: string, requester: RequesterUser) {
    const row = await assertAccess(conversationId, requester);
    return populateConversation(row);
  },

  async getMessages(conversationId: string, requester: RequesterUser) {
    await assertAccess(conversationId, requester);
    const rows = await db
      .select({
        id: conversationMessages.id,
        conversationId: conversationMessages.conversationId,
        role: conversationMessages.role,
        content: conversationMessages.content,
        createdAt: conversationMessages.createdAt,
        senderId: userSummary,
      })
      .from(conversationMessages)
      .leftJoin(users, eq(conversationMessages.senderId, users.id))
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(asc(conversationMessages.createdAt))
      .limit(200);

    const messages = rows.map((r) => ({ ...r, senderId: r.senderId?.id ? r.senderId : undefined }));
    return { messages, hasMore: false, nextCursor: null, page: 1, limit: 200 };
  },

  /** Reply into a thread. Allowed for the conversation's own originator, admin, or a listed participant. */
  async sendMessage(conversationId: string, requester: RequesterUser, content: string) {
    const conversation = await assertAccess(conversationId, requester);

    if (conversation.isBroadcast && !conversation.allowParticipantReplies && conversation.fromUserId !== requester.id && !isAdmin(requester)) {
      throw createHttpError(403, 'Replies are disabled for this announcement');
    }

    // The thread's own originator is always 'customer' — the enquiring/
    // contacting end user for enquiry/contact, or the admin themself for
    // broadcast/direct/group (there's no external customer there, so the
    // admin's own messages stay the primary/outgoing bubble). Everyone
    // else replying is 'support'.
    const role = conversation.fromUserId === requester.id ? 'customer' : 'support';

    await db.insert(conversationMessages).values({ conversationId, senderId: requester.id, role, content });
    await db
      .update(conversations)
      .set({ status: role === 'support' ? 'replied' : 'open', lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return ConversationService.getMessages(conversationId, requester).then((r) => r.messages);
  },

  /** Admin reassigns a conversation to a specific internal user (seller/hotel/etc.), adding them as a participant. */
  async assign(conversationId: string, userId: string) {
    const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw createHttpError(404, 'User not found');

    const [row] = await db.update(conversations).set({ assignedTo: userId, updatedAt: new Date() }).where(eq(conversations.id, conversationId)).returning();
    if (!row) throw createHttpError(404, 'Conversation not found');

    await addParticipants(conversationId, [userId]);
    return populateConversation(row);
  },

  /** Admin loops one or more additional people into an existing conversation, without changing who's primarily assigned. */
  async addParticipantsToConversation(conversationId: string, userIds: string[]) {
    const [row] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (!row) throw createHttpError(404, 'Conversation not found');

    const validIds = await validateUserIds(userIds);
    await addParticipants(conversationId, validIds);
    return populateConversation(row);
  },

  async archive(conversationId: string, requester: RequesterUser) {
    await assertAccess(conversationId, requester);
    await db
      .insert(conversationParticipants)
      .values({ conversationId, userId: requester.id, isArchived: true })
      .onConflictDoUpdate({
        target: [conversationParticipants.conversationId, conversationParticipants.userId],
        set: { isArchived: true },
      });
  },

  async remove(conversationId: string) {
    const [row] = await db.delete(conversations).where(eq(conversations.id, conversationId)).returning({ id: conversations.id });
    if (!row) throw createHttpError(404, 'Conversation not found');
  },
};
