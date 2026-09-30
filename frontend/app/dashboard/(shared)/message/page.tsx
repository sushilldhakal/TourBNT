'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { EnhancedChatInterface, type Contact, type Message } from '@/components/chat/EnhancedChatInterface';
import { useAuth } from '@/lib/hooks/useAuth';
import {
    getConversations,
    getConversationMessages,
    sendConversationMessage,
    type Conversation,
    type ConversationMessage,
} from '@/lib/api/conversations';

function conversationToContact(c: Conversation): Contact {
    const id = (c as { id?: string }).id ?? (c as { _id?: string })._id ?? '';
    const name =
        c.groupName ||
        c.guestName ||
        (c.fromUserId && typeof c.fromUserId === 'object' && 'name' in c.fromUserId
            ? (c.fromUserId as { name?: string }).name
            : undefined) ||
        c.subject ||
        'Unknown';
    return {
        id,
        name,
        lastMessage: c.subject || 'No messages yet',
        lastActive: new Date(c.updatedAt),
        unread: 0,
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
        staleTime: 30_000,
    });
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = conversations;
    useEffect(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const contacts = useMemo<Contact[]>(
        () => (conversations.data?.pages ?? []).flatMap((p) => p.items).map(conversationToContact),
        [conversations.data],
    );
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
            onSendMessage={onSendMessage}
            onConversationCreated={loadConversations}
            title="Messages"
            subtitle="Contact and tour enquiry conversations"
            emptyStateTitle="No conversations"
            emptyStateDescription={loading ? 'Loading...' : 'Conversations will appear here when customers contact you or submit tour enquiries.'}
        />
    );
}
