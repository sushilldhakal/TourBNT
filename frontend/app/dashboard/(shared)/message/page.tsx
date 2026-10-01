'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { EnhancedChatInterface, type Contact, type Message } from '@/components/chat/EnhancedChatInterface';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import {
    getConversations,
    getConversationMessages,
    markConversationRead,
    sendConversationMessage,
    type Conversation,
    type ConversationMessage,
} from '@/lib/api/conversations';

function conversationToContact(c: Conversation, currentUserId: string | null): Contact {
    const id = (c as { id?: string }).id ?? (c as { _id?: string })._id ?? '';
    const name =
        c.groupName ||
        c.contactName ||
        c.guestName ||
        // The starter's name is only meaningful when someone else started it; never label a
        // conversation you started (e.g. an admin's direct message) with your own name.
        (c.fromUserId && typeof c.fromUserId === 'object' && 'name' in c.fromUserId &&
            String((c.fromUserId as { id?: string }).id ?? '') !== String(currentUserId ?? '')
            ? (c.fromUserId as { name?: string }).name
            : undefined) ||
        c.subject ||
        'Unknown';
    return {
        id,
        name,
        lastMessage: c.lastMessage ? `${c.lastMessageFromMe ? 'You: ' : ''}${c.lastMessage}` : c.subject || 'No messages yet',
        lastActive: new Date(c.lastMessageAt ?? c.updatedAt),
        unread: c.unreadCount ?? 0,
        isBroadcast: c.isBroadcast,
        groupName: c.groupName,
        // For now we just pass through isArchived so the Archive filter can work
        // (server already maintains archivedBy/isArchived per user)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(c as any).isArchived ? { isArchived: true as any } : {},
    };
}

function conversationMessagesToMessages(
    msgs: ConversationMessage[],
    currentUserId: string | null
): Message[] {
    const currentId = currentUserId != null ? String(currentUserId) : null;

    return msgs.map((m) => {
        const raw =
            m.senderId && typeof m.senderId === 'object'
                ? (m.senderId as { id?: string; _id?: string })
                : null;
        const senderId = raw ? String(raw.id ?? raw._id ?? '') : '';

        // Primary signal: explicit sender id match
        let isFromCurrentUser: boolean | undefined =
            currentId != null && senderId !== '' ? senderId === currentId : undefined;

        // Fallback for older messages where senderId might be missing:
        // on the dashboard, the viewer is an admin/seller (support),
        // so treat "support" role as "me" when we can't rely on senderId.
        if (isFromCurrentUser === undefined && currentId != null) {
            if (m.role === 'support') {
                isFromCurrentUser = true;
            } else if (m.role === 'customer') {
                isFromCurrentUser = false;
            }
        }

        return {
            id: (m as { id?: string }).id ?? (m as { _id?: string })._id ?? '',
            content: m.content,
            role: m.role === 'customer' ? 'user' : 'assistant',
            timestamp: new Date(m.createdAt),
            isFromCurrentUser,
        };
    });
}

export default function MessagePage() {
    const searchParams = useSearchParams();
    const { userId: currentUserId } = useAuth();
    const conversationId = searchParams.get('conversationId');
    const queryClient = useQueryClient();
    // One shared query (deduped across remounts/strict-mode). The first page of
    // 100 renders immediately; further pages are pulled in behind it, so there is
    // no hard cap on how many conversations show up.
    const conversations = useInfiniteQuery({
        queryKey: ['conversations', 'dashboard-list'],
        queryFn: ({ pageParam }) => getConversations({ page: pageParam, limit: 100 }),
        initialPageParam: 1,
        getNextPageParam: (last) =>
            last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
        staleTime: 5_000,
        // New conversations / latest activity show up without a refresh (paused while the tab is hidden).
        // Refresh only while the tab is focused and in use; 30s is plenty for a conversation list.
        refetchInterval: () => (typeof document !== 'undefined' && !document.hidden ? 8_000 : false),
    });
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = conversations;
    useEffect(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // The chat that's open on screen counts as read: no badge, no notification for it.
    const [openId, setOpenId] = useState<string | null>(conversationId);
    const openIdRef = useRef(openId);
    openIdRef.current = openId;

    const items = useMemo(() => (conversations.data?.pages ?? []).flatMap((p) => p.items), [conversations.data]);
    const contacts = useMemo<Contact[]>(
        () => items.map((c) => {
            const contact = conversationToContact(c, currentUserId);
            return contact.id === openId ? { ...contact, unread: 0 } : contact;
        }),
        [items, currentUserId, openId],
    );

    // Clear the server-side badge for the open chat whenever it has new unread messages.
    const markingRef = useRef(new Set<string>());
    useEffect(() => {
        const open = items.find((c) => c.id === openId);
        if (!open || !(open.unreadCount && open.unreadCount > 0) || markingRef.current.has(open.id)) return;
        markingRef.current.add(open.id);
        markConversationRead(open.id)
            .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
            .catch(() => {})
            .finally(() => markingRef.current.delete(open.id));
    }, [items, openId, queryClient]);

    // Notify when a conversation gets new unread messages while we're polling.
    const seenUnreadRef = useRef<Map<string, number> | null>(null);
    useEffect(() => {
        if (!conversations.data) return;
        const prev = seenUnreadRef.current;
        const next = new Map(items.map((c) => [c.id, c.unreadCount ?? 0]));
        seenUnreadRef.current = next;
        if (!prev) return; // first load: just show badges, don't ping
        for (const c of items) {
            const before = prev.get(c.id) ?? 0;
            const now = c.unreadCount ?? 0;
            const viewing = c.id === openIdRef.current && typeof document !== 'undefined' && !document.hidden;
            if (now <= before || viewing) continue;
            const sender = c.contactName || c.groupName || c.fromUserId?.name || 'New message';
            const body = c.lastMessage ?? c.subject;
            toast({ title: sender, description: body });
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
                try { new Notification(sender, { body, tag: c.id }); } catch { /* ignore */ }
            }
        }
    }, [items, conversations.data]);

    // Ask once for permission to show desktop notifications.
    useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    }, []);

    // WhatsApp-style tab title: "(3) Messages".
    const totalUnread = useMemo(() => contacts.reduce((n, c) => n + (c.unread > 0 ? c.unread : 0), 0), [contacts]);
    useEffect(() => {
        const base = document.title.replace(/^\(\d+\)\s*/, '');
        document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
        return () => { document.title = base; };
    }, [totalUnread]);
    const loading = conversations.isLoading;
    const loadConversations = useCallback(
        () => queryClient.invalidateQueries({ queryKey: ['conversations', 'dashboard-list'] }),
        [queryClient],
    );

    const onLoadMessages = useCallback(async (contactId: string): Promise<Message[]> => {
        const msgs = await getConversationMessages(contactId);
        return conversationMessagesToMessages(msgs, currentUserId);
    }, [currentUserId]);

    const onSendMessage = useCallback(
        async (content: string, contactId?: string): Promise<Message[]> => {
            if (!contactId) return [];
            await sendConversationMessage(contactId, content);
            const msgs = await getConversationMessages(contactId);
            return conversationMessagesToMessages(msgs, currentUserId);
        },
        [currentUserId]
    );

    return (
        <EnhancedChatInterface
            mode="dashboard"
            contacts={contacts}
            initialSelectedContactId={conversationId}
            onLoadMessages={onLoadMessages}
            onSelectContact={(c) => setOpenId(c?.id ?? null)}
            onSendMessage={onSendMessage}
            onConversationCreated={loadConversations}
            title="Messages"
            subtitle="Contact and tour enquiry conversations"
            emptyStateTitle="No conversations"
            emptyStateDescription={loading ? 'Loading...' : 'Conversations will appear here when customers contact you or submit tour enquiries.'}
        />
    );
}
