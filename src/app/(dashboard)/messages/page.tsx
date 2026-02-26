"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showSuccess, showError } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  ArrowLeft,
  Users,
  User,
  Circle,
} from "lucide-react";

interface Participant {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ConversationItem {
  _id: string;
  participants: Participant[];
  type: "direct" | "group";
  name: string;
  lastMessage: {
    content: string;
    sender: { _id: string; name: string } | null;
    timestamp: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface MessageItem {
  _id: string;
  sender: { _id: string; name: string; email: string; role: string };
  content: string;
  type: string;
  createdAt: string;
}

interface UserSearchResult {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function MessagesPage() {
  const { data: sessionData } = useSession();
  const { canAdd } = usePermissions("messages");
  const currentUserId = sessionData?.user?.id || "";

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<ConversationItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch {
      // Silent fail for polling
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(
    async (convoId: string, isPolling = false) => {
      try {
        if (!isPolling) setMessagesLoading(true);
        const res = await fetch(`/api/messages/${convoId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.data || []);
          if (!isPolling) {
            setTimeout(scrollToBottom, 100);
          }
        }
      } catch {
        if (!isPolling) showError("Error", "Failed to load messages");
      } finally {
        setMessagesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Polling
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(() => {
      fetchConversations();
      if (selectedConvo) {
        fetchMessages(selectedConvo._id, true);
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedConvo, fetchConversations, fetchMessages]);

  const selectConversation = (convo: ConversationItem) => {
    setSelectedConvo(convo);
    setMobileShowChat(true);
    fetchMessages(convo._id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConvo || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${selectedConvo._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        await fetchMessages(selectedConvo._id);
        await fetchConversations();
        setTimeout(scrollToBottom, 100);
      } else {
        const data = await res.json();
        showError("Error", data.error || "Failed to send");
      }
    } catch {
      showError("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const searchUsers = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const users = (data.data || data.users || []).filter(
          (u: UserSearchResult) => u._id !== currentUserId,
        );
        setSearchResults(users.slice(0, 10));
      }
    } catch {
      // Silent
    } finally {
      setSearching(false);
    }
  };

  const startConversation = async (userId: string) => {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: [userId] }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowNewChat(false);
        setUserSearch("");
        setSearchResults([]);
        await fetchConversations();
        selectConversation(data.data);
      } else {
        const data = await res.json();
        showError("Error", data.error);
      }
    } catch {
      showError("Error", "Failed to create conversation");
    }
  };

  const getConversationName = (convo: ConversationItem) => {
    if (convo.name) return convo.name;
    if (convo.type === "group") return "Group Chat";
    const other = convo.participants?.find((p) => p._id !== currentUserId);
    return other?.name || "Unknown";
  };

  const getConversationAvatar = (convo: ConversationItem) => {
    if (convo.type === "group") {
      return (
        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
      );
    }
    const other = convo.participants?.find((p) => p._id !== currentUserId);
    const initial = (other?.name || "?")[0].toUpperCase();
    return (
      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
          {initial}
        </span>
      </div>
    );
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Chat with teachers, staff & parents
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowNewChat(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-220px)] min-h-[500px]">
          {/* Conversation List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r dark:border-gray-700 flex flex-col ${mobileShowChat ? "hidden md:flex" : "flex"}`}
          >
            <div className="p-3 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9"
                  onChange={(e) => {
                    // Client-side filter
                    const q = e.target.value.toLowerCase();
                    if (!q) {
                      fetchConversations();
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-6">
                  <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">
                    Start a new chat to begin messaging
                  </p>
                </div>
              ) : (
                conversations.map((convo) => (
                  <div
                    key={convo._id}
                    className={`flex items-center gap-3 p-3 cursor-pointer border-b dark:border-gray-700 transition-colors ${
                      selectedConvo?._id === convo._id
                        ? "bg-blue-50 dark:bg-blue-950/30"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => selectConversation(convo)}
                  >
                    {getConversationAvatar(convo)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate text-foreground">
                          {getConversationName(convo)}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                          {formatTime(
                            convo.lastMessage?.timestamp || convo.updatedAt,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {convo.lastMessage?.content || "No messages yet"}
                        </p>
                        {convo.unreadCount > 0 && (
                          <Badge className="bg-blue-600 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full ml-2 shrink-0">
                            {convo.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message View */}
          <div
            className={`flex-1 flex flex-col ${!mobileShowChat ? "hidden md:flex" : "flex"}`}
          >
            {selectedConvo ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setMobileShowChat(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {getConversationAvatar(selectedConvo)}
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      {getConversationName(selectedConvo)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedConvo.participants?.length || 0} participants
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                      <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs">Send the first message!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender?._id === currentUserId;
                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`flex gap-2 max-w-[75%] ${isOwn ? "flex-row-reverse" : ""}`}
                          >
                            {!isOwn && (
                              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-1">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {(msg.sender?.name || "?")[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              {!isOwn && (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5 ml-1">
                                  {msg.sender?.name}
                                </p>
                              )}
                              <div
                                className={`px-3 py-2 rounded-2xl text-sm ${
                                  isOwn
                                    ? "bg-blue-600 text-white rounded-br-md"
                                    : "bg-white dark:bg-gray-800 text-foreground border dark:border-gray-700 rounded-bl-md"
                                }`}
                              >
                                {msg.content}
                              </div>
                              <p
                                className={`text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ${isOwn ? "text-right mr-1" : "ml-1"}`}
                              >
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-900">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  Select a conversation
                </h3>
                <p className="text-sm mt-1">
                  Choose from the list or start a new chat
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search Users</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={userSearch}
                  onChange={(e) => searchUsers(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {searching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => startConversation(user._id)}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {user.role}
                    </Badge>
                  </div>
                ))
              ) : userSearch.length >= 2 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  No users found
                </p>
              ) : (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
                  Type at least 2 characters to search
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
