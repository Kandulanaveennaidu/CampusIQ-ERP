import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visitor from "@/lib/models/Visitor";
import Notification from "@/lib/models/Notification";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/permissions";
import { visitorSchema, validationError } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { notifyVisitorArrival } from "@/lib/twilio-notifications";
import { escapeRegex } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("visitors:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );

    await connectDB();

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (status) query.status = status;
    if (date) {
      query.createdAt = {
        $gte: new Date(date + "T00:00:00.000Z"),
        $lt: new Date(date + "T23:59:59.999Z"),
      };
    }

    const total = await Visitor.countDocuments(query);
    const visitors = await Visitor.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayVisitors = await Visitor.find({
      school: session!.user.school_id,
      createdAt: { $gte: todayStart, $lt: todayEnd },
    }).lean();

    const data = visitors.map((v) => ({
      visitor_id: v._id.toString(),
      school_id: v.school.toString(),
      visitor_name: v.visitor_name,
      visitor_phone: v.visitor_phone || "",
      visitor_email: v.visitor_email || "",
      purpose: v.purpose,
      host_name: v.host_name || "",
      host_type: v.host_type || "staff",
      student_id: v.student_id || "",
      photo_url: v.photo_url || "",
      id_proof: v.id_proof || "",
      check_in: v.check_in || "",
      check_out: v.check_out || "",
      badge_number: v.badge_number || "",
      status: v.status,
      notes: v.notes || "",
      created_at: v.createdAt?.toISOString() || "",
    }));

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        total_today: todayVisitors.length,
        checked_in: todayVisitors.filter((v) => v.status === "checked_in")
          .length,
        checked_out: todayVisitors.filter((v) => v.status === "checked_out")
          .length,
        pre_registered: visitors.filter((v) => v.status === "pre_registered")
          .length,
      },
    });
  } catch (error) {
    logError("GET", "/api/visitors", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("visitors:write");
    if (error) return error;

    const body = await request.json();
    const parsed = visitorSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const {
      visitor_name,
      visitor_phone,
      visitor_email,
      purpose,
      host_name,
      host_type,
      student_id,
      id_proof,
      notes,
      pre_register,
    } = parsed.data;

    await connectDB();

    const now = new Date().toISOString();
    const badgeNumber = `B${Date.now().toString().slice(-4)}`;

    const visitor = await Visitor.create({
      school: session!.user.school_id,
      visitor_name,
      visitor_phone: visitor_phone || "",
      visitor_email: visitor_email || "",
      purpose,
      host_name: host_name || "",
      host_type: host_type || "staff",
      student_id: student_id || "",
      id_proof: id_proof || "",
      check_in: pre_register ? "" : now,
      badge_number: badgeNumber,
      status: pre_register ? "pre_registered" : "checked_in",
      notes: notes || "",
    });

    try {
      await Notification.create({
        school: session!.user.school_id,
        type: "visitor_arrival",
        title: "Visitor Arrival",
        message: `${visitor_name} has ${pre_register ? "been pre-registered" : "arrived"} - Purpose: ${purpose}${host_name ? ` (Meeting: ${host_name})` : ""}`,
        target_role: "all",
        status: "unread",
        module: "visitors",
        entityId: visitor._id.toString(),
        actionUrl: "/visitors",
        actorName: session!.user.name || "System",
        actorRole: session!.user.role || "",
      });
    } catch {
      /* notification failure shouldn't block visitor registration */
    }

    // SMS/WhatsApp notification to student's parent (if visitor is for a student)
    if (!pre_register && student_id) {
      try {
        const student = await Student.findById(student_id)
          .select("parent_phone")
          .lean();
        if (student?.parent_phone) {
          notifyVisitorArrival(
            student.parent_phone,
            visitor_name,
            purpose,
          ).catch(() => {});
        }
      } catch {
        /* best-effort */
      }
    }
    // Also try to notify the host teacher/staff
    if (!pre_register && host_name) {
      try {
        const host = await User.findOne({
          school: session!.user.school_id,
          name: { $regex: new RegExp(`^${escapeRegex(host_name)}$`, "i") },
          isActive: true,
        })
          .select("phone")
          .lean();
        if (host?.phone) {
          notifyVisitorArrival(host.phone, visitor_name, purpose).catch(
            () => {},
          );
        }
      } catch {
        /* best-effort */
      }
    }

    await audit({
      action: "create",
      entity: "visitor",
      entityId: visitor._id.toString(),
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    return NextResponse.json({
      message: pre_register ? "Visitor pre-registered" : "Visitor checked in",
      data: { visitor_id: visitor._id.toString(), badge_number: badgeNumber },
    });
  } catch (error) {
    logError("POST", "/api/visitors", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("visitors:write");
    if (error) return error;

    const body = await request.json();
    const { visitor_id, action } = body;

    if (!visitor_id || !action) {
      return NextResponse.json(
        { error: "visitor_id and action are required" },
        { status: 400 },
      );
    }

    await connectDB();

    const visitor = await Visitor.findOne({
      _id: visitor_id,
      school: session!.user.school_id,
    });

    if (!visitor) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    if (action === "check_in") {
      visitor.check_in = now;
      visitor.status = "checked_in";
    } else if (action === "check_out") {
      visitor.check_out = now;
      visitor.status = "checked_out";
    } else if (action === "cancel") {
      visitor.status = "cancelled";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await visitor.save();

    await audit({
      action: "update",
      entity: "visitor",
      entityId: visitor_id,
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { action },
    });

    return NextResponse.json({
      message: `Visitor ${action.replace("_", " ")}`,
      data: { visitor_id: visitor._id.toString(), status: visitor.status },
    });
  } catch (error) {
    logError("PUT", "/api/visitors", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
