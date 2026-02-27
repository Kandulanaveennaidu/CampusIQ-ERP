import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Timetable from "@/lib/models/Timetable";
import { requireAuth } from "@/lib/permissions";
import {
  timetableSchema,
  updateTimetableSchema,
  validationError,
} from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { escapeRegex } from "@/lib/utils";
import { emitActivity } from "@/lib/socket-io";
import User from "@/lib/models/User";
import { notifyTeacherUpdate } from "@/lib/twilio-notifications";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("timetable:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class");
    const day = searchParams.get("day");
    const teacher = searchParams.get("teacher");

    await connectDB();

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (className) query.class_name = className;
    if (day) query.day = day;
    if (teacher)
      query.teacher_name = { $regex: escapeRegex(teacher), $options: "i" };

    const entries = await Timetable.find(query)
      .sort({ day: 1, period: 1 })
      .lean();

    const data = entries.map((t) => ({
      timetable_id: t._id.toString(),
      school_id: t.school.toString(),
      class_name: t.class_name,
      day: t.day,
      period: t.period,
      subject: t.subject,
      teacher_name: t.teacher_name || "",
      start_time: t.start_time || "",
      end_time: t.end_time || "",
      room: t.room || "",
    }));

    data.sort((a, b) => {
      const da = DAY_ORDER.indexOf(a.day);
      const db = DAY_ORDER.indexOf(b.day);
      if (da !== db) return da - db;
      return a.period - b.period;
    });

    const byDay: Record<string, typeof data> = {};
    for (const entry of data) {
      if (!byDay[entry.day]) byDay[entry.day] = [];
      byDay[entry.day].push(entry);
    }

    const classes = Array.from(new Set(data.map((d) => d.class_name))).sort();

    return NextResponse.json({ data, byDay, classes });
  } catch (error) {
    logError("GET", "/api/timetable", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("timetable:write");
    if (error) return error;

    const body = await request.json();
    const parsed = timetableSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const {
      class_name,
      day,
      period,
      subject,
      teacher_name,
      start_time,
      end_time,
      room,
      teacher_id,
    } = parsed.data;

    await connectDB();

    const slotConflict = await Timetable.findOne({
      school: session!.user.school_id,
      class_name,
      day,
      period: Number(period),
    });
    if (slotConflict) {
      return NextResponse.json(
        { error: "This time slot is already occupied for this class" },
        { status: 409 },
      );
    }

    if (teacher_name) {
      const teacherConflict = await Timetable.findOne({
        school: session!.user.school_id,
        teacher_name: {
          $regex: `^${escapeRegex(teacher_name)}$`,
          $options: "i",
        },
        day,
        period: Number(period),
      });
      if (teacherConflict) {
        return NextResponse.json(
          {
            error: `${teacher_name} already has a class (${teacherConflict.class_name}) in this slot`,
            conflict: {
              type: "teacher",
              teacher: teacher_name,
              existingClass: teacherConflict.class_name,
              day,
              period: Number(period),
              subject: teacherConflict.subject,
            },
          },
          { status: 409 },
        );
      }
    }

    if (room) {
      const roomConflict = await Timetable.findOne({
        school: session!.user.school_id,
        room: { $regex: `^${escapeRegex(room)}$`, $options: "i" },
        day,
        period: Number(period),
      });
      if (roomConflict) {
        return NextResponse.json(
          {
            error: `Room ${room} is already assigned to ${roomConflict.class_name} in this slot`,
            conflict: {
              type: "room",
              room,
              existingClass: roomConflict.class_name,
              day,
              period: Number(period),
              teacher: roomConflict.teacher_name,
              subject: roomConflict.subject,
            },
          },
          { status: 409 },
        );
      }
    }

    const entry = await Timetable.create({
      school: session!.user.school_id,
      class_name,
      day,
      period: Number(period),
      subject,
      teacher_id: teacher_id || "",
      teacher_name: teacher_name || "",
      start_time: start_time || "",
      end_time: end_time || "",
      room: room || "",
    });

    await audit({
      action: "create",
      entity: "timetable",
      entityId: entry._id.toString(),
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "timetable:updated",
      title: "Timetable Updated",
      message: `${class_name} — ${day} P${period}: ${subject} added`,
      module: "timetable",
      entityId: entry._id.toString(),
      actionUrl: "/timetable",
      session: session!,
    });

    // Fire-and-forget: Notify affected teacher via SMS + WhatsApp
    if (teacher_name) {
      try {
        const teacherUser = await User.findOne({
          school: session!.user.school_id,
          role: "teacher",
          name: { $regex: `^${escapeRegex(teacher_name)}$`, $options: "i" },
          isActive: true,
        }).lean();
        if (teacherUser?.phone) {
          notifyTeacherUpdate(teacherUser.phone, teacherUser.name).catch(
            () => {},
          );
        }
      } catch (_) {
        // Notification is best-effort
      }
    }

    return NextResponse.json({
      message: "Timetable entry added",
      data: { timetable_id: entry._id.toString() },
    });
  } catch (error) {
    logError("POST", "/api/timetable", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("timetable:write");
    if (error) return error;

    const body = await request.json();
    const parsed = updateTimetableSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { timetable_id, subject, teacher_name, start_time, end_time, room } =
      parsed.data;

    await connectDB();

    const update: Record<string, unknown> = {};
    if (subject) update.subject = subject;
    if (teacher_name !== undefined) update.teacher_name = teacher_name;
    if (start_time !== undefined) update.start_time = start_time;
    if (end_time !== undefined) update.end_time = end_time;
    if (room !== undefined) update.room = room;

    // Conflict checks: fetch existing entry first to get day/period
    const existing = await Timetable.findOne({
      _id: timetable_id,
      school: session!.user.school_id,
    });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Teacher conflict check (if teacher is being changed)
    if (teacher_name) {
      const teacherConflict = await Timetable.findOne({
        school: session!.user.school_id,
        teacher_name: {
          $regex: `^${escapeRegex(teacher_name)}$`,
          $options: "i",
        },
        day: existing.day,
        period: existing.period,
        _id: { $ne: timetable_id },
      });
      if (teacherConflict) {
        return NextResponse.json(
          {
            error: `Teacher "${teacher_name}" is already assigned to ${teacherConflict.class_name} on ${existing.day} period ${existing.period}`,
            conflict: {
              type: "teacher",
              existing_class: teacherConflict.class_name,
              subject: teacherConflict.subject,
            },
          },
          { status: 409 },
        );
      }
    }

    // Room conflict check (if room is being changed)
    if (room) {
      const roomConflict = await Timetable.findOne({
        school: session!.user.school_id,
        room: { $regex: `^${escapeRegex(room)}$`, $options: "i" },
        day: existing.day,
        period: existing.period,
        _id: { $ne: timetable_id },
      });
      if (roomConflict) {
        return NextResponse.json(
          {
            error: `Room "${room}" is already booked by ${roomConflict.class_name} on ${existing.day} period ${existing.period}`,
            conflict: {
              type: "room",
              existing_class: roomConflict.class_name,
              teacher: roomConflict.teacher_name,
            },
          },
          { status: 409 },
        );
      }
    }

    const result = await Timetable.findOneAndUpdate(
      { _id: timetable_id, school: session!.user.school_id },
      update,
      { new: true },
    );

    if (!result) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await audit({
      action: "update",
      entity: "timetable",
      entityId: timetable_id,
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "timetable:updated",
      title: "Timetable Updated",
      message: `${result.class_name} — ${result.day} P${result.period} was updated`,
      module: "timetable",
      entityId: timetable_id,
      actionUrl: "/timetable",
      session: session!,
    });

    return NextResponse.json({ message: "Timetable entry updated" });
  } catch (error) {
    logError("PUT", "/api/timetable", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("timetable:delete");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const timetable_id = searchParams.get("timetable_id");

    if (!timetable_id) {
      return NextResponse.json(
        { error: "timetable_id is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const result = await Timetable.findOneAndDelete({
      _id: timetable_id,
      school: session!.user.school_id,
    });

    if (!result) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await audit({
      action: "delete",
      entity: "timetable",
      entityId: timetable_id,
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: {
        deletedEntry: `${result.class_name} ${result.day} P${result.period}`,
      },
    });

    emitActivity({
      type: "timetable:deleted",
      title: "Timetable Entry Removed",
      message: `${result.class_name} — ${result.day} P${result.period} was removed`,
      module: "timetable",
      entityId: timetable_id,
      actionUrl: "/timetable",
      session: session!,
    });

    return NextResponse.json({ message: "Timetable entry deleted" });
  } catch (error) {
    logError("DELETE", "/api/timetable", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
