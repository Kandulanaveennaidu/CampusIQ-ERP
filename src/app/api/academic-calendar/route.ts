import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AcademicCalendar from "@/lib/models/AcademicCalendar";
import Holiday from "@/lib/models/Holiday";
import { Exam } from "@/lib/models/Exam";
import Event from "@/lib/models/Event";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";

/**
 * GET /api/academic-calendar — Get academic calendar
 * Query: ?academicYear=2024-2025
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get("academicYear") || "";

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (academicYear) query.academicYear = academicYear;

    const calendars = await AcademicCalendar.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name")
      .lean();

    return NextResponse.json({ data: calendars, total: calendars.length });
  } catch (err) {
    logError("GET", "/api/academic-calendar", err);
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/academic-calendar — Auto-generate academic calendar
 * Body: { academicYear, title, startDate, endDate, autoPopulate?: boolean }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const {
      academicYear,
      title,
      startDate,
      endDate,
      autoPopulate = true,
    } = body;
    const schoolId = session!.user.school_id;

    if (!academicYear || !title) {
      return NextResponse.json(
        { error: "academicYear and title required" },
        { status: 400 },
      );
    }

    const entries: Record<string, unknown>[] = [];

    if (autoPopulate) {
      // Auto-populate from holidays (Holiday model: date, name, description)
      const holidays = (await Holiday.find({
        school: schoolId,
      }).lean()) as unknown as Record<string, unknown>[];
      for (const h of holidays) {
        entries.push({
          date: h.date,
          title: String(h.name || "Holiday"),
          type: "holiday",
          description: String(h.description || ""),
          color: "#ef4444",
        });
      }

      // Auto-populate from exams (Exam model: date, name, className)
      const exams = (await Exam.find({
        school: schoolId,
      }).lean()) as unknown as Record<string, unknown>[];
      for (const e of exams) {
        entries.push({
          date: e.date,
          title: String(e.name || "Exam"),
          type: "exam",
          description: `Class: ${e.className || "All"}`,
          forClasses: e.className ? [String(e.className)] : [],
          color: "#f59e0b",
        });
      }

      // Auto-populate from events (Event model: startDate, endDate, title)
      const events = (await Event.find({
        school: schoolId,
      }).lean()) as unknown as Record<string, unknown>[];
      for (const ev of events) {
        entries.push({
          date: ev.startDate,
          endDate: ev.endDate,
          title: String(ev.title || "Event"),
          type: "event",
          description: String(ev.description || ""),
          color: "#3b82f6",
        });
      }

      // Add default entries: summer/winter vacations, PTMs, orientation, sports day
      const start = startDate
        ? new Date(startDate)
        : new Date(`${academicYear.split("-")[0]}-06-01`);
      const year = start.getFullYear();

      entries.push(
        {
          date: new Date(year, 5, 1),
          endDate: new Date(year, 5, 15),
          title: "Summer Break",
          type: "vacation",
          color: "#10b981",
        },
        {
          date: new Date(year, 11, 24),
          endDate: new Date(year + 1, 0, 1),
          title: "Winter Break",
          type: "vacation",
          color: "#10b981",
        },
        {
          date: new Date(year, 6, 15),
          title: "Parent-Teacher Meeting",
          type: "ptm",
          color: "#8b5cf6",
        },
        {
          date: new Date(year, 10, 15),
          title: "Parent-Teacher Meeting",
          type: "ptm",
          color: "#8b5cf6",
        },
        {
          date: new Date(year, 5, 16),
          title: "Orientation Day",
          type: "orientation",
          color: "#06b6d4",
        },
        {
          date: new Date(year + 1, 0, 26),
          title: "Republic Day - Sports Meet",
          type: "sports_day",
          color: "#ec4899",
        },
        {
          date: new Date(year, 8, 5),
          title: "Teachers' Day",
          type: "event",
          color: "#3b82f6",
        },
        {
          date: new Date(year + 1, 1, 15),
          title: "Annual Day",
          type: "event",
          color: "#3b82f6",
        },
        {
          date: new Date(year + 1, 2, 1),
          title: "Result Day",
          type: "result_day",
          color: "#f97316",
        },
      );
    }

    // Add any manual entries from the body
    if (body.entries && Array.isArray(body.entries)) {
      entries.push(...body.entries);
    }

    // Sort entries
    entries.sort(
      (a, b) =>
        new Date(a.date as Date).getTime() - new Date(b.date as Date).getTime(),
    );

    const calendar = await AcademicCalendar.findOneAndUpdate(
      { school: schoolId, academicYear },
      {
        school: schoolId,
        academicYear,
        title,
        entries,
        createdBy: session!.user.id,
        isPublished: false,
      },
      { upsert: true, new: true },
    );

    emitActivity({
      type: "calendar:created",
      title: "Academic Calendar Generated",
      message: `Academic calendar "${title}" for ${academicYear} has been generated`,
      module: "academic-calendar",
      entityId: calendar._id.toString(),
      actionUrl: "/academic-calendar",
      session: session!,
    });

    return NextResponse.json({ data: calendar }, { status: 201 });
  } catch (err) {
    logError("POST", "/api/academic-calendar", err);
    return NextResponse.json(
      { error: "Failed to generate calendar" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/academic-calendar — Update calendar (add/edit entries, publish)
 */
export async function PUT(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const { _id, ...updates } = body;

    if (!_id)
      return NextResponse.json({ error: "_id required" }, { status: 400 });

    const calendar = await AcademicCalendar.findOneAndUpdate(
      { _id, school: session!.user.school_id },
      updates,
      { new: true },
    );

    if (!calendar)
      return NextResponse.json(
        { error: "Calendar not found" },
        { status: 404 },
      );

    emitActivity({
      type: "calendar:updated",
      title: "Academic Calendar Updated",
      message: `Academic calendar has been updated`,
      module: "academic-calendar",
      entityId: _id,
      actionUrl: "/academic-calendar",
      session: session!,
    });

    return NextResponse.json({ data: calendar });
  } catch (err) {
    logError("PUT", "/api/academic-calendar", err);
    return NextResponse.json(
      { error: "Failed to update calendar" },
      { status: 500 },
    );
  }
}
