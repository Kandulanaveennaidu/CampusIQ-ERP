"use client";

/**
 * RealtimeNotifications — displays toast notifications for real-time
 * WebSocket events. Renders a slide-in panel from the top-right corner
 * when new events arrive.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useSocket,
  RealtimeNotification,
} from "@/components/providers/socket-provider";
import {
  UserPlus,
  UserMinus,
  Edit,
  CheckCircle,
  Bell,
  BookOpen,
  DollarSign,
  Calendar,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  GraduationCap,
  Settings,
  X,
} from "lucide-react";

// ── Icon mapping by module ───────────────────────────────────────────

function getNotificationIcon(type: string) {
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
  if (type.includes("delete")) return <UserMinus className="h-4 w-4" />;
  if (type.includes("update") || type.includes("edit"))
    return <Edit className="h-4 w-4" />;
  if (type.includes("setting") || type.includes("role"))
    return <Settings className="h-4 w-4" />;
  if (type.includes("approved") || type.includes("created"))
    return <CheckCircle className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
}

function getNotificationColor(type: string): string {
  if (type.includes("delete")) return "bg-red-500";
  if (type.includes("emergency")) return "bg-red-600";
  if (type.includes("created") || type.includes("approved"))
    return "bg-green-500";
  if (type.includes("updated") || type.includes("edit")) return "bg-blue-500";
  if (type.includes("fee") || type.includes("salary")) return "bg-amber-500";
  if (type.includes("attendance")) return "bg-purple-500";
  if (type.includes("message") || type.includes("circular"))
    return "bg-indigo-500";
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
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Toast notification component ─────────────────────────────────────

function NotificationToast({
  notification,
  onDismiss,
  onClick,
}: {
  notification: RealtimeNotification;
  onDismiss: () => void;
  onClick: () => void;
}) {
  const color = getNotificationColor(notification.type);

  return (
    <div
      className="animate__animated animate__slideInRight w-80 sm:w-96 cursor-pointer"
      style={{ animationDuration: "0.3s" }}
    >
      <div
        onClick={onClick}
        className="relative overflow-hidden rounded-lg border border-border bg-background shadow-lg transition-all hover:shadow-xl"
      >
        {/* Color bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`} />

        <div className="flex items-start gap-3 p-3 pl-4">
          {/* Icon */}
          <div
            className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${color} text-white`}
          >
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {notification.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {notification.message}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{notification.actor?.name}</span>
              <span>·</span>
              <span>{timeAgo(notification.timestamp)}</span>
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="mt-0.5 flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function RealtimeNotifications() {
  const { notifications, markRead } = useSocket();
  const router = useRouter();
  const prevCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Only show unread notifications, max 3 toasts at a time
  const unreadNotifications = notifications.filter((n) => !n.read).slice(0, 3);

  // Play notification sound when new notifications arrive
  useEffect(() => {
    const currentUnread = notifications.filter((n) => !n.read).length;
    if (currentUnread > prevCountRef.current && prevCountRef.current >= 0) {
      // Play sound
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(
            "data:audio/wav;base64,UklGRl9vT19teleCAFBBTUEAABAAEARVVVQAAABBESAgDgAZADABhAAQB//6AgAABgDAAAARiVSFQyJOGAAMoNqQxJQA==",
          );
          audioRef.current.volume = 0.3;
        }
        audioRef.current.play().catch(() => {});
      } catch {
        // Silent
      }
    }
    prevCountRef.current = currentUnread;
  }, [notifications]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (unreadNotifications.length === 0) return;

    const timers = unreadNotifications.map((n) =>
      setTimeout(() => markRead(n.id), 6000),
    );

    return () => timers.forEach(clearTimeout);
  }, [unreadNotifications, markRead]);

  if (unreadNotifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
      {unreadNotifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => markRead(notification.id)}
          onClick={() => {
            markRead(notification.id);
            if (notification.actionUrl) {
              router.push(notification.actionUrl);
            }
          }}
        />
      ))}
    </div>
  );
}
