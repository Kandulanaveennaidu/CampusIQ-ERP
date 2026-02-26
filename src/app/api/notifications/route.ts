import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";
import User from "@/lib/models/User";
import { requireAuth, requireRole } from "@/lib/permissions";
import { notificationSchema, validationError } from "@/lib/validators";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";
import { sendMultiChannelNotification } from "@/lib/twilio-notifications";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("notifications:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const parsedLimit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * parsedLimit;

    await connectDB();

    const baseQuery = { school: session!.user.school_id };

    const [notifications, total] = await Promise.all([
      Notification.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Notification.countDocuments(baseQuery),
    ]);

    const filtered = notifications.filter(
      (n) => n.target_role === "all" || n.target_role === session!.user.role,
    );

    const userId = session!.user.id;
    const unreadCount = filtered.filter((n) => {
      if (n.readBy && Array.isArray(n.readBy)) {
        return !n.readBy.some((id: unknown) => String(id) === userId);
      }
      return n.status === "unread";
    }).length;

    const data = filtered.map((n) => ({
      notification_id: n._id.toString(),
      school_id: n.school.toString(),
      type: n.type || "",
      title: n.title,
      message: n.message,
      target_role: n.target_role || "all",
      status: n.readBy?.some((id: unknown) => String(id) === userId)
        ? "read"
        : n.status || "unread",
      module: (n as Record<string, unknown>).module || "",
      entityId: (n as Record<string, unknown>).entityId || "",
      actionUrl: (n as Record<string, unknown>).actionUrl || "",
      actorName: (n as Record<string, unknown>).actorName || "System",
      actorRole: (n as Record<string, unknown>).actorRole || "",
      created_at: n.createdAt?.toISOString() || "",
    }));

    return NextResponse.json({
      success: true,
      data,
      unread_count: unreadCount,
      pagination: {
        page,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    logError("GET", "/api/notifications", error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        unread_count: 0,
        error: "Failed to fetch notifications",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const parsed = notificationSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { type, title, message, target_role } = parsed.data;

    await connectDB();

    const notification = await Notification.create({
      school: session!.user.school_id,
      type: type || "announcement",
      title,
      message,
      target_role: target_role || "all",
      status: "unread",
      module: "notifications",
      entityId: "",
      actionUrl: "/notifications",
      actorName: session!.user.name || "System",
      actorRole: session!.user.role || "",
    });

    await audit({
      action: "create",
      entity: "notification",
      entityId: notification._id.toString(),
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { title, target_role: target_role || "all" },
    });

    emitActivity({
      type: "notification:created",
      title: "New Notification",
      message: `${title}`,
      module: "notifications",
      entityId: notification._id.toString(),
      actionUrl: "/notifications",
      targetRole: target_role || "all",
      session: session!,
      skipPersist: true,
    });

    // ── Send SMS + WhatsApp to matching recipients ───────────────────
    let smsSummary = { total: 0, sent: 0, failed: 0, details: [] as { name: string; phone: string; sms: boolean; whatsapp: boolean; error?: string }[] };
    try {
      const role = target_role || "all";
      const userQuery: Record<string, unknown> = {
        school: session!.user.school_id,
        isActive: true,
      };
      if (role !== "all") {
        userQuery.role = role;
      }

      const recipients = await User.find(userQuery).select("phone name").lean();

      console.log(`[Notification] Found ${recipients.length} users in school, checking phones...`);

      const withPhone = recipients.filter(
        (u) => u.phone && u.phone.trim().length >= 10,
      );

      console.log(`[Notification] ${withPhone.length} users have valid phone numbers`);

      // Deduplicate by phone number to avoid sending multiple messages to the same number
      const seenPhones = new Set<string>();
      const uniqueRecipients = withPhone.filter((u) => {
        const normalized = u.phone.replace(/[\s\-\+]/g, "").slice(-10);
        if (seenPhones.has(normalized)) return false;
        seenPhones.add(normalized);
        return true;
      });

      console.log(`[Notification] ${uniqueRecipients.length} unique phone numbers after deduplication`);

      if (uniqueRecipients.length > 0) {
        smsSummary.total = uniqueRecipients.length;
        const smsText = `CampusIQ: ${title} — ${message}`;

        for (const user of uniqueRecipients) {
          try {
            console.log(`[Notification] Sending to ${user.name} (${user.phone})...`);
            const result = await sendMultiChannelNotification(
              user.phone,
              smsText,
            );
            const detail = {
              name: user.name,
              phone: user.phone,
              sms: result.sms.success,
              whatsapp: result.whatsapp.success,
              error: result.sms.error || result.whatsapp.error || undefined,
            };
            smsSummary.details.push(detail);

            if (result.sms.success || result.whatsapp.success) {
              smsSummary.sent++;
              console.log(`[Notification] ✓ Sent to ${user.name} — SMS: ${result.sms.success}, WhatsApp: ${result.whatsapp.success}`);
            } else {
              smsSummary.failed++;
              console.log(`[Notification] ✗ Failed for ${user.name} — SMS: ${result.sms.error}, WhatsApp: ${result.whatsapp.error}`);
            }
          } catch (sendErr) {
            smsSummary.failed++;
            const errMsg = sendErr instanceof Error ? sendErr.message : "Unknown error";
            console.log(`[Notification] ✗ Exception for ${user.name}: ${errMsg}`);
            smsSummary.details.push({
              name: user.name,
              phone: user.phone,
              sms: false,
              whatsapp: false,
              error: errMsg,
            });
          }
          // Rate limit
          if (uniqueRecipients.length > 1) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }
      }
    } catch (twilioErr) {
      // SMS delivery failure should not break the response
      console.error("[Notification] SMS/WhatsApp block error:", twilioErr);
    }

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
      sms_whatsapp: {
        total: smsSummary.total,
        sent: smsSummary.sent,
        failed: smsSummary.failed,
        details: smsSummary.details,
      },
    });
  } catch (error) {
    logError("POST", "/api/notifications", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("notifications:write");
    if (error) return error;

    const body = await request.json();
    const { notification_id, action } = body;
    const userId = session!.user.id;

    await connectDB();

    if (action === "mark_all_read") {
      await Notification.updateMany(
        { school: session!.user.school_id, status: "unread" },
        { $addToSet: { readBy: userId } },
      );
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    }

    if (!notification_id) {
      return NextResponse.json(
        { error: "notification_id required" },
        { status: 400 },
      );
    }

    await Notification.findOneAndUpdate(
      { _id: notification_id, school: session!.user.school_id },
      { $addToSet: { readBy: userId } },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("PUT", "/api/notifications", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}
