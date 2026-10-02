import { db, conversations, conversationParticipants, conversationMessages, users, tours, tourAuthors, businessPartners } from '../../db';
import { eq, and, or, inArray, desc, asc, count, sql } from 'drizzle-orm';
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

/**
 * Populates many conversations with a constant number of queries (users, tours and participants
 * fetched in bulk) instead of three queries per row, and works out who each conversation is
 * "with" from the viewer's point of view — `contactName`.
 */
/**
 * Everything a conversation row needs (people, tour, participants, unread count, last message,
 * membership). `convIds` may be a plain id list OR a sub-select of the page's ids, so list() can run
 * this in the same round trip as the page query itself.
 */
function loadConversationRelations(convIds: string[] | any, requester: RequesterUser) {
  return Promise.all([
    db.select({ ...userSummary, role: users.role }).from(users).where(inArray(users.id, db.select({ id: sql<string>`unnest(array[${conversations.fromUserId}, ${conversations.assignedTo}])` }).from(conversations).where(inArray(conversations.id, convIds)))),
    db.select(tourSummary).from(tours).where(inArray(tours.id, db.select({ id: conversations.tourId }).from(conversations).where(inArray(conversations.id, convIds)))),
    db
      .select({ conversationId: conversationParticipants.conversationId, id: users.id, name: users.name, role: users.role })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(inArray(conversationParticipants.conversationId, convIds)),
    // Messages from anyone else that arrived after this viewer last opened the thread.
    db
      .select({ conversationId: conversationMessages.conversationId, value: count() })
      .from(conversationMessages)
      .leftJoin(conversationParticipants, and(eq(conversationParticipants.conversationId, conversationMessages.conversationId), eq(conversationParticipants.userId, requester.id)))
      .where(and(
        inArray(conversationMessages.conversationId, convIds),
        sql`(${conversationMessages.senderId} IS NULL OR ${conversationMessages.senderId} <> ${requester.id})`,
        sql`(${conversationParticipants.lastReadAt} IS NULL OR ${conversationMessages.createdAt} > ${conversationParticipants.lastReadAt})`,
      ))
      .groupBy(conversationMessages.conversationId),
    db
      .selectDistinctOn([conversationMessages.conversationId], { conversationId: conversationMessages.conversationId, content: conversationMessages.content, createdAt: conversationMessages.createdAt, senderId: conversationMessages.senderId })
      .from(conversationMessages)
      .where(inArray(conversationMessages.conversationId, convIds))
      .orderBy(conversationMessages.conversationId, desc(conversationMessages.createdAt)),
    db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.userId, requester.id), inArray(conversationParticipants.conversationId, convIds))),
  ]);
}

async function populateConversations(
  rows: Array<typeof conversations.$inferSelect>,
  requester: RequesterUser,
  relations?: Awaited<ReturnType<typeof loadConversationRelations>>,
) {
  if (rows.length === 0) return [];
  const [userRows, tourRows, participantRows, unreadRows, lastRows, myMemberships] = relations ?? (await loadConversationRelations(rows.map((r) => r.id), requester));
  const unreadByConv = new Map(unreadRows.map((r) => [r.conversationId, Number(r.value)]));
  const lastByConv = new Map(lastRows.map((r) => [r.conversationId, r]));
  const memberOf = new Set(myMemberships.map((m) => m.conversationId));

  const userById = new Map(userRows.map((u) => [u.id, u]));
  const tourById = new Map(tourRows.map((t) => [t.id, t]));
  const participantsByConv = new Map<string, typeof participantRows>();
  for (const p of participantRows) {
    const list = participantsByConv.get(p.conversationId) ?? [];
    list.push(p);
    participantsByConv.set(p.conversationId, list);
  }

  return rows.map((row) => {
    const fromUser = row.fromUserId ? userById.get(row.fromUserId) : undefined;
    const assignee = row.assignedTo ? userById.get(row.assignedTo) : undefined;
    const others = (participantsByConv.get(row.id) ?? []).filter((p) => p.id !== requester.id);

    // Who this conversation is "with", seen from the viewer: the originator when someone else
    // started it, the other participant when the viewer started it (e.g. an admin's direct
    // message), or the guest's name for a visitor enquiry.
    let contact: { name: string; role?: string } | undefined;
    if (row.fromUserId && row.fromUserId !== requester.id && fromUser) {
      // An admin looking at another admin's direct message cares about who it was SENT TO.
      const recipient = isAdmin(requester) && fromUser.role === 'admin'
        ? (participantsByConv.get(row.id) ?? []).find((p) => p.id !== fromUser.id && p.role !== 'admin')
        : undefined;
      contact = recipient ? { name: recipient.name, role: recipient.role } : { name: fromUser.name, role: fromUser.role };
    }
    else if (row.fromUserId === requester.id) {
      const other = others[0] ?? (assignee && assignee.id !== requester.id ? assignee : undefined);
      if (other) contact = { name: other.name, role: other.role };
    } else if (row.guestName || row.guestEmail) contact = { name: row.guestName ?? row.guestEmail ?? '', role: 'guest' };

    return {
      id: row.id,
      type: row.type,
      subject: row.subject,
      status: row.status,
      fromUserId: fromUser ? { id: fromUser.id, name: fromUser.name, email: fromUser.email } : undefined,
      guestName: row.guestName ?? undefined,
      guestEmail: row.guestEmail ?? undefined,
      tourId: row.tourId ? tourById.get(row.tourId) : undefined,
      assignedTo: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : undefined,
      // Broadcasts and groups have no single counterpart — they show their own title.
      contactName: row.isBroadcast || row.type === 'group' || row.type === 'broadcast' ? undefined : contact?.name,
      contactRole: row.isBroadcast || row.type === 'group' || row.type === 'broadcast' ? undefined : contact?.role,
      isBroadcast: row.isBroadcast,
      broadcastAudience: row.broadcastAudience ?? undefined,
      allowParticipantReplies: row.allowParticipantReplies,
      groupName: row.groupName ?? undefined,
      // An admin can see threads they're not part of; only count unread for ones they are in.
      unreadCount: memberOf.has(row.id) || row.fromUserId === requester.id ? unreadByConv.get(row.id) ?? 0 : 0,
      lastMessage: lastByConv.get(row.id)?.content,
      lastMessageAt: lastByConv.get(row.id)?.createdAt ?? row.updatedAt,
      lastMessageFromMe: lastByConv.get(row.id)?.senderId === requester.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
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
  /**
   * Who the requester is talking to, for the "profile card" in the chat header: the other
   * user(s) in the conversation (originator + participants, minus the requester) with their
   * contact details, or the guest's name/email. Access follows the conversation itself.
   */
  async people(conversationId: string, requester: RequesterUser) {
    // Round trip 1 (all together): the conversation, its participants, and whether the requester
    // is one of them (for the access check). This used to be 4-5 queries one after another.
    const [[row], participantRows, [membership]] = await Promise.all([
      db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1),
      db.select({ userId: conversationParticipants.userId }).from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId)).limit(25),
      db.select({ id: conversationParticipants.id }).from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, requester.id))).limit(1),
    ]);
    if (!row) throw createHttpError(404, 'Conversation not found');
    if (!isAdmin(requester) && row.fromUserId !== requester.id && !membership) throw createHttpError(403, 'You do not have access to this conversation');

    if (row.isBroadcast) {
      const [{ value }] = await db.select({ value: count() }).from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
      return { isBroadcast: true, recipientCount: value, people: [], others: [], guest: null };
    }

    // Who is the requester talking TO (primary) vs who else is in the thread (others) — decided
    // below once roles are known (an admin viewing another admin's direct message should see the recipient).
    const participantIds = participantRows.map((p) => p.userId).filter((id) => id !== requester.id);
    const ids = [...new Set([row.fromUserId, row.assignedTo, ...participantIds].filter((id): id is string => !!id && id !== requester.id))];

    // Round trip 2 (together): the people and the businesses they own.
    const [userRows, businesses] = ids.length
      ? await Promise.all([
          db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, avatar: users.avatar, role: users.role, verified: users.verified, sellerInfo: users.sellerInfo, createdAt: users.createdAt }).from(users).where(inArray(users.id, ids)),
          db.select({ ownerId: businessPartners.ownerId, name: businessPartners.name, type: businessPartners.type }).from(businessPartners).where(inArray(businessPartners.ownerId, ids)),
        ])
      : [[], []];

    const people = userRows.map((u) => {
      const info = (u.sellerInfo ?? {}) as { companyName?: string; website?: string; businessAddress?: { city?: string; country?: string } };
      const owned = businesses.filter((b) => b.ownerId === u.id);
      return {
        id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, avatar: u.avatar ?? null, role: u.role, verified: u.verified,
        company: info.companyName ?? owned[0]?.name ?? null,
        businesses: owned.map((b) => ({ name: b.name, type: b.type })),
        website: info.website ?? null,
        location: [info.businessAddress?.city, info.businessAddress?.country].filter(Boolean).join(', ') || null,
        memberSince: u.createdAt,
      };
    });

    const guest = !row.fromUserId && (row.guestName || row.guestEmail) ? { name: row.guestName ?? null, email: row.guestEmail ?? null } : null;
    const byId = new Map(people.map((p) => [p.id, p]));
    const participants = participantIds.map((id) => byId.get(id)).filter((p): p is (typeof people)[number] => !!p);
    const originator = row.fromUserId && row.fromUserId !== requester.id ? byId.get(row.fromUserId) : undefined;
    const assignee = row.assignedTo && row.assignedTo !== requester.id ? byId.get(row.assignedTo) : undefined;

    let primary: typeof people = [];
    if (row.fromUserId === requester.id) {
      primary = participants.length ? participants : assignee ? [assignee] : [];
    } else if (originator) {
      const recipients = isAdmin(requester) && originator.role === 'admin' ? participants.filter((p) => p.id !== originator.id && p.role !== 'admin') : [];
      primary = recipients.length ? recipients : [originator];
    }
    const primaryIds = new Set(primary.map((p) => p.id));
    const others = [originator, assignee, ...participants].filter((p): p is (typeof people)[number] => !!p && !primaryIds.has(p.id)).filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);

    return { isBroadcast: false, recipientCount: null, people: primary, others, guest };
  },

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

    // One thread per admin <-> person: if a direct chat with this person already exists, continue it
    // instead of starting a new conversation every time (that produced a pile of identical
    // "Direct message from admin" entries for the same contact).
    // Matched by participant, not assignedTo: older/seeded threads set assignedTo to the admin.
    const [existing] = await db
      .select({ conv: conversations })
      .from(conversations)
      .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
      .where(and(eq(conversations.type, 'direct'), eq(conversations.fromUserId, admin.id), eq(conversationParticipants.userId, input.targetUserId)))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(1)
      .then((r) => r.map((x) => x.conv));
    if (existing) {
      await ConversationService.sendMessage(existing.id, admin, input.message);
      const [refreshed] = await db.select().from(conversations).where(eq(conversations.id, existing.id)).limit(1);
      return populateConversation(refreshed ?? existing);
    }

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

    // The page's ids as a sub-select, so its relations load in the same round trip as the page.
    const pageIds = db.select({ id: conversations.id }).from(conversations).where(where).orderBy(desc(conversations.lastMessageAt)).limit(limit).offset(skip);
    const [rows, [{ value: totalItems }], relations] = await Promise.all([
      db.select().from(conversations).where(where).orderBy(desc(conversations.lastMessageAt)).limit(limit).offset(skip),
      db.select({ value: count() }).from(conversations).where(where),
      loadConversationRelations(pageIds, requester),
    ]);

    const items = await populateConversations(rows, requester, relations);
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
    // Replying means the sender has seen the thread up to now.
    await ConversationService.markRead(conversationId, requester);
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

  /** Marks everything in the thread as seen by the requester (the WhatsApp "opened the chat" moment). */
  async markRead(conversationId: string, requester: RequesterUser) {
    await assertAccess(conversationId, requester);
    await db
      .insert(conversationParticipants)
      .values({ conversationId, userId: requester.id, lastReadAt: new Date() })
      .onConflictDoUpdate({
        target: [conversationParticipants.conversationId, conversationParticipants.userId],
        set: { lastReadAt: new Date() },
      });
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
