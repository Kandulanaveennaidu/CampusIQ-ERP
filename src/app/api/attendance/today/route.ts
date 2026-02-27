import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import Attendance from "@/lib/models/Attendance";
import Student from "@/lib/models/Student";
import { formatDateForStorage } from "@/lib/utils";
import { format, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("attendance:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const class_name = searchParams.get("class_name");
    const school_id = session!.user.school_id;
    const today = formatDateForStorage(new Date());

    await connectDB();

    // Get all active students
    const studentQuery: Record<string, unknown> = {
      school: school_id,
      status: "active",
    };
    if (class_name) studentQuery.class_name = class_name;
    const students = await Student.find(studentQuery)
      .sort({ class_name: 1, roll_number: 1 })
      .lean();

    // Get today's attendance
    const attQuery: Record<string, unknown> = {
      date: today,
      school: school_id,
    };
    if (class_name) attQuery.class_name = class_name;
    const attendance = await Attendance.find(attQuery).lean();
    const attendanceMap = new Map(
      attendance.map((a) => [a.student.toString(), a]),
    );

    // Build student list with today's status
    const studentsWithAttendance = students.map((student) => {
      const record = attendanceMap.get(student._id.toString());
      return {
        student_id: student._id.toString(),
        roll_number: student.roll_number,
        name: student.name,
        class_name: student.class_name,
        status: record ? record.status : null,
        notes: record ? record.notes || "" : "",
      };
    });

    const markedCount = studentsWithAttendance.filter(
      (s) => s.status !== null,
    ).length;
    const stats = {
      total: students.length,
      marked: markedCount,
      unmarked: students.length - markedCount,
      present: attendance.filter((a) => a.status === "present").length,
      absent: attendance.filter((a) => a.status === "absent").length,
      late: attendance.filter((a) => a.status === "late").length,
      leave: attendance.filter((a) => a.status === "leave").length,
    };

    // Last 7 days trend
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      dates.push(formatDateForStorage(subDays(new Date(), i)));
    }

    const trendQuery: Record<string, unknown> = {
      date: { $in: dates },
      school: school_id,
    };
    if (class_name) trendQuery.class_name = class_name;

    const trendData = await Attendance.find(trendQuery).lean();
    const trendByDate = new Map<string, typeof trendData>();
    trendData.forEach((a) => {
      const existing = trendByDate.get(a.date) || [];
      existing.push(a);
      trendByDate.set(a.date, existing);
    });

    const trend = dates.map((date, i) => {
      const dayRecords = trendByDate.get(date) || [];
      return {
        date: format(subDays(new Date(), 6 - i), "dd MMM"),
        present: dayRecords.filter((a) => a.status === "present").length,
        absent: dayRecords.filter((a) => a.status === "absent").length,
        late: dayRecords.filter((a) => a.status === "late").length,
      };
    });

    return NextResponse.json({
      success: true,
      data: studentsWithAttendance,
      stats,
      trend,
      date: today,
    });
  } catch (err) {
    logError("GET", "/api/attendance/today", err);
    return NextResponse.json(
      { error: "Failed to fetch today's attendance" },
      { status: 500 },
    );
  }
}
