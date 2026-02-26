import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmergencyAlert from "@/lib/models/EmergencyAlert";
import Notification from "@/lib/models/Notification";
import { requireAuth, requireRole } from "@/lib/permissions";
import { emergencyAlertSchema, validationError } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import { broadcastEmergency } from "@/lib/twilio-notifications";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("emergency:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    await connectDB();

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const alerts = await EmergencyAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const data = alerts.map((a) => ({
      alert_id: a._id.toString(),
      school_id: a.school.toString(),
      title: a.title,
      message: a.message,
      severity: a.severity,
      status: a.status,
      created_by: a.created_by?.toString() || "",
      created_by_name: a.created_by_name || "",
      resolved_by: a.resolved_by?.toString() || "",
      resolved_by_name: a.resolved_by_name || "",
      resolved_at: a.resolved_at?.toISOString() || "",
      instructions: a.instructions || "",
      affected_areas: a.affected_areas || "",
      created_at: a.createdAt?.toISOString() || "",
    }));

    const stats = await EmergencyAlert.aggregate([
      { $match: { school: session!.user.school_id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          critical: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$severity", "critical"] },
                    { $eq: ["$status", "active"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
    const s = stats[0] || { total: 0, active: 0, resolved: 0, critical: 0 };

    return NextResponse.json({ data, stats: s });
  } catch (error) {
    logError("GET", "/api/emergency", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const parsed = emergencyAlertSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { type, title, message, severity, instructions, affected_areas } =
      parsed.data;

    await connectDB();

    const alert = await EmergencyAlert.create({
      school: session!.user.school_id,
      type: type || "general",
      title,
      message,
      severity,
      status: "active",
      created_by: session!.user.id,
      created_by_name: session!.user.name || "",
      instructions: instructions || "",
      affected_areas: affected_areas || "",
    });

    await Notification.create({
      school: session!.user.school_id,
      type: "emergency",
      title: `🚨 Emergency: ${title}`,
      message: `[${severity.toUpperCase()}] ${message}`,
      target_role: "all",
      readBy: [],
      module: "emergency",
      entityId: alert._id.toString(),
      actionUrl: "/emergency-alerts",
      actorName: session!.user.name || "System",
      actorRole: session!.user.role || "",
    });

    await audit({
      action: "create",
      entity: "emergency_alert",
      entityId: alert._id.toString(),
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { severity, type },
    });

    emitActivity({
      type: "emergency:alert",
      title: `🚨 Emergency: ${title}`,
      message: `[${severity.toUpperCase()}] ${message}`,
      module: "emergency",
      entityId: alert._id.toString(),
      actionUrl: "/emergency-alerts",
      targetRole: "all",
      session: session!,
      skipPersist: true,
    });

    // Fire-and-forget: SMS + WhatsApp emergency broadcast to ALL users
    try {
      const schoolId = session!.user.school_id;
      const [teachers, students] = await Promise.all([
        User.find({ school: schoolId, isActive: true }).select("phone").lean(),
        Student.find({ school: schoolId, status: "active" })
          .select("parent_phone")
          .lean(),
      ]);

      const allPhones = new Set<string>();
      teachers.forEach((t) => {
        if (t.phone) allPhones.add(t.phone);
      });
      students.forEach((s) => {
        if (s.parent_phone) allPhones.add(s.parent_phone);
      });

      const recipients = [...allPhones].map((phone) => ({ phone }));
      broadcastEmergency(recipients, title, message, severity).catch(() => {});
    } catch (_) {
      // Emergency notifications are best-effort
    }

    return NextResponse.json({
      message: "Emergency alert broadcast",
      data: { alert_id: alert._id.toString() },
    });
  } catch (error) {
    logError("POST", "/api/emergency", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const { alert_id, action } = body;

    if (!alert_id) {
      return NextResponse.json(
        { error: "alert_id is required" },
        { status: 400 },
      );
    }

    await connectDB();

    if (action === "resolve") {
      const result = await EmergencyAlert.findOneAndUpdate(
        { _id: alert_id, school: session!.user.school_id },
        {
          status: "resolved",
          resolved_by: session!.user.id,
          resolved_by_name: session!.user.name || "",
          resolved_at: new Date(),
        },
        { new: true },
      );

      if (!result) {
        return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      }

      await Notification.create({
        school: session!.user.school_id,
        type: "general",
        title: `✅ Emergency Resolved: ${result.title}`,
        message: `The emergency "${result.title}" has been resolved by ${session!.user.name}`,
        target_role: "all",
        readBy: [],
        module: "emergency",
        entityId: alert_id,
        actionUrl: "/emergency-alerts",
        actorName: session!.user.name || "System",
        actorRole: session!.user.role || "",
      });

      await audit({
        action: "update",
        entity: "emergency_alert",
        entityId: alert_id,
        schoolId: session!.user.school_id,
        userId: session!.user.id || "",
        userName: session!.user.name,
        userRole: session!.user.role,
        metadata: { action: "resolved" },
      });

      emitActivity({
        type: "emergency:alert",
        title: "✅ Emergency Resolved",
        message: `${result.title} has been resolved`,
        module: "emergency",
        entityId: alert_id,
        actionUrl: "/emergency-alerts",
        targetRole: "all",
        session: session!,
        skipPersist: true,
      });

      return NextResponse.json({ message: "Alert resolved" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logError("PUT", "/api/emergency", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
