// components/chat/ChatInterface.tsx
"use client"

import * as React from "react"
import { Send, User, Bot, Plus, Search, MessageCircle, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/useAuth"
import {
    createBroadcastConversation,
    createDirectConversation,
    getConversationMessages,
    archiveConversation as archiveConversationApi,
    deleteConversation as deleteConversationApi,
    type Conversation,
    type ConversationMessage,
} from "@/lib/api/conversations"
import { getUsers } from "@/lib/api/users"

export interface Message {
    id: string
    content: string
    role: "user" | "assistant"
    timestamp: Date
}

export interface Contact {
    id: string
    name: string
    avatar?: string
    lastMessage: string
    lastActive: Date
    unread: number
  isBroadcast?: boolean
  groupName?: string
  /** Internal flag to indicate this was selected from Direct tab before a real conversation exists */
  directUserId?: string
}

interface ChatInterfaceProps {
    // Mode determines the behavior
    mode: "dashboard" | "enquiry"

    // Data
    contacts?: Contact[]
    initialMessages?: Message[]
    /** When set, auto-select this contact (e.g. from URL ?conversationId=) */
    initialSelectedContactId?: string | null

    // Callbacks
    onSendMessage?: (message: string, contactId?: string) => Promise<void | Message[]>
    onSelectContact?: (contact: Contact) => void
    onLoadMessages?: (contactId: string) => Promise<Message[]>

    // Customization
    title?: string
    subtitle?: string
    placeholder?: string
    emptyStateTitle?: string
    emptyStateDescription?: string
    showUserList?: boolean // For enquiry mode (single chat)

    // Styling
    className?: string
}
const formatLastActive = (date: Date): string => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffMs = startOfToday.getTime() - startOfDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
        // Today – show time
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    if (diffDays > 0 && diffDays < 7) {
        // Past week – show weekday
        return date.toLocaleDateString(undefined, { weekday: "short" })
    }

    // Older – show full date DD/MM/YYYY
    return date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

export function ChatInterface({
    mode = "dashboard",
    contacts = [],
    initialMessages = [],
    initialSelectedContactId,
    onSendMessage,
    onSelectContact,
    onLoadMessages,
    title = "Messages",
    subtitle,
    placeholder = "Type your message...",
    emptyStateTitle = "No conversation selected",
    emptyStateDescription = "Select a user to start chatting",
    showUserList: showUserListProp = true,
    className,
}: ChatInterfaceProps) {
    const { userRole } = useAuth()
    const isAdmin = userRole === "admin"

    const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null)
    const [messages, setMessages] = React.useState<Message[]>(initialMessages)
    const initialSelectDone = React.useRef(false)
    const [input, setInput] = React.useState("")
    const [showUserList, setShowUserList] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [broadcastAudience, setBroadcastAudience] = React.useState<"sellers" | "users" | "all">("sellers")
    const [pendingBroadcastTarget, setPendingBroadcastTarget] = React.useState<{
        audience: "sellers" | "users" | "all"
        label: string
    } | null>(null)
    const [panelMode, setPanelMode] = React.useState<"broadcast" | "direct">("broadcast")
    const [directUsers, setDirectUsers] = React.useState<{ id: string; name: string; email?: string; role: string }[]>([])
    const [isLoadingUsers, setIsLoadingUsers] = React.useState(false)
    const [directSearch, setDirectSearch] = React.useState("")
    const [directSubject, setDirectSubject] = React.useState("")
    const [pendingDirectTarget, setPendingDirectTarget] = React.useState<{ userId: string; name: string } | null>(null)
    const [listFilter, setListFilter] = React.useState<"all" | "unread" | "groups" | "archive">("all")
    const [hiddenConversationIds, setHiddenConversationIds] = React.useState<string[]>([])
    const messagesEndRef = React.useRef<HTMLDivElement>(null)

    const filteredContacts = contacts
        .filter((contact) =>
            contact.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((contact) => {
            if (hiddenConversationIds.includes(contact.id)) return false
            if (listFilter === "all") return !(contact as any).isArchived
            if (listFilter === "unread") return contact.unread > 0
            if (listFilter === "groups") return contact.isBroadcast
            if (listFilter === "archive") return (contact as any).isArchived
            return true
        })

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    React.useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSelectContact = async (contact: Contact) => {
        setSelectedContact(contact)
        setShowUserList(false)
        setSearchQuery("")

        // Call parent callback
        onSelectContact?.(contact)

        // Load messages for this contact
        if (onLoadMessages) {
            setIsLoading(true)
            try {
                const loadedMessages = await onLoadMessages(contact.id)
                setMessages(loadedMessages)
            } catch (error) {
                console.error("Failed to load messages:", error)
            } finally {
                setIsLoading(false)
            }
        }
    }

    // Auto-select conversation when initialSelectedContactId is set (e.g. from header dropdown link)
    React.useEffect(() => {
        if (initialSelectDone.current || !initialSelectedContactId || contacts.length === 0 || !onLoadMessages) return
        const contact = contacts.find((c) => c.id === initialSelectedContactId)
        if (contact) {
            initialSelectDone.current = true
            setSelectedContact(contact)
            setShowUserList(false)
            onSelectContact?.(contact)
            setIsLoading(true)
            onLoadMessages(contact.id)
                .then((loaded) => setMessages(loaded))
                .catch(() => setMessages([]))
                .finally(() => setIsLoading(false))
        }
    }, [contacts, initialSelectedContactId, onLoadMessages, onSelectContact])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        // For dashboard mode, require contact selection
        if (mode === "dashboard" && !selectedContact) return

        // Pending broadcast: admin has chosen Sellers/Users/All via + panel,
        // but the conversation does not yet exist. Create it now using the main input.
        if (
            mode === "dashboard" &&
            isAdmin &&
            pendingBroadcastTarget &&
            selectedContact?.groupName === pendingBroadcastTarget.label
        ) {
            try {
                const conv = await createBroadcastConversation({
                    subject: pendingBroadcastTarget.label,
                    message: input.trim(),
                    broadcastAudience: pendingBroadcastTarget.audience,
                    allowParticipantReplies: false,
                    groupName: pendingBroadcastTarget.label,
                })

                const newContact: Contact = {
                    id: conv.id,
                    name: conv.groupName || conv.subject,
                    lastMessage: conv.subject,
                    lastActive: new Date(conv.updatedAt),
                    unread: 0,
                    isBroadcast: conv.isBroadcast,
                    groupName: conv.groupName,
                }

                setSelectedContact(newContact)
                setPendingBroadcastTarget(null)
                setInput("")

                const msgs: ConversationMessage[] = await getConversationMessages(conv.id)
                setMessages(
                    msgs.map((m) => ({
                        id: (m as any).id ?? (m as any)._id ?? "",
                        content: m.content,
                        role: m.role === "customer" ? "user" : "assistant",
                        timestamp: new Date(m.createdAt),
                    }))
                )
                return
            } catch (error) {
                console.error("Failed to create broadcast conversation:", error)
                return
            }
        }

        // If this is a pending direct conversation (admin-initiated DM with no existing thread yet),
        // create the direct conversation on the server first, then load messages.
        if (
            mode === "dashboard" &&
            isAdmin &&
            pendingDirectTarget &&
            selectedContact?.directUserId === pendingDirectTarget.userId
        ) {
            try {
                const conv = await createDirectConversation({
                    targetUserId: pendingDirectTarget.userId,
                    subject: directSubject || `Direct message from admin`,
                    message: input.trim(),
                })

                const newContact: Contact = {
                    id: conv.id,
                    name: pendingDirectTarget.name,
                    lastMessage: conv.subject,
                    lastActive: new Date(conv.updatedAt),
                    unread: 0,
                }

                setSelectedContact(newContact)
                setPendingDirectTarget(null)
                setDirectSubject("")
                setInput("")

                // Load full message history for this new conversation
                const msgs: ConversationMessage[] = await getConversationMessages(conv.id)
                setMessages(
                    msgs.map((m) => ({
                        id: (m as any).id ?? (m as any)._id ?? "",
                        content: m.content,
                        role: m.role === "customer" ? "user" : "assistant",
                        timestamp: new Date(m.createdAt),
                    }))
                )
                return
            } catch (error) {
                console.error("Failed to create direct conversation:", error)
                return
            }
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            content: input,
            role: "user",
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")

        // Call parent callback; if it returns updated messages, use them
        if (onSendMessage) {
            try {
                const updated = await onSendMessage(input, selectedContact?.id)
                if (Array.isArray(updated)) setMessages(updated)
            } catch (error) {
                console.error("Failed to send message:", error)
            }
        }
    }

    const handleLoadUsersForDirect = async () => {
        if (!isAdmin || directUsers.length > 0 || isLoadingUsers) return
        setIsLoadingUsers(true)
        try {
            const data = await getUsers({ page: 1, limit: 200 })
            const items = Array.isArray(data?.items) ? data.items : data?.data ?? []
            const mapped =
                items?.map((u: any) => ({
                    id: u.id ?? u._id ?? "",
                    name: u.name ?? u.email ?? "Unknown user",
                    email: u.email,
                    role: Array.isArray(u.roles) ? (u.roles[0] as string) : (u.roles as string),
                })) ?? []
            setDirectUsers(mapped)
        } catch (error) {
            console.error("Failed to load users for direct message:", error)
        } finally {
            setIsLoadingUsers(false)
        }
    }

    const filteredDirectUsers = directUsers.filter((u) => {
        const term = directSearch.toLowerCase()
        return (
            u.name.toLowerCase().includes(term) ||
            (u.email ?? "").toLowerCase().includes(term)
        )
    })

    // Enquiry mode (single chat, no contact list)
    if (mode === "enquiry") {
        return (
            <div className={cn("flex h-full flex-col bg-background", className)}>
                {/* Header */}
                <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <MessageCircle className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="font-semibold">{title}</h2>
                        <p className="text-sm text-muted-foreground">
                            {subtitle || "Ask us anything about tours"}
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                                <MessageCircle className="size-8 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Start a conversation</h3>
                                <p className="text-sm text-muted-foreground">
                                    Send us a message to get started
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex gap-3",
                                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "flex size-8 shrink-0 items-center justify-center rounded-full",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                    >
                                        {message.role === "user" ? (
                                            <User className="size-4" aria-hidden="true" />
                                        ) : (
                                            <Bot className="size-4" aria-hidden="true" />
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "flex max-w-[75%] flex-col gap-1 rounded-lg px-4 py-2",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        <span
                                            className={cn(
                                                "text-xs",
                                                message.role === "user"
                                                    ? "text-primary-foreground/70"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {message.timestamp.toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="border-t bg-background p-4">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={placeholder}
                            className="min-h-11 max-h-32 flex-1 resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSubmit(e)
                                }
                            }}
                        />
                        <Button type="submit" size="icon" className="size-11 shrink-0" aria-label="Send message">
                            <Send className="size-4" aria-hidden="true" />
                        </Button>
                    </form>
                </div>
            </div>
        )
    }

    // Dashboard mode (with contact list) – WhatsApp-style layout
    return (
        <div className={cn("flex h-full min-h-[560px] rounded-lg border bg-background shadow-sm", className)}>
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Left Panel - Chat list */}
                {showUserListProp && (
                    <>
                        <ResizablePanel
                            defaultSize={30}
                            minSize={22}
                            maxSize={40}
                            className="hidden md:flex border-r bg-muted/40"
                        >
                            <div className="flex w-full flex-col">
                                {/* Chat list header */}
                                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                                    <div>
                                        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
                                        <p className="text-xs text-muted-foreground">
                                            {subtitle || "All customer conversations"}
                                        </p>
                                    </div>
                                <div className="flex items-center gap-2">
                                        <div className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-[11px] text-muted-foreground">
                                            <MessageCircle className="h-3 w-3" aria-hidden="true" />
                                            <span>{contacts.length} chats</span>
                                        </div>
                                        {isAdmin && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="size-7 rounded-full"
                                                onClick={() => {
                                                    setPanelMode("broadcast")
                                                    setShowUserList((prev) => !prev)
                                                }}
                                                aria-label="Create broadcast or direct message"
                                            >
                                                <Plus className="h-3 w-3" aria-hidden="true" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Search + filters */}
                                <div className="border-b px-3 py-2 space-y-2">
                                    <div className="relative">
                                        <Search
                                            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            placeholder="Search or start a chat"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-8 rounded-full border-none bg-background pl-9 text-xs shadow-none focus-visible:ring-1"
                                            aria-label="Search conversations"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => setListFilter("all")}
                                            className={cn(
                                                "rounded-full px-2 py-0.5",
                                                listFilter === "all"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-background text-muted-foreground"
                                            )}
                                        >
                                            All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setListFilter("unread")}
                                            className={cn(
                                                "rounded-full px-2 py-0.5",
                                                listFilter === "unread"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-background text-muted-foreground"
                                            )}
                                        >
                                            Unread
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setListFilter("groups")}
                                            className={cn(
                                                "rounded-full px-2 py-0.5",
                                                listFilter === "groups"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-background text-muted-foreground"
                                            )}
                                        >
                                            Groups
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setListFilter("archive")}
                                            className={cn(
                                                "rounded-full px-2 py-0.5",
                                                listFilter === "archive"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-background text-muted-foreground"
                                            )}
                                        >
                                            Archive
                                        </button>
                                    </div>
                                </div>

                                {/* New message panel (admin only, toggled by +) */}
                                {isAdmin && showUserList && (
                                    <div className="border-b px-3 py-3 text-xs">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="font-semibold text-foreground">New message</p>
                                            <div className="inline-flex rounded-full bg-background p-1 text-[11px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setPanelMode("broadcast")}
                                                    className={cn(
                                                        "rounded-full px-2 py-0.5",
                                                        panelMode === "broadcast" &&
                                                            "bg-primary text-primary-foreground"
                                                    )}
                                                >
                                                    Broadcast
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPanelMode("direct")
                                                        void handleLoadUsersForDirect()
                                                    }}
                                                    className={cn(
                                                        "rounded-full px-2 py-0.5",
                                                        panelMode === "direct" &&
                                                            "bg-primary text-primary-foreground"
                                                    )}
                                                >
                                                    Direct
                                                </button>
                                            </div>
                                        </div>

                                        {panelMode === "broadcast" ? (
                                            <div className="space-y-2">
                                                <p className="text-[11px] text-muted-foreground">
                                                    Choose who to broadcast to, then write your message in the main chat
                                                    box.
                                                </p>
                                                <div className="flex gap-1 rounded-full bg-background p-1 text-[11px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isAdmin) return
                                                            setBroadcastAudience("sellers")
                                                            const label = "All sellers"
                                                            setPendingDirectTarget(null)
                                                            setPendingBroadcastTarget({
                                                                audience: "sellers",
                                                                label,
                                                            })
                                                            setSelectedContact({
                                                                id: "__broadcast_sellers",
                                                                name: label,
                                                                lastMessage: "",
                                                                lastActive: new Date(),
                                                                unread: 0,
                                                                isBroadcast: true,
                                                                groupName: label,
                                                            })
                                                            setMessages([])
                                                            setShowUserList(false)
                                                        }}
                                                        className={cn(
                                                            "flex-1 rounded-full px-2 py-1",
                                                            broadcastAudience === "sellers" &&
                                                                "bg-primary text-primary-foreground"
                                                        )}
                                                    >
                                                        Sellers
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isAdmin) return
                                                            setBroadcastAudience("users")
                                                            const label = "All users"
                                                            setPendingDirectTarget(null)
                                                            setPendingBroadcastTarget({
                                                                audience: "users",
                                                                label,
                                                            })
                                                            setSelectedContact({
                                                                id: "__broadcast_users",
                                                                name: label,
                                                                lastMessage: "",
                                                                lastActive: new Date(),
                                                                unread: 0,
                                                                isBroadcast: true,
                                                                groupName: label,
                                                            })
                                                            setMessages([])
                                                            setShowUserList(false)
                                                        }}
                                                        className={cn(
                                                            "flex-1 rounded-full px-2 py-1",
                                                            broadcastAudience === "users" &&
                                                                "bg-primary text-primary-foreground"
                                                        )}
                                                    >
                                                        Users
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isAdmin) return
                                                            setBroadcastAudience("all")
                                                            const label = "All users & sellers"
                                                            setPendingDirectTarget(null)
                                                            setPendingBroadcastTarget({
                                                                audience: "all",
                                                                label,
                                                            })
                                                            setSelectedContact({
                                                                id: "__broadcast_all",
                                                                name: label,
                                                                lastMessage: "",
                                                                lastActive: new Date(),
                                                                unread: 0,
                                                                isBroadcast: true,
                                                                groupName: label,
                                                            })
                                                            setMessages([])
                                                            setShowUserList(false)
                                                        }}
                                                        className={cn(
                                                            "flex-1 rounded-full px-2 py-1",
                                                            broadcastAudience === "all" &&
                                                                "bg-primary text-primary-foreground"
                                                        )}
                                                    >
                                                        All
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Input
                                                    value={directSubject}
                                                    onChange={(e) => setDirectSubject(e.target.value)}
                                                    placeholder="Subject (optional)"
                                                    className="h-8 text-xs"
                                                />
                                                <Input
                                                    value={directSearch}
                                                    onChange={(e) => setDirectSearch(e.target.value)}
                                                    placeholder="Search users or sellers…"
                                                    className="h-8 text-xs"
                                                />
                                                <div className="max-h-40 overflow-y-auto rounded-md border border-border/60 bg-background">
                                                    {isLoadingUsers ? (
                                                        <p className="px-3 py-2 text-[11px] text-muted-foreground">
                                                            Loading users…
                                                        </p>
                                                    ) : filteredDirectUsers.length === 0 ? (
                                                        <p className="px-3 py-2 text-[11px] text-muted-foreground">
                                                            No users found
                                                        </p>
                                                    ) : (
                                                        filteredDirectUsers.map((u) => (
                                                            <button
                                                                key={u.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setPendingDirectTarget({ userId: u.id, name: u.name })
                                                                    setSelectedContact({
                                                                        id: u.id,
                                                                        name: u.name,
                                                                        lastMessage: "",
                                                                        lastActive: new Date(),
                                                                        unread: 0,
                                                                        directUserId: u.id,
                                                                    })
                                                                    setShowUserList(false)
                                                                }}
                                                                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] hover:bg-muted"
                                                            >
                                                                <span className="truncate">
                                                                    {u.name}
                                                                    {u.email ? (
                                                                        <span className="text-muted-foreground">
                                                                            {" "}
                                                                            · {u.email}
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                                                                    {u.role}
                                                                </span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Conversation list */}
                                <div className="flex-1 overflow-y-auto">
                                    {filteredContacts.length === 0 ? (
                                        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                                            No conversations found
                                        </p>
                                    ) : (
                                        filteredContacts.map((contact) => (
                                            <ContactItem
                                                key={contact.id}
                                                contact={contact}
                                                isSelected={selectedContact?.id === contact.id}
                                                onClick={() => handleSelectContact(contact)}
                                                onArchive={() => {
                                                    void archiveConversationApi(contact.id)
                                                        .then(() => {
                                                            setHiddenConversationIds((prev) =>
                                                                prev.includes(contact.id) ? prev : [...prev, contact.id]
                                                            )
                                                            if (selectedContact?.id === contact.id) {
                                                                setSelectedContact(null)
                                                                setMessages([])
                                                            }
                                                        })
                                                        .catch((error) =>
                                                            console.error("Failed to archive conversation:", error)
                                                        )
                                                }}
                                                onDelete={
                                                    isAdmin
                                                        ? () =>
                                                              void deleteConversationApi(contact.id)
                                                                  .then(() => {
                                                                      setHiddenConversationIds((prev) =>
                                                                          prev.includes(contact.id)
                                                                              ? prev
                                                                              : [...prev, contact.id]
                                                                      )
                                                                      if (selectedContact?.id === contact.id) {
                                                                          setSelectedContact(null)
                                                                          setMessages([])
                                                                      }
                                                                  })
                                                                  .catch((error) =>
                                                                      console.error(
                                                                          "Failed to delete conversation:",
                                                                          error
                                                                      )
                                                                  )
                                                        : undefined
                                                }
                                                showTime
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="hidden md:flex" />
                    </>
                )}

                {/* Right Panel - Active chat */}
                <ResizablePanel defaultSize={70} minSize={showUserListProp ? 60 : 100} className="flex flex-col">
                    {selectedContact ? (
                        <>
                            {/* Chat header */}
                            <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <span className="text-xs font-medium">
                                            {selectedContact.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <h2 className="text-sm font-semibold leading-none">
                                            {selectedContact.name}
                                        </h2>
                                        <p className="text-[11px] text-muted-foreground">
                                            {messages.length > 0 ? "Conversation history" : "New conversation"}
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden text-[11px] text-muted-foreground md:inline-flex">
                                    {messages.length} message{messages.length === 1 ? "" : "s"}
                                </div>
                            </div>

                            {/* Messages area */}
                            <div className="flex-1 bg-muted/20">
                                <div className="mx-auto flex h-full max-w-3xl flex-col gap-3 px-3 py-3 md:px-6 md:py-4">
                                    {isLoading ? (
                                        <div className="flex flex-1 items-center justify-center">
                                            <p className="text-sm text-muted-foreground">
                                                Loading messages...
                                            </p>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                                <MessageCircle
                                                    className="h-6 w-6 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-foreground">
                                                    No messages yet
                                                </p>
                                                <p className="text-xs text-muted-foreground max-w-xs">
                                                    Send a message to start the conversation with this customer.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                                            {messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={cn(
                                                        "flex w-full",
                                                        message.role === "user"
                                                            ? "justify-end"
                                                            : "justify-start"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "inline-flex max-w-[80%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm shadow-sm",
                                                            message.role === "user"
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-background text-foreground border border-border/60"
                                                        )}
                                                    >
                                                        <p className="whitespace-pre-wrap leading-relaxed">
                                                            {message.content}
                                                        </p>
                                                        <span
                                                            className={cn(
                                                                "self-end text-[10px]",
                                                                message.role === "user"
                                                                    ? "text-primary-foreground/80"
                                                                    : "text-muted-foreground"
                                                            )}
                                                        >
                                                            {message.timestamp.toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Input bar */}
                            <div className="border-t bg-background/95 px-3 py-2 md:px-4 md:py-3">
                                {selectedContact.isBroadcast && !isAdmin ? (
                                    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 text-xs text-muted-foreground">
                                        <p>
                                            Replies are disabled for this announcement. Contact support directly if
                                            you have questions.
                                        </p>
                                    </div>
                                ) : (
                                    <form
                                        onSubmit={handleSubmit}
                                        className="mx-auto flex max-w-3xl items-end gap-2 md:gap-3"
                                    >
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={placeholder || `Message ${selectedContact.name}...`}
                                            className="min-h-10 max-h-32 flex-1 resize-none rounded-full border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            rows={1}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSubmit(e)
                                                }
                                            }}
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            className="h-10 w-10 shrink-0 rounded-full"
                                            aria-label="Send message"
                                        >
                                            <Send className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/10 p-6 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <User className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold">{emptyStateTitle}</h2>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    {emptyStateDescription}
                                </p>
                            </div>
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}

// Contact List Item Component
interface ContactItemProps {
    contact: Contact
    isSelected: boolean
    onClick: () => void
    showTime?: boolean
  onArchive?: () => void
  onDelete?: () => void
}

function ContactItem({ contact, isSelected, onClick, showTime = false, onArchive, onDelete }: ContactItemProps) {
    const [menuOpen, setMenuOpen] = React.useState(false)

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onClick()
                }
            }}
            className={cn(
                "flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                isSelected && "bg-accent"
            )}
        >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-sm font-medium">
                    {contact.name.split(" ").map((n) => n[0]).join("")}
                </span>
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                    <span className="max-w-[70%] truncate font-medium">
                        {contact.groupName || contact.name}
                    </span>
                    {showTime && (
                        <span className="text-xs text-muted-foreground">
                            {formatLastActive(contact.lastActive)}
                        </span>
                    )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                    {contact.isBroadcast && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Group
                        </span>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                        {contact.lastMessage}
                    </p>
                </div>
            </div>
            <div className="ml-2 flex items-center gap-1">
                {onArchive || onDelete ? (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpen((prev) => !prev)
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                            aria-label="Conversation options"
                        >
                            <ChevronDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                        {menuOpen && (
                            <div
                                className="absolute right-0 z-20 mt-1 w-32 rounded-md border bg-popover text-[11px] shadow-md"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {onArchive && (
                                    <button
                                        type="button"
                                        className="block w-full px-3 py-1.5 text-left hover:bg-muted"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setMenuOpen(false)
                                            onArchive()
                                        }}
                                    >
                                        Archive
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        type="button"
                                        className="block w-full px-3 py-1.5 text-left text-destructive hover:bg-muted"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setMenuOpen(false)
                                            onDelete()
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
                {contact.unread > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {contact.unread}
                    </span>
                )}
            </div>
        </div>
    )
}