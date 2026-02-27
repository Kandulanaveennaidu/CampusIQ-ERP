import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import TeacherAttendance from "@/lib/models/TeacherAttendance";
import User from "@/lib/models/User";
import { markTeacherAttendanceSchema, validationError } from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";

// GET - Fetch teacher attendance for a date
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("attendance:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];
    const teacherId = searchParams.get("teacher_id");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    await connectDB();
    const schoolId = session!.user.school_id;

    logRequest("GET", "/api/teacher-attendance", session!.user.id, schoolId);

    // Monthly view
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

      const query: Record<string, unknown> = {
        school: schoolId,
        date: { $gte: startDate, $lte: endDate },
      };
      if (teacherId) query.teacher = teacherId;

      const records = await TeacherAttendance.find(query)
        .populate("teacher", "name email subject")
        .sort({ date: 1 });

      // Get all teachers for summary
      const teachers = await User.find({
        school: schoolId,
        role: "teacher",
        isActive: true,
      }).select("name email subject salaryPerDay");

      const summary = teachers.map((teacher) => {
        const teacherRecords = records.filter((r) => {
          const teacherRef = r.teacher as unknown;
          const tid =
            teacherRef &&
            typeof teacherRef === "object" &&
            "_id" in (teacherRef as Record<string, unknown>)
              ? String((teacherRef as Record<string, unknown>)._id)
              : String(teacherRef || "");
          return tid === teacher._id.toString();
        });
        const present = teacherRecords.filter(
          (r) => r.status === "present",
        ).length;
        const absent = teacherRecords.filter(
          (r) => r.status === "absent",
        ).length;
        const late = teacherRecords.filter((r) => r.status === "late").length;
        const leave = teacherRecords.filter((r) => r.status === "leave").length;
        const halfDay = teacherRecords.filter(
          (r) => r.status === "half-day",
        ).length;
        const totalDays = teacherRecords.length;
        const workingDays = present + late + halfDay * 0.5;

        return {
          teacher_id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          subject: teacher.subject,
          salary_per_day: teacher.salaryPerDay,
          total_days: totalDays,
          present,
          absent,
          late,
          leave,
          half_day: halfDay,
          working_days: workingDays,
          percentage:
            totalDays > 0 ? Math.round((workingDays / totalDays) * 100) : 0,
        };
      });

      return NextResponse.json({ success: true, data: summary, records });
    }

    // Daily view
    const records = await TeacherAttendance.find({
      school: schoolId,
      date,
    }).populate("teacher", "name email subject");

    const teachers = await User.find({
      school: schoolId,
      role: "teacher",
      isActive: true,
    }).select("name email subject");

    const data = teachers.map((teacher) => {
      const record = records.find(
        (r) => r.teacher.toString() === teacher._id.toString(),
      );
      return {
        teacher_id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        subject: teacher.subject,
        status: record?.status || null,
        check_in: record?.checkIn || "",
        check_out: record?.checkOut || "",
        notes: record?.notes || "",
      };
    });

    return NextResponse.json({ success: true, date, data });
  } catch (err) {
    logError("GET", "/api/teacher-attendance", err);
    return NextResponse.json(
      { error: "Failed to fetch teacher attendance" },
      { status: 500 },
    );
  }
}

// POST - Mark teacher attendance
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("attendance:write");
    if (error) return error;

    const body = await request.json();
    const parsed = markTeacherAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;
    const { date, records } = parsed.data;

    logRequest("POST", "/api/teacher-attendance", session!.user.id, schoolId);

    const results = [];
    for (const record of records) {
      // Include school scope for multi-tenant isolation
      const existing = await TeacherAttendance.findOne({
        date,
        teacher: record.teacher_id,
        school: schoolId,
      });

      if (existing) {
        existing.status = record.status;
        existing.checkIn = record.check_in;
        existing.checkOut = record.check_out;
        existing.notes = record.notes;
        existing.markedBy = session!.user
          .id as unknown as typeof existing.markedBy;
        await existing.save();
        results.push(existing);
      } else {
        const newRecord = await TeacherAttendance.create({
          date,
          school: schoolId,
          teacher: record.teacher_id,
          status: record.status,
          checkIn: record.check_in,
          checkOut: record.check_out,
          notes: record.notes,
          markedBy: session!.user.id,
        });
        results.push(newRecord);
      }
    }

    emitActivity({
      type: "attendance:teacher_marked",
      title: "Teacher Attendance Marked",
      message: `Attendance marked for ${results.length} teacher(s)`,
      module: "teacher-attendance",
      actionUrl: "/teacher-attendance",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: `Attendance marked for ${results.length} teacher(s)`,
      data: results,
    });
  } catch (err) {
    logError("POST", "/api/teacher-attendance", err);
    return NextResponse.json(
      { error: "Failed to mark teacher attendance" },
      { status: 500 },
    );
  }
}
