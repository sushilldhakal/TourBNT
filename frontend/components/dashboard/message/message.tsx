"use client"

import * as React from "react"
import { Send, User, Bot, Plus, Search, X, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable"

import { cn } from "@/lib/utils"

interface Message {
    id: string
    content: string
    role: "user" | "assistant"
    timestamp: Date
}

interface UserContact {
    id: string
    name: string
    avatar?: string
    lastMessage: string
    lastActive: Date
    unread: number
}

// Mock users data
const usersData: UserContact[] = [
    {
        id: "1",
        name: "Alice Johnson",
        lastMessage: "Thanks for your help!",
        lastActive: new Date(Date.now() - 1000 * 60 * 5),
        unread: 2,
    },
    {
        id: "2",
        name: "Bob Smith",
        lastMessage: "Can we schedule a call?",
        lastActive: new Date(Date.now() - 1000 * 60 * 30),
        unread: 0,
    },
    {
        id: "3",
        name: "Carol Williams",
        lastMessage: "The project looks great!",
        lastActive: new Date(Date.now() - 1000 * 60 * 60),
        unread: 1,
    },
    {
        id: "4",
        name: "David Brown",
        lastMessage: "Let me check and get back to you",
        lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2),
        unread: 0,
    },
    {
        id: "5",
        name: "Emma Davis",
        lastMessage: "Perfect, see you tomorrow!",
        lastActive: new Date(Date.now() - 1000 * 60 * 60 * 5),
        unread: 0,
    },
]

// Mock conversations per user
const conversationsData: Record<string, Message[]> = {
    "1": [
        {
            id: "1-1",
            content: "Hi Alice! How can I help you today?",
            role: "assistant",
            timestamp: new Date(Date.now() - 1000 * 60 * 10),
        },
        {
            id: "1-2",
            content: "I need help with my account settings",
            role: "user",
            timestamp: new Date(Date.now() - 1000 * 60 * 8),
        },
        {
            id: "1-3",
            content: "Sure, I can help you with that. What would you like to change?",
            role: "assistant",
            timestamp: new Date(Date.now() - 1000 * 60 * 6),
        },
        {
            id: "1-4",
            content: "Thanks for your help!",
            role: "user",
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
        },
    ],
    "2": [
        {
            id: "2-1",
            content: "Hello Bob, what can I do for you?",
            role: "assistant",
            timestamp: new Date(Date.now() - 1000 * 60 * 45),
        },
        {
            id: "2-2",
            content: "Can we schedule a call?",
            role: "user",
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
        },
    ],
    "3": [
        {
            id: "3-1",
            content: "Hi Carol! I saw you submitted a new project.",
            role: "assistant",
            timestamp: new Date(Date.now() - 1000 * 60 * 90),
        },
        {
            id: "3-2",
            content: "Yes! I just finished it. What do you think?",
            role: "user",
            timestamp: new Date(Date.now() - 1000 * 60 * 75),
        },
        {
            id: "3-3",
            content: "The project looks great!",
            role: "user",
            timestamp: new Date(Date.now() - 1000 * 60 * 60),
        },
    ],
    "4": [
        {
            id: "4-1",
            content: "David, do you have the report ready?",
            role: "assistant",
            timestamp: new Date(Date.now() - 1000 * 60 * 150),
        },
        {
            id: "4-2",
            content: "Let me check and get back to you",
            role: "user",
            timestamp: new Date(Date.now() - 1000 * 60 * 120),
        },
    ],
    "5": [
        {
            id: "5-1",
            content: "Emma, reminder about our meeting tomorrow",
            role: "assistant",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
        },
        {
            id: "5-2",
            content: "Perfect, see you tomorrow!",
            role: "user",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
        },
    ],
}

const initialMessages: Message[] = [
    {
        id: "1-1",
        content: "Hi Alice! How can I help you today?",
        role: "assistant",
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
        id: "1-2",
        content: "I need help with my account settings",
        role: "user",
        timestamp: new Date(Date.now() - 1000 * 60 * 8),
    },
    {
        id: "1-3",
        content: "Sure, I can help you with that. What would you like to change?",
        role: "assistant",
        timestamp: new Date(Date.now() - 1000 * 60 * 6),
    },
    {
        id: "1-4",
        content: "Thanks for your help!",
        role: "user",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
]

export default function ChatPage() {
    const [selectedUser, setSelectedUser] = React.useState<UserContact | null>(null)
    const [messages, setMessages] = React.useState<Message[]>([])
    const [input, setInput] = React.useState("")
    const [showUserList, setShowUserList] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const messagesEndRef = React.useRef<HTMLDivElement>(null)

    const filteredUsers = usersData.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    React.useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSelectUser = (user: UserContact) => {
        setSelectedUser(user)
        setMessages(conversationsData[user.id] || [])
        setShowUserList(false)
        setSearchQuery("")
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || !selectedUser) return

        const userMessage: Message = {
            id: Date.now().toString(),
            content: input,
            role: "user",
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")

        // Simulate assistant response
        setTimeout(() => {
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content:
                    "Thank you for your message. I'm here to help with any questions you might have!",
                role: "assistant",
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, assistantMessage])
        }, 1000)
    }

    return (
        <div className="container mx-auto  max-w-7xl flex flex-col h-full">

            <div className="flex flex-1 min-h-0 mt-6">
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    {/* Left Panel - User List & Chat Input */}
                    <ResizablePanel defaultSize={30} minSize={20} maxSize={50} className="hidden md:flex">
                        <div className="flex w-full flex-col bg-muted/30">
                            {/* Header with Plus Button */}
                            <div className="flex items-center justify-between border-b p-4">
                                <div>
                                    <h2 className="text-lg font-semibold">Messages</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedUser ? `Chat with ${selectedUser.name}` : "Select a conversation"}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-9 bg-transparent"
                                    onClick={() => setShowUserList(!showUserList)}
                                >
                                    {showUserList ? <X className="size-4" /> : <Plus className="size-4" />}
                                </Button>
                            </div>

                            {/* User List Panel (shown when plus is clicked) */}
                            {showUserList && (
                                <div className="flex flex-col border-b">
                                    <div className="p-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder="Search users..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {filteredUsers.length === 0 ? (
                                            <p className="p-4 text-center text-sm text-muted-foreground">
                                                No users found
                                            </p>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => handleSelectUser(user)}
                                                    className={cn(
                                                        "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted",
                                                        selectedUser?.id === user.id && "bg-muted"
                                                    )}
                                                >
                                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                        <span className="text-sm font-medium">
                                                            {user.name.split(" ").map((n) => n[0]).join("")}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">{user.name}</span>
                                                            {user.unread > 0 && (
                                                                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                                                    {user.unread}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="truncate text-sm text-muted-foreground">
                                                            {user.lastMessage}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Recent Conversations List */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-2">
                                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                        Recent Conversations
                                    </p>
                                </div>
                                {usersData.map((user) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleSelectUser(user)}
                                        className={cn(
                                            "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted",
                                            selectedUser?.id === user.id && "bg-accent"
                                        )}
                                    >
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                            <span className="text-sm font-medium">
                                                {user.name.split(" ").map((n) => n[0]).join("")}
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{user.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {user.lastActive.toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                            <p className="truncate text-sm text-muted-foreground">
                                                {user.lastMessage}
                                            </p>
                                        </div>
                                        {user.unread > 0 && (
                                            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                                {user.unread}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>


                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Messages Panel - Right side */}
                    <ResizablePanel defaultSize={70} minSize={50} className="flex flex-col">
                        {selectedUser ? (
                            <>
                                <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <span className="text-sm font-medium">
                                            {selectedUser.name.split(" ").map((n) => n[0]).join("")}
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="font-semibold">{selectedUser.name}</h2>
                                        <p className="text-sm text-muted-foreground">
                                            {messages.length} messages
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
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
                                                        <User className="size-4" />
                                                    ) : (
                                                        <Bot className="size-4" />
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
                                                    <p className="text-sm">{message.content}</p>
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
                                </div>
                                {/* Message Input at Bottom of Conversation */}
                                <div className="border-t bg-background p-4">
                                    <form onSubmit={handleSubmit} className="flex gap-3">
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={`Message ${selectedUser.name}...`}
                                            className="min-h-11 max-h-32 flex-1 resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            rows={1}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSubmit(e)
                                                }
                                            }}
                                        />
                                        <Button type="submit" size="icon" className="size-11 shrink-0">
                                            <Send className="size-4" />
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                                <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                                    <User className="size-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">No conversation selected</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Click the + button to search and select a user to start chatting
                                    </p>
                                </div>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
}
