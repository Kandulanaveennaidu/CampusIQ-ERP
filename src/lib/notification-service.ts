/**
 * Unified Notification Service
 * ─────────────────────────────
 * Single entry point for sending notifications across ALL channels:
 *   1. In-app (MongoDB Notification document)
 *   2. Real-time (Socket.IO to connected clients)
 *   3. SMS + WhatsApp (Twilio)
 *
 * Usage in API routes:
 * ```ts
 * import { sendNotification } from "@/lib/notification-service";
 *
 * await sendNotification({
 *   type: "student:created",
 *   title: "New Student Added",
 *   message: `${name} was added to ${className}`,
 *   module: "students",
 *   actionUrl: "/students",
 *   targetRole: "all",
 *   session,
 *   entityId: student._id.toString(),
 *   sendSMS: true,      // optional: also send SMS+WhatsApp
 *   smsRecipients: [{ phone, name }],
 * });
 * ```
 */

import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";
import { emitActivity, type SocketEventType } from "@/lib/socket-io";
import { sendMultiChannelNotification } from "@/lib/twilio-notifications";
import logger from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────

export interface NotificationParams {
  /** Socket event type (e.g. "student:created") */
  type: SocketEventType;
  /** Human-readable title */
  title: string;
  /** Detailed message */
  message: string;
  /** Module this relates to (e.g. "students", "fees") */
  module: string;
  /** URL to navigate to when clicking */
  actionUrl: string;
  /** Target audience: "all" | "admin" | "teacher" | "student" | "parent" */
  targetRole?: string;
  /** The authenticated session */
  session: {
    user: {
      id?: string;
      name?: string | null;
      role?: string;
      school_id?: string;
    };
  };
  /** ID of the affected entity */
  entityId?: string;
  /** Additional metadata for the socket event */
  metadata?: Record<string, unknown>;
  /** Whether to also send SMS+WhatsApp via Twilio */
  sendSMS?: boolean;
  /** Recipients for SMS/WhatsApp (required if sendSMS is true) */
  smsRecipients?: Array<{ phone: string; name?: string }>;
  /** Custom SMS message (defaults to the notification message) */
  smsMessage?: string;
}

export interface NotificationResult {
  /** ID of the persisted Notification document */
  notificationId: string;
  /** Whether Socket.IO emit was attempted */
  socketEmitted: boolean;
  /** SMS/WhatsApp delivery summary (if sendSMS was true) */
  smsDelivery?: {
    total: number;
    sent: number;
    failed: number;
  };
}

// ── Main Function ────────────────────────────────────────────────────

/**
 * Send a notification through all channels:
 *  1. Persist to MongoDB (always)
 *  2. Emit Socket.IO event (always)
 *  3. Send SMS+WhatsApp via Twilio (only if sendSMS=true and recipients provided)
 */
export async function sendNotification(
  params: NotificationParams,
): Promise<NotificationResult> {
  const {
    type,
    title,
    message,
    module,
    actionUrl,
    targetRole = "all",
    session,
    entityId = "",
    metadata,
    sendSMS = false,
    smsRecipients = [],
    smsMessage,
  } = params;

  const schoolId = session.user.school_id || "";
  const actorName = session.user.name || "System";
  const actorRole = session.user.role || "";

  const result: NotificationResult = {
    notificationId: "",
    socketEmitted: false,
  };

  // ── 1. Persist to MongoDB ─────────────────────────────────────────
  try {
    await connectDB();
    const notification = await Notification.create({
      school: schoolId,
      type,
      title,
      message,
      target_role: targetRole,
      status: "unread",
      module,
      entityId,
      actionUrl,
      actorName,
      actorRole,
    });
    result.notificationId = notification._id.toString();
  } catch (error) {
    logger.error({
      type: "notification_service",
      phase: "db_persist",
      error: error instanceof Error ? error.message : "DB persist failed",
      title,
      module,
    });
  }

  // ── 2. Emit Socket.IO event ───────────────────────────────────────
  try {
    emitActivity({
      type,
      title,
      message,
      module,
      entityId,
      actionUrl,
      targetRole,
      session,
      metadata,
    });
    result.socketEmitted = true;
  } catch {
    // Socket emit must never break the API request
  }

  // ── 3. Send SMS + WhatsApp via Twilio (if requested) ──────────────
  if (sendSMS && smsRecipients.length > 0) {
    const smsText = smsMessage || `CampusIQ: ${title} — ${message}`;
    let sent = 0;
    let failed = 0;

    for (const recipient of smsRecipients) {
      try {
        const twilioResult = await sendMultiChannelNotification(
          recipient.phone,
          smsText,
        );
        if (twilioResult.sms.success || twilioResult.whatsapp.success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      // Twilio rate limit: ~100ms between messages
      if (smsRecipients.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    result.smsDelivery = {
      total: smsRecipients.length,
      sent,
      failed,
    };
  }

  return result;
}

/**
 * Fire-and-forget variant — logs errors but never throws.
 * Use this in API routes where notification failure should not break the response.
 */
export function sendNotificationAsync(params: NotificationParams): void {
  sendNotification(params).catch((error) => {
    logger.error({
      type: "notification_service_async",
      error: error instanceof Error ? error.message : "Unknown error",
      title: params.title,
      module: params.module,
    });
  });
}
