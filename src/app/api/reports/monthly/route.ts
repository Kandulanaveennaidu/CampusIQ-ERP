import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import Attendance from "@/lib/models/Attendance";
import Student from "@/lib/models/Student";
import { getMonthDays } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("reports:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const class_name = searchParams.get("class_name");
    const school_id = session!.user.school_id;

    const now = new Date();
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();

    if (month < 1 || month > 12 || isNaN(month)) {
      return NextResponse.json(
        { error: "Invalid month (1-12)" },
        { status: 400 },
      );
    }
    if (year < 2000 || year > 2100 || isNaN(year)) {
      return NextResponse.json(
        { error: "Invalid year (2000-2100)" },
        { status: 400 },
      );
    }

    await connectDB();

    const daysInMonth = getMonthDays(month, year);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    // Get students
    const studentQuery: Record<string, unknown> = {
      school: school_id,
      status: "active",
    };
    if (class_name) studentQuery.class_name = class_name;
    const students = await Student.find(studentQuery).lean();

    // Get attendance
    const attQuery: Record<string, unknown> = {
      school: school_id,
      date: { $gte: startDate, $lte: endDate },
    };
    if (class_name) attQuery.class_name = class_name;
    const attendance = await Attendance.find(attQuery).lean();

    // Per-student stats
    const studentStats = students.map((student) => {
      const sa = attendance.filter(
        (a) => a.student.toString() === student._id.toString(),
      );
      const present_count = sa.filter((a) => a.status === "present").length;
      const absent_count = sa.filter((a) => a.status === "absent").length;
      const late_count = sa.filter((a) => a.status === "late").length;
      const leave_count = sa.filter((a) => a.status === "leave").length;
      const total_days = sa.length;

      return {
        student_id: student._id.toString(),
        student_name: student.name,
        roll_number: student.roll_number,
        class_name: student.class_name,
        total_days,
        present_count,
        absent_count,
        late_count,
        leave_count,
        percentage:
          total_days > 0 ? Math.round((present_count / total_days) * 100) : 0,
      };
    });

    studentStats.sort((a, b) => {
      const cc = a.class_name.localeCompare(b.class_name);
      return cc !== 0 ? cc : a.roll_number.localeCompare(b.roll_number);
    });

    // Summary
    const presentTotal = studentStats.reduce((s, x) => s + x.present_count, 0);
    const absentTotal = studentStats.reduce((s, x) => s + x.absent_count, 0);
    const lateTotal = studentStats.reduce((s, x) => s + x.late_count, 0);
    const leaveTotal = studentStats.reduce((s, x) => s + x.leave_count, 0);
    const avgAttendance =
      studentStats.length > 0
        ? Math.round(
            studentStats.reduce((s, x) => s + x.percentage, 0) /
              studentStats.length,
          )
        : 0;

    const summary = {
      total_students: students.length,
      average_attendance: avgAttendance,
      total_present: presentTotal,
      total_absent: absentTotal,
      total_late: lateTotal,
      total_leave: leaveTotal,
    };

    const chartData = {
      pie: [
        { name: "Present", value: presentTotal, color: "#22c55e" },
        { name: "Absent", value: absentTotal, color: "#ef4444" },
        { name: "Late", value: lateTotal, color: "#f59e0b" },
        { name: "Leave", value: leaveTotal, color: "#3b82f6" },
      ],
      lowAttendance: studentStats.filter((s) => s.percentage < 75),
    };

    return NextResponse.json({
      success: true,
      data: {
        month,
        year,
        class_name: class_name || "All Classes",
        students: studentStats,
        summary,
        chartData,
      },
    });
  } catch (err) {
    logError("GET", "/api/reports/monthly", err);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
