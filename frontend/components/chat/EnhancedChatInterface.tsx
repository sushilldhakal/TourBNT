"use client"

import * as React from "react"
import {
  Send,
  User,
  Bot,
  Plus,
  Search,
  MessageCircle,
  ChevronDown,
  Check,
  CheckCheck,
  Paperclip,
  Mic,
  Smile,
  MoreVertical,
  ArrowLeft,
  Archive,
  Trash2,
  X,
  Users,
  LayoutGrid,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  type ConversationMessage,
} from "@/lib/api/conversations"
import { getUsers } from "@/lib/api/users"

export interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  /** When true, message is shown on the right (current user); when false, on the left. Falls back to role === "user" if undefined. */
  isFromCurrentUser?: boolean
  status?: "sending" | "sent" | "delivered" | "read"
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
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
  directUserId?: string
  isOnline?: boolean
  isTyping?: boolean
  // optional flag used by Archive filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isArchived?: any
}

interface ChatInterfaceProps {
  mode: "dashboard" | "enquiry"
  contacts?: Contact[]
  initialMessages?: Message[]
  initialSelectedContactId?: string | null
  onSendMessage?: (message: string, contactId?: string) => Promise<void | Message[]>
  onSelectContact?: (contact: Contact) => void
  onLoadMessages?: (contactId: string) => Promise<Message[]>
  /** Called after a new conversation is created (e.g. broadcast or direct). Use to refetch the conversation list. */
  onConversationCreated?: () => void
  title?: string
  subtitle?: string
  placeholder?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  showUserList?: boolean
  className?: string
}

const formatLastActive = (date: Date): string => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffMs = startOfToday.getTime() - startOfDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" })
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const formatMessageTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const MessageStatusIcon = ({ status }: { status?: Message["status"] }) => {
  if (!status || status === "sending") {
    return <div className="h-3 w-3 rounded-full border-2 border-current opacity-50 animate-pulse" />
  }
  if (status === "sent") {
    return <Check className="h-3 w-3 opacity-60" />
  }
  if (status === "delivered") {
    return <CheckCheck className="h-3 w-3 opacity-60" />
  }
  if (status === "read") {
    return <CheckCheck className="h-3 w-3 text-blue-500" />
  }
  return null
}

export function EnhancedChatInterface({
  mode = "dashboard",
  contacts = [],
  initialMessages = [],
  initialSelectedContactId,
  onSendMessage,
  onSelectContact,
  onLoadMessages,
  onConversationCreated,
  title = "Messages",
  subtitle,
  placeholder = "Type a message",
  emptyStateTitle = "No conversation selected",
  emptyStateDescription = "Select a user to start chatting",
  showUserList: showUserListProp = true,
  className,
}: ChatInterfaceProps) {
  const { userRole, userId: currentUserId } = useAuth()
  const isAdmin = userRole === "admin"

  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null)
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const initialSelectDone = React.useRef(false)
  const [input, setInput] = React.useState("")
  const [showUserList, setShowUserList] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCreatingBroadcast, setIsCreatingBroadcast] = React.useState(false)
  const [broadcastAudience, setBroadcastAudience] = React.useState<"sellers" | "users" | "all">("sellers")
  const [broadcastTitle, setBroadcastTitle] = React.useState("")
  const [broadcastMessage, setBroadcastMessage] = React.useState("")
  const [panelMode, setPanelMode] = React.useState<"broadcast" | "direct">("broadcast")
  const [directUsers, setDirectUsers] = React.useState<{ id: string; name: string; email?: string; role: string }[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false)
  const [directSearch, setDirectSearch] = React.useState("")
  const [directSubject, setDirectSubject] = React.useState("")
  const [pendingDirectTarget, setPendingDirectTarget] = React.useState<{ userId: string; name: string } | null>(null)
  const [listFilter, setListFilter] = React.useState<"all" | "unread" | "groups" | "archive">("all")
  const [hiddenConversationIds, setHiddenConversationIds] = React.useState<string[]>([])
  const [showMobileList, setShowMobileList] = React.useState(true)
  const [isRecording, setIsRecording] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

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

  const isDraft =
    Boolean(
      selectedContact &&
        (selectedContact as any).directUserId &&
        pendingDirectTarget &&
        (selectedContact as any).directUserId === pendingDirectTarget.userId
    )

  const isDraftContact = (c: Contact) =>
    Boolean(
      (c as any).directUserId &&
        pendingDirectTarget &&
        (c as any).directUserId === pendingDirectTarget.userId
    )

  const contactsForSidebar =
    isDraft && selectedContact
      ? [
          selectedContact,
          ...filteredContacts.filter((c) => c.id !== selectedContact.id),
        ]
      : filteredContacts

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact)
    setShowUserList(false)
    setShowMobileList(false)
    setSearchQuery("")

    onSelectContact?.(contact)

    const isDraftContact =
      (contact as any).directUserId &&
      pendingDirectTarget &&
      (contact as any).directUserId === pendingDirectTarget.userId
    if (isDraftContact) {
      setMessages([])
      return
    }

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

  React.useEffect(() => {
    if (initialSelectDone.current || !initialSelectedContactId || contacts.length === 0 || !onLoadMessages) return
    const contact = contacts.find((c) => c.id === initialSelectedContactId)
    if (contact) {
      initialSelectDone.current = true
      setSelectedContact(contact)
      setShowUserList(false)
      setShowMobileList(false)
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

        if (mode === "dashboard" && !selectedContact) return

        // handle pending direct
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

        const msgs: ConversationMessage[] = await getConversationMessages(conv.id)
        const currentId = currentUserId != null ? String(currentUserId) : null
        setMessages(
          msgs.map((m) => {
            const raw = (m as { senderId?: { id?: string; _id?: string } }).senderId
            const senderId = raw ? String(raw.id ?? (raw as { _id?: string })._id ?? "") : ""
            const isFromCurrentUser = currentId != null && senderId !== "" ? senderId === currentId : undefined
            return {
              id: (m as any).id ?? (m as any)._id ?? "",
              content: m.content,
              role: m.role === "customer" ? "user" : "assistant",
              timestamp: new Date(m.createdAt),
              status: "delivered",
              isFromCurrentUser,
            }
          })
        )
        onConversationCreated?.()
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
      status: "sending",
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id ? { ...m, status: "sent" as const } : m
        )
      )
    }, 500)

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id ? { ...m, status: "delivered" as const } : m
        )
      )
    }, 1000)

    if (onSendMessage) {
      try {
        const updated = await onSendMessage(input, selectedContact?.id)
        if (Array.isArray(updated)) setMessages(updated)
      } catch (error) {
        console.error("Failed to send message:", error)
      }
    }
  }

  const handleCreateBroadcast = async (
    e: React.FormEvent,
    overrides?: { subject?: string }
  ) => {
    e.preventDefault()
    const subject = overrides?.subject?.trim() || broadcastTitle.trim()
    if (!isAdmin || !subject || !broadcastMessage.trim()) return
    setIsCreatingBroadcast(true)
    try {
      const groupNameLabel =
        broadcastAudience === "sellers"
          ? "All sellers"
          : broadcastAudience === "users"
            ? "All users"
            : "All users & sellers"
      await createBroadcastConversation({
        subject: subject || groupNameLabel,
        message: broadcastMessage.trim(),
        broadcastAudience,
        allowParticipantReplies: false,
        groupName: subject || groupNameLabel,
      })
      setBroadcastTitle("")
      setBroadcastMessage("")
      setShowUserList(false)
      onConversationCreated?.()
    } catch (error) {
      console.error("Failed to create broadcast:", error)
    } finally {
      setIsCreatingBroadcast(false)
    }
  }

  const handleLoadUsersForDirect = async () => {
    if (!isAdmin || directUsers.length > 0 || isLoadingUsers) return
    setIsLoadingUsers(true)
    try {
      const data = (await getUsers({ page: 1, limit: 200 })) as { items?: unknown[]; data?: unknown[] } | undefined
      const items = (Array.isArray(data?.items) ? data.items : data?.data) ?? []
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

  // Enquiry mode (single chat)
  if (mode === "enquiry") {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <div className="flex items-center justify-between gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/20">
              <MessageCircle className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-xs text-primary-foreground/80">
                {subtitle || "Ask us anything about tours"}
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto p-4"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23000\" fill-opacity=\"0.02\"%3E%3Cpath d=\"M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10z\"/%3E%3C/g%3E%3C/svg%3E')",
            backgroundColor: "hsl(var(--muted))",
          }}
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-background shadow-sm">
                <MessageCircle className="size-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Start a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Send us a message to get started
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((message, index) => {
                const showTimestamp =
                  index === 0 ||
                  new Date(messages[index - 1].timestamp).toDateString() !==
                    new Date(message.timestamp).toDateString()
                const isMe = message.isFromCurrentUser ?? (message.role === "user")
                return (
                  <React.Fragment key={message.id}>
                    {showTimestamp && (
                      <div className="flex justify-center my-2">
                        <span className="bg-card/90 px-3 py-1 rounded-full text-xs text-muted-foreground shadow-sm border border-border/50">
                          {new Date(message.timestamp).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex gap-2 max-w-[85%]",
                        isMe ? "ml-auto justify-end" : "mr-auto justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "relative rounded-lg px-3 py-2 shadow-sm",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted border border-border/60 rounded-tl-none"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-1 mt-1 justify-end",
                            isMe ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          <span className="text-[10px]">
                            {formatMessageTime(message.timestamp)}
                          </span>
                          {isMe && (
                            <MessageStatusIcon status={message.status} />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t bg-background p-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-10 shrink-0 text-muted-foreground"
            >
              <Smile className="size-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-10 shrink-0 text-muted-foreground"
            >
              <Paperclip className="size-5" />
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="min-h-10 max-h-32 flex-1 resize-none rounded-full border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            {input.trim() ? (
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 rounded-full bg-primary hover:bg-primary/90"
              >
                <Send className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-10 shrink-0 text-muted-foreground"
                onClick={() => setIsRecording(!isRecording)}
              >
                <Mic className={cn("size-5", isRecording && "text-red-500 animate-pulse")} />
              </Button>
            )}
          </form>
        </div>
      </div>
    )
  }

  // Dashboard mode
  return (
    <div className={cn("flex h-full min-h-[600px] rounded-lg border bg-background shadow-lg overflow-hidden", className)}>
      {/* Mobile: list vs chat */}
      <div className="flex-1 md:hidden">
        {showMobileList || !selectedContact ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-primary px-4 py-4 text-primary-foreground">
              <h2 className="text-lg font-semibold">{title}</h2>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 size-9">
                  <Search className="h-5 w-5" />
                </Button>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-primary-foreground/10 size-9"
                    onClick={() => {
                      setPanelMode("broadcast")
                      setShowUserList((prev) => !prev)
                    }}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 size-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="shrink-0 border-b bg-background px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-full pl-9"
                />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b px-3 py-2 text-xs">
              {["all", "unread", "groups", "archive"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setListFilter(filter as any)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 capitalize",
                    listFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {contactsForSidebar.map((contact) => (
                <ContactItem
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContact?.id === contact.id}
                  onClick={() => handleSelectContact(contact)}
                  showTime
                  onArchive={() => {
                    if (isDraftContact(contact)) {
                      setPendingDirectTarget(null)
                      setSelectedContact(null)
                      setMessages([])
                      return
                    }
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
                      .catch((err) => console.error("Failed to archive conversation:", err))
                  }}
                  onDelete={isAdmin ? () => {
                    if (isDraftContact(contact)) {
                      setPendingDirectTarget(null)
                      setSelectedContact(null)
                      setMessages([])
                      return
                    }
                    void deleteConversationApi(contact.id)
                      .then(() => {
                        setHiddenConversationIds((prev) =>
                          prev.includes(contact.id) ? prev : [...prev, contact.id]
                        )
                        if (selectedContact?.id === contact.id) {
                          setSelectedContact(null)
                          setMessages([])
                        }
                      })
                      .catch((err) => console.error("Failed to delete conversation:", err))
                  } : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <ChatView
            contact={selectedContact}
            messages={messages}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            handleSubmit={handleSubmit}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef}
            placeholder={placeholder}
            isAdmin={isAdmin}
            onBack={() => {
              setShowMobileList(true)
              setSelectedContact(null)
            }}
            onArchive={selectedContact && !selectedContact.id.startsWith("__broadcast_") ? () => {
              const c = selectedContact
              if (isDraftContact(c)) {
                setPendingDirectTarget(null)
                setSelectedContact(null)
                setMessages([])
                setShowMobileList(true)
                return
              }
              void archiveConversationApi(c.id)
                .then(() => {
                  setHiddenConversationIds((prev) => (prev.includes(c.id) ? prev : [...prev, c.id]))
                  setShowMobileList(true)
                  setSelectedContact(null)
                  setMessages([])
                })
                .catch((err) => console.error("Failed to archive conversation:", err))
            } : undefined}
            onDelete={selectedContact && !selectedContact.id.startsWith("__broadcast_") && isAdmin ? () => {
              const c = selectedContact
              if (isDraftContact(c)) {
                setPendingDirectTarget(null)
                setSelectedContact(null)
                setMessages([])
                setShowMobileList(true)
                return
              }
              void deleteConversationApi(c.id)
                .then(() => {
                  setHiddenConversationIds((prev) => (prev.includes(c.id) ? prev : [...prev, c.id]))
                  setShowMobileList(true)
                  setSelectedContact(null)
                  setMessages([])
                })
                .catch((err) => console.error("Failed to delete conversation:", err))
            } : undefined}
          />
        )}
      </div>

      {/* Desktop */}
      <ResizablePanelGroup direction="horizontal" className="hidden md:flex flex-1">
        {showUserListProp && (
          <>
            <ResizablePanel defaultSize={35} minSize={25} maxSize={45} className="flex min-h-0 flex-col">
              <ChatList
                title={title}
                subtitle={subtitle}
                contacts={contactsForSidebar}
                allContacts={contacts}
                selectedContact={selectedContact}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                listFilter={listFilter}
                setListFilter={setListFilter}
                isAdmin={isAdmin}
                showUserList={showUserList}
                setShowUserList={setShowUserList}
                panelMode={panelMode}
                setPanelMode={setPanelMode}
                broadcastAudience={broadcastAudience}
                setBroadcastAudience={setBroadcastAudience}
                broadcastTitle={broadcastTitle}
                setBroadcastTitle={setBroadcastTitle}
                broadcastMessage={broadcastMessage}
                setBroadcastMessage={setBroadcastMessage}
                isCreatingBroadcast={isCreatingBroadcast}
                handleCreateBroadcast={handleCreateBroadcast}
                directSubject={directSubject}
                setDirectSubject={setDirectSubject}
                directSearch={directSearch}
                setDirectSearch={setDirectSearch}
                filteredDirectUsers={filteredDirectUsers}
                isLoadingUsers={isLoadingUsers}
                handleLoadUsersForDirect={handleLoadUsersForDirect}
                setPendingDirectTarget={setPendingDirectTarget}
                setSelectedContact={setSelectedContact}
                handleSelectContact={handleSelectContact}
                hiddenConversationIds={hiddenConversationIds}
                setHiddenConversationIds={setHiddenConversationIds}
                onArchive={(contact) => {
                  if (isDraftContact(contact)) {
                    setPendingDirectTarget(null)
                    setSelectedContact(null)
                    setMessages([])
                    return
                  }
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
                    .catch((err) => console.error("Failed to archive conversation:", err))
                }}
                onDelete={isAdmin ? (contact) => {
                  if (isDraftContact(contact)) {
                    setPendingDirectTarget(null)
                    setSelectedContact(null)
                    setMessages([])
                    return
                  }
                  void deleteConversationApi(contact.id)
                    .then(() => {
                      setHiddenConversationIds((prev) =>
                        prev.includes(contact.id) ? prev : [...prev, contact.id]
                      )
                      if (selectedContact?.id === contact.id) {
                        setSelectedContact(null)
                        setMessages([])
                      }
                    })
                    .catch((err) => console.error("Failed to delete conversation:", err))
                } : undefined}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={65} minSize={55} className="flex min-h-0 flex-col">
          {selectedContact ? (
            <ChatView
              contact={selectedContact}
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              handleSubmit={handleSubmit}
              messagesEndRef={messagesEndRef}
              inputRef={inputRef}
              placeholder={placeholder}
              isAdmin={isAdmin}
              onArchive={selectedContact && !selectedContact.id.startsWith("__broadcast_") ? () => {
                const c = selectedContact
                if (isDraftContact(c)) {
                  setPendingDirectTarget(null)
                  setSelectedContact(null)
                  setMessages([])
                  return
                }
                void archiveConversationApi(c.id)
                  .then(() => {
                    setHiddenConversationIds((prev) => (prev.includes(c.id) ? prev : [...prev, c.id]))
                    setSelectedContact(null)
                    setMessages([])
                  })
                  .catch((err) => console.error("Failed to archive conversation:", err))
              } : undefined}
              onDelete={selectedContact && !selectedContact.id.startsWith("__broadcast_") && isAdmin ? () => {
                const c = selectedContact
                if (isDraftContact(c)) {
                  setPendingDirectTarget(null)
                  setSelectedContact(null)
                  setMessages([])
                  return
                }
                void deleteConversationApi(c.id)
                  .then(() => {
                    setHiddenConversationIds((prev) => (prev.includes(c.id) ? prev : [...prev, c.id]))
                    setSelectedContact(null)
                    setMessages([])
                  })
                  .catch((err) => console.error("Failed to delete conversation:", err))
              } : undefined}
            />
          ) : (
            <EmptyState title={emptyStateTitle} description={emptyStateDescription} />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* New message drawer (left side, admin only) */}
      {isAdmin && showUserList && (
        <NewMessageDrawer
          onClose={() => setShowUserList(false)}
          panelMode={panelMode}
          setPanelMode={setPanelMode}
          broadcastAudience={broadcastAudience}
          setBroadcastAudience={setBroadcastAudience}
          broadcastTitle={broadcastTitle}
          setBroadcastTitle={setBroadcastTitle}
          broadcastMessage={broadcastMessage}
          setBroadcastMessage={setBroadcastMessage}
          isCreatingBroadcast={isCreatingBroadcast}
          handleCreateBroadcast={handleCreateBroadcast}
          directSubject={directSubject}
          setDirectSubject={setDirectSubject}
          directSearch={directSearch}
          setDirectSearch={setDirectSearch}
          directUsers={directUsers}
          filteredDirectUsers={filteredDirectUsers}
          isLoadingUsers={isLoadingUsers}
          handleLoadUsersForDirect={handleLoadUsersForDirect}
          setPendingDirectTarget={setPendingDirectTarget}
          setSelectedContact={setSelectedContact}
          setShowUserList={setShowUserList}
          setMessages={setMessages}
        />
      )}
    </div>
  )
}

// --- Sub-components ---

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/10 p-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
        <MessageCircle className="size-10" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-4">
          Send and receive messages without keeping your phone online
        </p>
      </div>
    </div>
  )
}

interface ChatViewProps {
  contact: Contact
  messages: Message[]
  input: string
  setInput: (v: string) => void
  isLoading: boolean
  handleSubmit: (e: React.FormEvent) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  placeholder: string
  isAdmin: boolean
  onBack?: () => void
  onArchive?: () => void
  onDelete?: () => void
}

function ChatView({
  contact,
  messages,
  input,
  setInput,
  isLoading,
  handleSubmit,
  messagesEndRef,
  inputRef,
  placeholder,
  isAdmin,
  onBack,
  onArchive,
  onDelete,
}: ChatViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-primary px-4 py-4 text-primary-foreground">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              className="text-primary-foreground hover:bg-primary-foreground/10 size-9 md:hidden"
              aria-label="Back to list"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 font-semibold">
            {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{contact.name}</h2>
            <p className="text-xs text-primary-foreground/80">
              {contact.isOnline ? "online" : contact.isTyping ? "typing..." : `last seen ${formatLastActive(contact.lastActive)}`}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 size-9" aria-label="Conversation options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onArchive && (
              <DropdownMenuItem onClick={onArchive} className="gap-2">
                <Archive className="h-4 w-4" />
                Archive chat
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete chat
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-4"
        style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23000\" fill-opacity=\"0.02\"%3E%3Cpath d=\"M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10z\"/%3E%3C/g%3E%3C/svg%3E')",
          backgroundColor: "hsl(var(--muted))",
        }}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted border border-border/60 shadow-sm">
              <MessageCircle className="size-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-2 ">
            {messages.map((message, index) => {
              const showTimestamp =
                index === 0 ||
                new Date(messages[index - 1].timestamp).toDateString() !==
                  new Date(message.timestamp).toDateString()
              const isMe = message.isFromCurrentUser ?? (message.role === "user")
              return (
                <React.Fragment key={message.id}>
                  {showTimestamp && (
                    <div className="flex justify-center my-3">
                      <span className="bg-card/90 border border-border/50 px-3 py-1 rounded-full text-xs text-muted-foreground shadow-sm">
                        {new Date(message.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex gap-2 max-w-[75%]",
                      isMe ? "ml-auto justify-end" : "mr-auto justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "relative rounded-lg px-3 py-2 shadow-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted border border-border/60 rounded-tl-none"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1 justify-end",
                          isMe ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        <span className="text-[10px]">
                          {formatMessageTime(message.timestamp)}
                        </span>
                        {isMe && (
                          <MessageStatusIcon status={message.status} />
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
            {contact.isTyping && (
              <div className="flex gap-2 max-w-[75%] mr-auto">
                <div className="bg-muted border border-border/60 rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-background px-3 py-3">
        {contact.isBroadcast && !isAdmin ? (
          <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
            Replies are disabled for this announcement
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Button type="button" size="icon" variant="ghost" className="size-10 shrink-0 text-muted-foreground hover:text-foreground">
              <Smile className="size-5" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="size-10 shrink-0 text-muted-foreground hover:text-foreground">
              <Paperclip className="size-5" />
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder || `Message ${contact.name}...`}
              className="min-h-10 max-h-32 flex-1 resize-none rounded-full border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            {input.trim() ? (
              <Button type="submit" size="icon" className="size-10 shrink-0 rounded-full bg-primary hover:bg-primary/90">
                <Send className="size-4" />
              </Button>
            ) : (
              <Button type="button" size="icon" variant="ghost" className="size-10 shrink-0 text-muted-foreground hover:text-foreground">
                <Mic className="size-5" />
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

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
        "flex w-full cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-muted/70"
      )}
    >
      <div className="relative">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold shadow-sm">
        {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        {contact.isOnline && (
          <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-primary" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-sm">
            {contact.groupName || contact.name}
          </span>
          {showTime && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatLastActive(contact.lastActive)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {contact.isBroadcast && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              GROUP
            </span>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {contact.isTyping ? (
              <span className="italic text-primary">typing...</span>
            ) : (
              contact.lastMessage
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {contact.unread > 0 && (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
            {contact.unread > 9 ? "9+" : contact.unread}
          </span>
        )}
        {(onArchive || onDelete) && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((prev) => !prev)
              }}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Conversation options"
            >
              <ChevronDown className="size-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                  }}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border bg-popover shadow-lg overflow-hidden">
                  {onArchive && (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        onArchive()
                      }}
                    >
                      Archive chat
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        onDelete()
                      }}
                    >
                      Delete chat
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface ChatListProps {
  title: string
  subtitle?: string
  contacts: Contact[]
  allContacts: Contact[]
  selectedContact: Contact | null
  searchQuery: string
  setSearchQuery: (v: string) => void
  listFilter: "all" | "unread" | "groups" | "archive"
  setListFilter: (v: "all" | "unread" | "groups" | "archive") => void
  isAdmin: boolean
  showUserList: boolean
  setShowUserList: (v: boolean | ((prev: boolean) => boolean)) => void
  panelMode: "broadcast" | "direct"
  setPanelMode: (v: "broadcast" | "direct") => void
  broadcastAudience: "sellers" | "users" | "all"
  setBroadcastAudience: (v: "sellers" | "users" | "all") => void
  broadcastTitle: string
  setBroadcastTitle: (v: string) => void
  broadcastMessage: string
  setBroadcastMessage: (v: string) => void
  isCreatingBroadcast: boolean
  handleCreateBroadcast: (e: React.FormEvent, overrides?: { subject?: string }) => void
  directSubject: string
  setDirectSubject: (v: string) => void
  directSearch: string
  setDirectSearch: (v: string) => void
  filteredDirectUsers: { id: string; name: string; email?: string; role: string }[]
  isLoadingUsers: boolean
  handleLoadUsersForDirect: () => void
  setPendingDirectTarget: (v: { userId: string; name: string } | null) => void
  setSelectedContact: (v: Contact | null) => void
  handleSelectContact: (contact: Contact) => void
  hiddenConversationIds: string[]
  setHiddenConversationIds: (v: string[] | ((prev: string[]) => string[])) => void
  onArchive?: (contact: Contact) => void
  onDelete?: (contact: Contact) => void
}

function ChatList(props: ChatListProps) {
  const {
    title,
    subtitle,
    contacts,
    allContacts: _allContacts,
    selectedContact,
    searchQuery,
    setSearchQuery,
    listFilter,
    setListFilter,
    isAdmin,
    showUserList,
    setShowUserList,
    handleSelectContact,
    onArchive,
    onDelete,
  } = props

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-primary px-4 py-4 text-primary-foreground">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{title}</h2>
          {subtitle && (
            <p className="text-xs text-primary-foreground/80 truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 size-9"
              onClick={() => {
                props.setPanelMode("broadcast")
                setShowUserList((prev) => !prev)
              }}
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 size-9">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="shrink-0 border-b px-3 py-3 bg-muted/30">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 rounded-full border-none bg-background pl-9 shadow-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b px-3 py-2 text-xs">
        {(["all", "unread", "groups", "archive"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setListFilter(filter)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 capitalize font-medium transition-colors",
              listFilter === filter
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No conversations found
          </p>
        ) : (
          contacts.map((contact) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              isSelected={selectedContact?.id === contact.id}
              onClick={() => handleSelectContact(contact)}
              onArchive={onArchive ? () => onArchive(contact) : undefined}
              onDelete={onDelete && isAdmin ? () => onDelete(contact) : undefined}
              showTime
            />
          ))
        )}
      </div>
    </div>
  )
}

interface NewMessageDrawerProps {
  onClose: () => void
  panelMode: "broadcast" | "direct"
  setPanelMode: (v: "broadcast" | "direct") => void
  broadcastAudience: "sellers" | "users" | "all"
  setBroadcastAudience: (v: "sellers" | "users" | "all") => void
  broadcastTitle: string
  setBroadcastTitle: (v: string) => void
  broadcastMessage: string
  setBroadcastMessage: (v: string) => void
  isCreatingBroadcast: boolean
  handleCreateBroadcast: (e: React.FormEvent, overrides?: { subject?: string }) => void
  directSubject: string
  setDirectSubject: (v: string) => void
  directSearch: string
  setDirectSearch: (v: string) => void
  directUsers: { id: string; name: string; email?: string; role: string }[]
  filteredDirectUsers: { id: string; name: string; email?: string; role: string }[]
  isLoadingUsers: boolean
  handleLoadUsersForDirect: () => void
  setPendingDirectTarget: (v: { userId: string; name: string } | null) => void
  setSelectedContact: (v: Contact | null) => void
  setShowUserList: (v: boolean | ((prev: boolean) => boolean)) => void
  setMessages: (v: Message[] | ((prev: Message[]) => Message[])) => void
}

type DrawerView = "list" | "new-group"

function NewMessageDrawer(props: NewMessageDrawerProps) {
  const {
    onClose,
    broadcastAudience,
    setBroadcastAudience,
    broadcastTitle,
    setBroadcastTitle,
    broadcastMessage,
    setBroadcastMessage,
    isCreatingBroadcast,
    handleCreateBroadcast,
    directSearch,
    setDirectSearch,
    directUsers,
    isLoadingUsers,
    handleLoadUsersForDirect,
    setPendingDirectTarget,
    setSelectedContact,
    setShowUserList,
    setMessages,
  } = props

  const [drawerView, setDrawerView] = React.useState<DrawerView>("list")
  const [groupName, setGroupName] = React.useState("")

  React.useEffect(() => {
    void handleLoadUsersForDirect()
  }, [handleLoadUsersForDirect])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (drawerView === "new-group") setDrawerView("list")
        else onClose()
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onClose, drawerView])

  const searchTerm = directSearch.toLowerCase().trim()
  const sellers = directUsers.filter((u) => String(u.role).toLowerCase() === "seller")
  const users = directUsers.filter((u) => String(u.role).toLowerCase() !== "seller")
  const filterBySearch = (list: typeof directUsers) =>
    searchTerm
      ? list.filter(
          (u) =>
            u.name.toLowerCase().includes(searchTerm) ||
            (u.email ?? "").toLowerCase().includes(searchTerm)
        )
      : list
  const filteredSellers = filterBySearch(sellers)
  const filteredUsers = filterBySearch(users)

  const handleSelectUser = (u: (typeof directUsers)[0]) => {
    setPendingDirectTarget({ userId: u.id, name: u.name })
    setSelectedContact({
      id: u.id,
      name: u.name,
      lastMessage: "",
      lastActive: new Date(),
      unread: 0,
      directUserId: u.id,
    })
    setMessages([])
    setShowUserList(false)
  }

  const handleNewGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject =
      groupName.trim() ||
      (broadcastAudience === "sellers"
        ? "All sellers"
        : broadcastAudience === "users"
          ? "All users"
          : "All users & sellers")
    handleCreateBroadcast(e, { subject })
    setGroupName("")
    setDrawerView("list")
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <div
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col border-r bg-background shadow-xl"
        role="dialog"
        aria-label="New chat"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => (drawerView === "new-group" ? setDrawerView("list") : onClose())}
            aria-label={drawerView === "new-group" ? "Back" : "Close"}
          >
            {drawerView === "new-group" ? (
              <ArrowLeft className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </Button>
          <h2 className="flex-1 text-lg font-semibold">
            {drawerView === "new-group" ? "New group" : "New chat"}
          </h2>
          <Button size="icon" variant="ghost" className="text-muted-foreground" aria-label="More options">
            <LayoutGrid className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {drawerView === "list" ? (
            <>
              {/* Search */}
              <div className="border-b px-3 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name or number"
                    value={directSearch}
                    onChange={(e) => setDirectSearch(e.target.value)}
                    className="h-10 rounded-lg pl-9"
                  />
                </div>
              </div>

              {/* New group */}
              <button
                type="button"
                onClick={() => {
                  setDrawerView("new-group")
                  setGroupName("")
                  setBroadcastAudience("sellers")
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <span className="font-medium">New group</span>
              </button>

              {/* Sellers */}
              <div className="border-t px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 py-1">
                  Sellers
                </h3>
                {isLoadingUsers ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">Loading...</p>
                ) : filteredSellers.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">No sellers found</p>
                ) : (
                  <ul className="space-y-0">
                    {filteredSellers.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectUser(u)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-muted/60 transition-colors"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            {(u.name || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            {u.email && (
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Users */}
              <div className="border-t px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 py-1">
                  Users
                </h3>
                {isLoadingUsers ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">Loading...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">No users found</p>
                ) : (
                  <ul className="space-y-0">
                    {filteredUsers.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectUser(u)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-muted/60 transition-colors"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
                            {(u.name || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            {u.email && (
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            /* New group view: group name + 3 audience options + message */
            <form onSubmit={handleNewGroupSubmit} className="flex flex-col px-4 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Group name</label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                    className="mt-1 h-10"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Send to</p>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        { value: "sellers" as const, label: "All sellers" },
                        { value: "users" as const, label: "All users" },
                        { value: "all" as const, label: "All sellers & users" },
                      ]
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBroadcastAudience(value)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          broadcastAudience === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <Users className="h-5 w-5 shrink-0" />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder="Write your message..."
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="mt-4 h-10 w-full bg-primary hover:bg-primary/90"
                disabled={isCreatingBroadcast || !broadcastMessage.trim()}
              >
                {isCreatingBroadcast ? "Sending..." : "Send"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

function NewMessagePanel(props: ChatListProps) {
  const {
    panelMode,
    setPanelMode,
    broadcastAudience,
    setBroadcastAudience,
    broadcastTitle,
    setBroadcastTitle,
    broadcastMessage,
    setBroadcastMessage,
    isCreatingBroadcast,
    handleCreateBroadcast,
    directSubject,
    setDirectSubject,
    directSearch,
    setDirectSearch,
    filteredDirectUsers,
    isLoadingUsers,
    handleLoadUsersForDirect,
    setPendingDirectTarget,
    setSelectedContact,
    setShowUserList,
  } = props

  return (
    <div className="border-b bg-muted/20 px-3 py-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">New message</p>
        <div className="inline-flex rounded-full bg-background p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setPanelMode("broadcast")}
            className={cn(
              "rounded-full px-3 py-1.5 font-medium transition-colors",
              panelMode === "broadcast" && "bg-primary text-primary-foreground shadow-sm"
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
              "rounded-full px-3 py-1.5 font-medium transition-colors",
              panelMode === "direct" && "bg-primary text-primary-foreground shadow-sm"            )}
          >
            Direct
          </button>
        </div>
      </div>

      {panelMode === "broadcast" ? (
        <form onSubmit={handleCreateBroadcast} className="space-y-2">
          <div className="flex gap-1 rounded-full bg-background p-1 text-xs">
            {(["sellers", "users", "all"] as const).map((audience) => (
              <button
                key={audience}
                type="button"
                onClick={() => setBroadcastAudience(audience)}
                className={cn(
                  "flex-1 rounded-full px-2 py-1.5 capitalize font-medium transition-colors",
                  broadcastAudience === audience && "bg-primary text-primary-foreground"
                )}
              >
                {audience}
              </button>
            ))}
          </div>
          <Input
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            placeholder="Announcement title"
            className="h-9"
          />
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Write your announcement..."
          />
          <Button
            type="submit"
            className="h-9 w-full bg-primary hover:bg-primary/90"
            disabled={isCreatingBroadcast}
          >
            {isCreatingBroadcast ? "Sending..." : "Send broadcast"}
          </Button>
        </form>
      ) : (
        <div className="space-y-2">
          <Input
            value={directSubject}
            onChange={(e) => setDirectSubject(e.target.value)}
            placeholder="Subject (optional)"
            className="h-9"
          />
          <Input
            value={directSearch}
            onChange={(e) => setDirectSearch(e.target.value)}
            placeholder="Search users..."
            className="h-9"
          />
          <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
            {isLoadingUsers ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">Loading...</p>
            ) : filteredDirectUsers.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No users found</p>
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
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <span className="text-sm truncate">
                    {u.name}
                    {u.email && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {u.email}
                      </span>
                    )}
                  </span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase font-medium">
                    {u.role}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

