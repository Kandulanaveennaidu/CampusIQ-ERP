"use client";

/**
 * Socket.IO React Provider — provides real-time WebSocket
 * connectivity across the dashboard.
 *
 * Automatically connects when user is authenticated,
 * joins the school room, and exposes socket + events via context.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

// ── Types ────────────────────────────────────────────────────────────

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  module: string;
  entityId?: string;
  actionUrl?: string;
  targetRole?: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
  metadata?: Record<string, unknown>;
  /** Client-side read state */
  read: boolean;
}

interface SocketContextValue {
  /** The Socket.IO socket instance (null if not connected) */
  socket: Socket | null;
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Number of unread real-time notifications */
  unreadCount: number;
  /** Recent notifications received via WebSocket */
  notifications: RealtimeNotification[];
  /** Mark a notification as read */
  markRead: (id: string) => void;
  /** Mark all notifications as read */
  markAllRead: () => void;
  /** Clear all client-side notifications */
  clearAll: () => void;
  /** Connection status text */
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  unreadCount: 0,
  notifications: [],
  markRead: () => {},
  markAllRead: () => {},
  clearAll: () => {},
  connectionStatus: "disconnected",
});

// ── Provider ─────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS = 50;

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<SocketContextValue["connectionStatus"]>("disconnected");
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    [],
  );
  const socketRef = useRef<Socket | null>(null);

  // Connect when authenticated
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    const schoolId = session.user.school_id;
    const userId = session.user.id;
    const userName = session.user.name;
    const userRole = session.user.role;

    if (!schoolId || !userId) return;

    // Prevent duplicate connections
    if (socketRef.current?.connected) return;

    setConnectionStatus("connecting");

    const newSocket = io({
      path: "/api/socketio",
      auth: {
        schoolId,
        userId,
        userName,
        userRole,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      autoConnect: true,
    });

    // ── Connection lifecycle ────────────────────────────────────
    newSocket.on("connect", () => {
      console.log("[Socket.IO] Connected:", newSocket.id);
      setIsConnected(true);
      setConnectionStatus("connected");
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[Socket.IO] Disconnected:", reason);
      setIsConnected(false);
      setConnectionStatus("disconnected");
    });

    newSocket.on("connect_error", (error) => {
      console.warn("[Socket.IO] Connection error:", error.message);
      setConnectionStatus("error");
    });

    newSocket.on("reconnect", (attempt) => {
      console.log("[Socket.IO] Reconnected after", attempt, "attempts");
      setIsConnected(true);
      setConnectionStatus("connected");
    });

    // ── Incoming activity/notification events ────────────────────
    newSocket.on(
      "activity:new",
      (payload: RealtimeNotification & { type: string }) => {
        // Don't show your own actions as notifications
        if (payload.actor?.id === userId) return;

        const notification: RealtimeNotification = {
          id: `${payload.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          module: payload.module,
          entityId: payload.entityId,
          actionUrl: payload.actionUrl,
          targetRole: payload.targetRole,
          actor: payload.actor,
          timestamp: payload.timestamp || new Date().toISOString(),
          metadata: payload.metadata,
          read: false,
        };

        // Role filtering: skip if targeted to a different role
        if (
          notification.targetRole &&
          notification.targetRole !== "all" &&
          notification.targetRole !== userRole
        ) {
          return;
        }

        setNotifications((prev) =>
          [notification, ...prev].slice(0, MAX_NOTIFICATIONS),
        );
      },
    );

    // Handle notification read sync across tabs
    newSocket.on("notification:read", (data: { id: string }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === data.id ? { ...n, read: true } : n)),
      );
    });

    newSocket.on("notification:read_all", () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus("disconnected");
    };
  }, [status, session?.user?.school_id, session?.user?.id]);

  // ── Actions ────────────────────────────────────────────────────────

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    socketRef.current?.emit("notification:read", { id });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    socketRef.current?.emit("notification:read_all");
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: SocketContextValue = {
    socket,
    isConnected,
    unreadCount,
    notifications,
    markRead,
    markAllRead,
    clearAll,
    connectionStatus,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Access real-time socket context.
 *
 * @example
 * ```tsx
 * const { isConnected, notifications, unreadCount, markRead } = useSocket();
 * ```
 */
export function useSocket() {
  return useContext(SocketContext);
}
