"use client";

/**
 * NotificationDropdown — Bell icon with popover dropdown showing
 * recent notifications. Click any notification → redirects to its service.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  UserPlus,
  GraduationCap,
  ClipboardList,
  DollarSign,
  BookOpen,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Settings,
  Edit,
  Trash2,
  Package,
  FileText,
  Bus,
  Building2,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSocket,
  type RealtimeNotification,
} from "@/components/providers/socket-provider";

// ── Notification icon mapping ────────────────────────────────────────

function getIcon(type: string) {
  if (type.includes("student")) return <UserPlus className="h-4 w-4" />;
  if (type.includes("teacher")) return <GraduationCap className="h-4 w-4" />;
  if (type.includes("attendance")) return <ClipboardList className="h-4 w-4" />;
  if (
    type.includes("fee") ||
    type.includes("salary") ||
    type.includes("payment")
  )
    return <DollarSign className="h-4 w-4" />;
  if (type.includes("exam") || type.includes("assignment"))
    return <BookOpen className="h-4 w-4" />;
  if (
    type.includes("event") ||
    type.includes("holiday") ||
    type.includes("calendar")
  )
    return <Calendar className="h-4 w-4" />;
  if (
    type.includes("message") ||
    type.includes("circular") ||
    type.includes("diary")
  )
    return <MessageSquare className="h-4 w-4" />;
  if (type.includes("emergency")) return <AlertTriangle className="h-4 w-4" />;
  if (type.includes("delete")) return <Trash2 className="h-4 w-4" />;
  if (type.includes("update") || type.includes("edit"))
    return <Edit className="h-4 w-4" />;
  if (type.includes("setting") || type.includes("role"))
    return <Settings className="h-4 w-4" />;
  if (type.includes("transport")) return <Bus className="h-4 w-4" />;
  if (type.includes("hostel") || type.includes("room"))
    return <Building2 className="h-4 w-4" />;
  if (type.includes("library") || type.includes("document"))
    return <FileText className="h-4 w-4" />;
  if (type.includes("inventory")) return <Package className="h-4 w-4" />;
  if (type.includes("notification") || type.includes("broadcast"))
    return <Megaphone className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
}

function getColor(type: string): string {
  if (type.includes("delete")) return "bg-red-500";
  if (type.includes("emergency")) return "bg-red-600";
  if (
    type.includes("created") ||
    type.includes("approved") ||
    type.includes("paid")
  )
    return "bg-green-500";
  if (type.includes("updated") || type.includes("edit")) return "bg-blue-500";
  if (type.includes("fee") || type.includes("salary")) return "bg-amber-500";
  if (type.includes("attendance")) return "bg-purple-500";
  if (type.includes("message") || type.includes("circular"))
    return "bg-indigo-500";
  if (type.includes("leave")) return "bg-orange-500";
  return "bg-blue-500";
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ── DB Notification type (from API) ──────────────────────────────────

interface DBNotification {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  target_role: string;
  status: "read" | "unread";
  module?: string;
  entityId?: string;
  actionUrl?: string;
  actorName?: string;
  actorRole?: string;
  created_at: string;
}

// ── Component ────────────────────────────────────────────────────────

export function NotificationDropdown() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const {
    notifications: realtimeNotifs,
    unreadCount: socketUnreadCount,
    isConnected,
    markRead: socketMarkRead,
    markAllRead: socketMarkAllRead,
  } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [dbNotifications, setDbNotifications] = useState<DBNotification[]>([]);
  const [dbUnreadCount, setDbUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Fetch DB notifications ─────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setDbNotifications(data.data || []);
        setDbUnreadCount(data.unread_count || 0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchNotifications();
    // Fallback polling every 2 minutes
    const interval = setInterval(() => {
      if (!isConnected) fetchNotifications();
    }, 120000);
    return () => clearInterval(interval);
  }, [authStatus, fetchNotifications, isConnected]);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // ── Click outside to close ─────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // ── Combined unread count ──────────────────────────────────────────

  const totalUnread = dbUnreadCount + socketUnreadCount;

  // ── Merge realtime + DB notifications (deduplicate) ────────────────

  const mergedNotifications = (() => {
    // Convert realtime notifications to a common format
    const realtimeItems = realtimeNotifs.map((n: RealtimeNotification) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl || "",
      actorName: n.actor?.name || "System",
      timestamp: n.timestamp,
      isRead: n.read,
      source: "realtime" as const,
    }));

    // Convert DB notifications
    const dbItems = dbNotifications.map((n) => ({
      id: n.notification_id,
      type: n.type,
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl || "",
      actorName: n.actorName || "System",
      timestamp: n.created_at,
      isRead: n.status === "read",
      source: "db" as const,
    }));

    // Merge: realtime first, then DB, remove title duplicates
    const seen = new Set<string>();
    const merged = [...realtimeItems, ...dbItems].filter((item) => {
      const key = `${item.title}-${item.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by timestamp descending
    merged.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return merged.slice(0, 20);
  })();

  // ── Mark all read ──────────────────────────────────────────────────

  const handleMarkAllRead = async () => {
    // Mark socket notifications read
    socketMarkAllRead();

    // Mark DB notifications read
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setDbUnreadCount(0);
      setDbNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "read" as const })),
      );
    } catch {
      // silently fail
    }
  };

  // ── Click notification ─────────────────────────────────────────────

  const handleNotificationClick = async (
    item: (typeof mergedNotifications)[0],
  ) => {
    // Mark as read
    if (item.source === "realtime") {
      socketMarkRead(item.id);
    } else {
      try {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notification_id: item.id }),
        });
        setDbNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === item.id
              ? { ...n, status: "read" as const }
              : n,
          ),
        );
        setDbUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently fail
      }
    }

    setIsOpen(false);

    // Navigate to action URL
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        title={isConnected ? "Live notifications" : "Notifications"}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
        {/* Connection indicator dot */}
        <span
          className={`absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-background ${
            isConnected ? "bg-green-500" : "bg-gray-400"
          }`}
          title={isConnected ? "Connected (live)" : "Offline"}
        />
      </Button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] overflow-hidden rounded-xl border border-border bg-background shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Notifications
              </h3>
              {totalUnread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {totalUnread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[24rem] overflow-y-auto">
            {loading && mergedNotifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : mergedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              mergedNotifications.map((item) => {
                const color = getColor(item.type);
                const icon = getIcon(item.type);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex items-start gap-3 border-b border-border/50 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      !item.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${color} text-white`}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm truncate ${
                            !item.isRead
                              ? "font-semibold text-foreground"
                              : "text-foreground/80"
                          }`}
                        >
                          {item.title}
                        </p>
                        {!item.isRead && (
                          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {item.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{item.actorName}</span>
                        <span>·</span>
                        <span>{timeAgo(item.timestamp)}</span>
                        {item.actionUrl && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5 text-primary">
                              <ExternalLink className="h-2.5 w-2.5" />
                              View
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-primary hover:text-primary"
              onClick={() => {
                setIsOpen(false);
                router.push("/notifications");
              }}
            >
              View all notifications
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
