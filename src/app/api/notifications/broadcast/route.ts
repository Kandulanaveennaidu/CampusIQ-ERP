import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Notification from "@/lib/models/Notification";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";
import {
  broadcastToRecipients,
  notifyTeacherUpdate,
  notifyStudentResults,
} from "@/lib/twilio-notifications";

/**
 * POST /api/notifications/broadcast
 *
 * Admin-only endpoint to send multi-channel (SMS + WhatsApp) broadcast
 * notifications to teachers, students, or all users.
 *
 * Body:
 *   type:         "announcement" | "schedule_update" | "exam_results"
 *   title:        string              — notification title
 *   message:      string              — announcement body
 *   target_role:  "all" | "teacher" | "student"
 *   exam_name?:   string              — required when type = "exam_results"
 */
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const {
      type = "announcement",
      title,
      message,
      target_role = "all",
      exam_name,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "title and message are required" },
        { status: 400 },
      );
    }

    await connectDB();

    // ── 1. Create in-app notification ────────────────────────────────────
    const notification = await Notification.create({
      school: session!.user.school_id,
      type,
      title,
      message,
      target_role,
      status: "unread",
      module: "notifications",
      entityId: "",
      actionUrl: "/notifications",
      actorName: session!.user.name || "System",
      actorRole: session!.user.role || "",
    });

    // ── 2. Find recipients with phone numbers ────────────────────────────
    const userQuery: Record<string, unknown> = {
      school: session!.user.school_id,
      isActive: true,
    };

    if (target_role !== "all") {
      userQuery.role = target_role;
    }

    const users = await User.find(userQuery)
      .select("name phone role email")
      .lean();

    const recipientsWithPhone = users.filter(
      (u) => u.phone && u.phone.trim().length >= 10,
    );

    // ── 3. Send SMS + WhatsApp based on notification type ────────────────
    let broadcastSummary = { sent: 0, failed: 0 };

    if (recipientsWithPhone.length > 0) {
      if (type === "schedule_update") {
        // Teacher schedule update — use specific template
        const teachers = recipientsWithPhone.filter(
          (u) => u.role === "teacher",
        );
        let sent = 0;
        let failed = 0;
        for (const teacher of teachers) {
          try {
            const result = await notifyTeacherUpdate(
              teacher.phone,
              teacher.name,
            );
            if (result.sms.success || result.whatsapp.success) sent++;
            else failed++;
          } catch {
            failed++;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        broadcastSummary = { sent, failed };
      } else if (type === "exam_results") {
        // Student exam results — use specific template
        const students = recipientsWithPhone.filter(
          (u) => u.role === "student",
        );
        let sent = 0;
        let failed = 0;
        for (const student of students) {
          try {
            const result = await notifyStudentResults(
              student.phone,
              student.name,
              exam_name || "Recent Exam",
            );
            if (result.sms.success || result.whatsapp.success) sent++;
            else failed++;
          } catch {
            failed++;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        broadcastSummary = { sent, failed };
      } else {
        // Generic announcement broadcast
        const recipients = recipientsWithPhone.map((u) => ({
          phone: u.phone,
          name: u.name,
        }));
        const result = await broadcastToRecipients(recipients, message);
        broadcastSummary = { sent: result.sent, failed: result.failed };
      }
    }

    // ── 4. Audit & real-time event ───────────────────────────────────────
    await audit({
      action: "create",
      entity: "broadcast",
      entityId: notification._id.toString(),
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: {
        title,
        target_role,
        type,
        recipientCount: recipientsWithPhone.length,
        ...broadcastSummary,
      },
    });

    emitActivity({
      type: "notification:broadcast",
      title: "Broadcast Sent",
      message: `${title} — ${broadcastSummary.sent} delivered, ${broadcastSummary.failed} failed`,
      module: "notifications",
      entityId: notification._id.toString(),
      actionUrl: "/notifications",
      targetRole: target_role,
      session: session!,
      skipPersist: true,
    });

    return NextResponse.json({
      success: true,
      message: "Broadcast sent successfully",
      data: {
        notification_id: notification._id.toString(),
        in_app: true,
        sms_whatsapp: {
          total_recipients: recipientsWithPhone.length,
          sent: broadcastSummary.sent,
          failed: broadcastSummary.failed,
        },
      },
    });
  } catch (error) {
    logError("POST", "/api/notifications/broadcast", error);
    return NextResponse.json(
      { error: "Failed to send broadcast" },
      { status: 500 },
    );
  }
}
