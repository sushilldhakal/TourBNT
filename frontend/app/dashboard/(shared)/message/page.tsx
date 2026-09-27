'use client';

import { useCallback, useEffect, useState } from 'react';
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
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    const loadConversations = useCallback(async () => {
        setLoading(true);
        try {
            const { items } = await getConversations({ limit: 100 });
            setContacts(items.map(conversationToContact));
        } catch {
            setContacts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

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
