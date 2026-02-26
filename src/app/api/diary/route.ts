import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import DiaryEntry from "@/lib/models/DiaryEntry";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";
import Student from "@/lib/models/Student";
import { notifyDiaryEntry } from "@/lib/twilio-notifications";

/**
 * GET /api/diary — List diary entries
 * Query: ?class=10A&date=2026-02-12&limit=50
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class");
    const date = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (className) query.class_name = className;
    if (date) {
      const d = new Date(date);
      query.date = {
        $gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        $lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      };
    }

    const entries = await DiaryEntry.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .populate("createdBy", "name")
      .lean();

    const data = entries.map((e: Record<string, unknown>) => ({
      diary_id: String(e._id),
      class_name: e.class_name,
      section: e.section,
      date: e.date,
      subject: e.subject,
      title: e.title,
      content: e.content,
      homework: e.homework,
      attachments: e.attachments,
      createdBy: e.createdBy,
      created_at: e.createdAt,
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    logError("GET", "/api/diary", err);
    return NextResponse.json(
      { error: "Failed to fetch diary entries" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/diary — Create a diary entry (teachers/admins only)
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    if (!body.class_name || !body.title || !body.content || !body.date) {
      return NextResponse.json(
        { error: "class_name, title, content, and date are required" },
        { status: 400 },
      );
    }

    const entry = await DiaryEntry.create({
      school: session!.user.school_id,
      class_name: body.class_name,
      section: body.section || "",
      date: new Date(body.date),
      subject: body.subject || "",
      title: body.title,
      content: body.content,
      homework: body.homework || "",
      attachments: body.attachments || [],
      createdBy: session!.user.id,
    });

    emitActivity({
      type: "diary:created",
      title: "New Diary Entry",
      message: `${body.title} for ${body.class_name}`,
      module: "diary",
      entityId: entry._id.toString(),
      actionUrl: "/diary",
      targetRole: "all",
      session: session!,
    });

    // Fire-and-forget: SMS + WhatsApp to parents of the class
    try {
      const students = await Student.find({
        school: session!.user.school_id,
        class_name: body.class_name,
        status: "active",
      })
        .select("parent_phone")
        .lean();

      const phones = [
        ...new Set(
          students.filter((s) => s.parent_phone).map((s) => s.parent_phone),
        ),
      ];
      for (const phone of phones) {
        notifyDiaryEntry(
          phone,
          body.class_name,
          body.title,
          body.subject || "",
        ).catch(() => {});
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch {
      // Notification is best-effort
    }

    return NextResponse.json({
      success: true,
      diary_id: entry._id.toString(),
    });
  } catch (err) {
    logError("POST", "/api/diary", err);
    return NextResponse.json(
      { error: "Failed to create diary entry" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/diary — Delete a diary entry
 * Body: { diary_id }
 */
export async function DELETE(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    if (!body.diary_id) {
      return NextResponse.json(
        { error: "diary_id is required" },
        { status: 400 },
      );
    }

    await DiaryEntry.deleteOne({
      _id: body.diary_id,
      school: session!.user.school_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE", "/api/diary", err);
    return NextResponse.json(
      { error: "Failed to delete diary entry" },
      { status: 500 },
    );
  }
}
