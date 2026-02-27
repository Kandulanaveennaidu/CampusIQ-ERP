import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/lib/models/Event";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import { requireAuth, requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";
import { notifyEvent } from "@/lib/twilio-notifications";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    await connectDB();

    const query: Record<string, unknown> = { school: session!.user.school_id };

    if (month) {
      const [y, m] = month.split("-").map(Number);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);
      query.$or = [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ];
    }

    if (type) query.type = type;
    if (status) query.status = status;

    const events = await Event.find(query)
      .populate("organizer", "name email")
      .populate("createdBy", "name")
      .sort({ startDate: 1 })
      .lean();

    const data = events.map((e) => ({
      _id: e._id.toString(),
      title: e.title,
      description: e.description || "",
      type: e.type,
      startDate: e.startDate,
      endDate: e.endDate,
      allDay: e.allDay,
      location: e.location || "",
      organizer: e.organizer,
      participants: e.participants || [],
      color: e.color || "#3b82f6",
      isRecurring: e.isRecurring,
      recurringPattern: e.recurringPattern,
      status: e.status,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    logError("GET", "/api/events", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin", "teacher");
    if (error) return error;

    const body = await request.json();
    const {
      title,
      description,
      type,
      startDate,
      endDate,
      allDay,
      location,
      participants,
      color,
      isRecurring,
      recurringPattern,
      status,
    } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Title, start date, and end date are required" },
        { status: 400 },
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    await connectDB();

    const event = await Event.create({
      school: session!.user.school_id,
      title,
      description: description || "",
      type: type || "other",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: allDay !== undefined ? allDay : true,
      location: location || "",
      organizer: session!.user.id,
      participants: participants || [],
      color: color || "#3b82f6",
      isRecurring: isRecurring || false,
      recurringPattern: recurringPattern || undefined,
      status: status || "scheduled",
      createdBy: session!.user.id,
    });

    emitActivity({
      type: "event:created",
      title: "New Event Created",
      message: `${title} scheduled on ${new Date(startDate).toLocaleDateString("en-IN")}`,
      module: "events",
      entityId: event._id.toString(),
      actionUrl: "/academic-calendar",
      session: session!,
    });

    // Fire-and-forget SMS + WhatsApp notifications to all parents & teachers
    try {
      const schoolId = session!.user.school_id;
      const eventDateStr = new Date(startDate).toLocaleDateString("en-IN");
      const eventType = type || "event";

      const [students, teachers] = await Promise.all([
        Student.find({ school: schoolId, status: "active" })
          .select("parent_phone")
          .lean(),
        User.find({ school: schoolId, role: "teacher", isActive: true })
          .select("phone")
          .lean(),
      ]);

      const phones = new Set<string>();
      for (const s of students) {
        if (s.parent_phone) phones.add(s.parent_phone);
      }
      for (const t of teachers) {
        if (t.phone) phones.add(t.phone);
      }

      for (const phone of phones) {
        notifyEvent(phone, title, eventDateStr, eventType).catch(() => {});
      }
    } catch {
      // Notification is best-effort
    }

    return NextResponse.json(
      { data: event, message: "Event created successfully" },
      { status: 201 },
    );
  } catch (error) {
    logError("POST", "/api/events", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
