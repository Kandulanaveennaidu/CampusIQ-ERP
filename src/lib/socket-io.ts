/**
 * Server-side Socket.IO utilities.
 *
 * Provides a singleton accessor for the Socket.IO server instance
 * and helper functions to emit real-time events from API routes.
 */

import { Server as SocketIOServer } from "socket.io";

// Extend global to hold the Socket.IO instance set by server.js
declare global {
  // eslint-disable-next-line no-var
  var __io: SocketIOServer | undefined;
}

/**
 * Get the Socket.IO server instance.
 * Returns null if running in a context where the custom server
 * hasn't been started (e.g., build time, static generation).
 */
export function getIO(): SocketIOServer | null {
  return global.__io || null;
}

// ── Event Types ──────────────────────────────────────────────────────

export type SocketEventType =
  // Student events
  | "student:created"
  | "student:updated"
  | "student:deleted"
  | "student:imported"
  // Teacher events
  | "teacher:created"
  | "teacher:updated"
  | "teacher:deleted"
  // Attendance events
  | "attendance:marked"
  | "attendance:updated"
  | "attendance:subject_marked"
  | "attendance:teacher_marked"
  | "subject_attendance:marked"
  | "teacher_attendance:marked"
  // Fee events
  | "fee:created"
  | "fee:paid"
  | "fee:updated"
  | "fee:deleted"
  // Academic events
  | "exam:created"
  | "exam:updated"
  | "exam:deleted"
  | "assignment:created"
  | "assignment:updated"
  | "assignment:submitted"
  | "timetable:updated"
  | "timetable:deleted"
  // Communication events
  | "notification:created"
  | "notification:broadcast"
  | "circular:created"
  | "circular:updated"
  | "circular:deleted"
  | "diary:created"
  | "diary:updated"
  | "message:sent"
  | "bulk_message:sent"
  // Leave & HR events
  | "leave:requested"
  | "leave:approved"
  | "leave:rejected"
  | "salary:processed"
  // Administration events
  | "department:created"
  | "department:updated"
  | "department:deleted"
  | "subject:created"
  | "subject:updated"
  | "subject:deleted"
  | "event:created"
  | "event:updated"
  | "event:deleted"
  | "holiday:created"
  | "holiday:updated"
  | "holiday:deleted"
  // Facilities events
  | "hostel:created"
  | "hostel:updated"
  | "hostel:allocated"
  | "hostel:vacated"
  | "hostel:deactivated"
  | "transport:updated"
  | "library:book_added"
  | "library:book_issued"
  | "library:book_returned"
  | "library:book_updated"
  | "library:book_deleted"
  | "library:updated"
  | "inventory:updated"
  | "room:created"
  | "room:booked"
  | "room:booking_updated"
  | "room:updated"
  // User & system events
  | "user:created"
  | "user:updated"
  | "user:deleted"
  | "role:created"
  | "role:updated"
  | "role:deleted"
  | "settings:updated"
  | "emergency:alert"
  // Alumni events
  | "alumni:created"
  | "alumni:updated"
  | "alumni:deleted"
  // Document events
  | "document:uploaded"
  | "document:deleted"
  // Evaluation events
  | "evaluation:submitted"
  // Promotion events
  | "promotion:processed"
  // Academic calendar/year events
  | "academic:year_created"
  | "academic:year_updated"
  | "academic:year_archived"
  | "calendar:created"
  | "calendar:updated"
  // Workload events
  | "workload:assigned"
  | "workload:updated"
  | "workload:deleted"
  // QR attendance events
  | "qr:generated"
  | "qr:scanned"
  // Generic
  | "activity:new";

export interface SocketEventPayload {
  /** Event type identifier */
  type: SocketEventType;
  /** Human-readable title for the notification */
  title: string;
  /** Detailed message */
  message: string;
  /** Module/entity this relates to (e.g., "students", "fees") */
  module: string;
  /** ID of the affected entity */
  entityId?: string;
  /** URL to navigate to for this event */
  actionUrl?: string;
  /** Target role filter: "all" | "admin" | "teacher" | "student" | "parent" */
  targetRole?: string;
  /** Who performed this action */
  actor: {
    id: string;
    name: string;
    role: string;
  };
  /** Timestamp */
  timestamp: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ── Emit Helpers ─────────────────────────────────────────────────────

/**
 * Emit a real-time event to all users of a school.
 * Fire-and-forget — never throws.
 */
export function emitToSchool(
  schoolId: string,
  event: SocketEventType,
  payload: SocketEventPayload,
): void {
  try {
    const io = getIO();
    if (!io) return;
    io.to(`school:${schoolId}`).emit(event, payload);
    io.to(`school:${schoolId}`).emit("activity:new", payload);
  } catch {
    // Socket emit must never break the API request
  }
}

/**
 * Emit a real-time event to a specific user (all their connected tabs/devices).
 */
export function emitToUser(
  userId: string,
  event: SocketEventType,
  payload: SocketEventPayload,
): void {
  try {
    const io = getIO();
    if (!io) return;
    io.to(`user:${userId}`).emit(event, payload);
  } catch {
    // Silent
  }
}

/**
 * Emit a real-time event to users with a specific role in a school.
 */
export function emitToRole(
  schoolId: string,
  role: string,
  event: SocketEventType,
  payload: SocketEventPayload,
): void {
  try {
    const io = getIO();
    if (!io) return;
    io.to(`role:${schoolId}:${role}`).emit(event, payload);
  } catch {
    // Silent
  }
}

// ── Convenience Builder ──────────────────────────────────────────────

/**
 * Build a SocketEventPayload from common API route parameters.
 * Use this in API routes after successful CRUD operations.
 */
export function buildSocketEvent(params: {
  type: SocketEventType;
  title: string;
  message: string;
  module: string;
  entityId?: string;
  actionUrl?: string;
  targetRole?: string;
  session: {
    user: {
      id?: string;
      name?: string | null;
      role?: string;
      school_id?: string;
    };
  };
  metadata?: Record<string, unknown>;
}): { schoolId: string; payload: SocketEventPayload } {
  return {
    schoolId: params.session.user.school_id || "",
    payload: {
      type: params.type,
      title: params.title,
      message: params.message,
      module: params.module,
      entityId: params.entityId,
      actionUrl: params.actionUrl,
      targetRole: params.targetRole || "all",
      actor: {
        id: params.session.user.id || "",
        name: params.session.user.name || "System",
        role: params.session.user.role || "",
      },
      timestamp: new Date().toISOString(),
      metadata: params.metadata,
    },
  };
}

/**
 * One-liner helper: build + emit a socket event to the school,
 * AND persist as an in-app notification in the database.
 *
 * Use after successful create/update/delete in API routes.
 *
 * @example
 * ```ts
 * emitActivity({
 *   type: "student:created",
 *   title: "New Student Added",
 *   message: `${name} was added to ${class_name}`,
 *   module: "students",
 *   entityId: student._id.toString(),
 *   actionUrl: "/students",
 *   session,
 * });
 * ```
 */
export function emitActivity(params: {
  type: SocketEventType;
  title: string;
  message: string;
  module: string;
  entityId?: string;
  actionUrl?: string;
  targetRole?: string;
  session: {
    user: {
      id?: string;
      name?: string | null;
      role?: string;
      school_id?: string;
    };
  };
  metadata?: Record<string, unknown>;
  /** Set to true to skip DB persistence (e.g. if caller already creates Notification) */
  skipPersist?: boolean;
}): void {
  const { schoolId, payload } = buildSocketEvent(params);
  if (schoolId) {
    emitToSchool(schoolId, params.type, payload);
  }

  // Fire-and-forget: persist notification to MongoDB
  if (!params.skipPersist && schoolId) {
    persistNotification({
      schoolId,
      type: params.type,
      title: params.title,
      message: params.message,
      module: params.module,
      entityId: params.entityId || "",
      actionUrl: params.actionUrl || "",
      targetRole: params.targetRole || "all",
      actorName: params.session.user.name || "System",
      actorRole: params.session.user.role || "",
    }).catch(() => {
      // DB persistence must never break the API request
    });
  }
}

/**
 * Persist a notification document to MongoDB (fire-and-forget).
 * Uses dynamic import to avoid circular dependency issues at build time.
 */
async function persistNotification(data: {
  schoolId: string;
  type: string;
  title: string;
  message: string;
  module: string;
  entityId: string;
  actionUrl: string;
  targetRole: string;
  actorName: string;
  actorRole: string;
}): Promise<void> {
  try {
    const { connectDB } = await import("@/lib/db");
    const { default: Notification } = await import("@/lib/models/Notification");
    await connectDB();
    await Notification.create({
      school: data.schoolId,
      type: data.type,
      title: data.title,
      message: data.message,
      target_role: data.targetRole,
      status: "unread",
      module: data.module,
      entityId: data.entityId,
      actionUrl: data.actionUrl,
      actorName: data.actorName,
      actorRole: data.actorRole,
    });
  } catch {
    // Silent — DB write failures must never affect the API response
  }
}
