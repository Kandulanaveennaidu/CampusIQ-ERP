import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LeaveRequest from "@/lib/models/LeaveRequest";
import User from "@/lib/models/User";
import { logError } from "@/lib/logger";

/**
 * GET /api/staff-leave-calendar — Get leave data for calendar view
 * LeaveRequest model fields: from_date/to_date (strings "YYYY-MM-DD"),
 * student (ref "Student"), student_name, class_name, reason, status
 * Query: ?month=2024-01&class_name=10A
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("leaves:read");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM
    const className = searchParams.get("class_name");
    const schoolId = session!.user.school_id;

    // Build date range as strings (from_date / to_date are strings in model)
    let startStr: string;
    let endStr: string;

    if (month) {
      const [y, m] = month.split("-").map(Number);
      startStr = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endStr = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      startStr = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endStr = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
    }

    // Query using from_date/to_date string fields
    const leaveQuery: Record<string, unknown> = {
      school: schoolId,
      $or: [
        { from_date: { $gte: startStr, $lte: endStr } },
        { to_date: { $gte: startStr, $lte: endStr } },
        { from_date: { $lte: startStr }, to_date: { $gte: endStr } },
      ],
    };
    if (className) leaveQuery.class_name = className;

    const leaves = (await LeaveRequest.find(leaveQuery)
      .populate("student", "name class_name roll_number")
      .sort({ from_date: 1 })
      .lean()) as unknown as Record<string, unknown>[];

    // Build calendar data
    const calendarData: Record<
      string,
      {
        date: string;
        leaves: {
          name: string;
          class_name: string;
          status: string;
          studentId: string;
        }[];
      }
    > = {};

    for (const leave of leaves) {
      const studentName = String(
        leave.student_name ||
          (leave.student as Record<string, unknown>)?.name ||
          "Unknown",
      );
      const studentId = String(
        (leave.student as Record<string, unknown>)?._id || leave.student || "",
      );
      const lClassName = String(leave.class_name || "");
      const start = new Date(String(leave.from_date));
      const end = new Date(String(leave.to_date || leave.from_date));

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        if (key >= startStr && key <= endStr) {
          if (!calendarData[key]) calendarData[key] = { date: key, leaves: [] };
          calendarData[key].leaves.push({
            name: studentName,
            class_name: lClassName,
            status: String(leave.status || "pending"),
            studentId,
          });
        }
      }
    }

    // Get unique students on leave
    const studentsOnLeave = new Set(
      leaves.map((l) => {
        const student = l.student as Record<string, unknown> | null;
        return String(student?._id || l.student || "");
      }),
    );

    // Get all teachers/staff for substitute suggestions
    const allStaff = (await User.find({
      school: schoolId,
      role: { $in: ["teacher", "admin"] },
      isActive: true,
    })
      .select("name role")
      .lean()) as unknown as Record<string, unknown>[];

    // Summary
    const summary = {
      totalLeaves: leaves.length,
      approved: leaves.filter((l) => l.status === "approved").length,
      pending: leaves.filter((l) => l.status === "pending").length,
      rejected: leaves.filter((l) => l.status === "rejected").length,
      studentsOnLeave: studentsOnLeave.size,
      totalStaff: allStaff.length,
    };

    return NextResponse.json({
      calendarData: Object.values(calendarData).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      leaves: leaves.map((l) => ({
        _id: String(l._id),
        student: l.student,
        student_name: l.student_name,
        class_name: l.class_name,
        from_date: l.from_date,
        to_date: l.to_date,
        reason: l.reason,
        status: l.status,
      })),
      summary,
      allStaff: allStaff.map((s) => ({
        _id: String(s._id),
        name: s.name,
        role: s.role,
      })),
    });
  } catch (err) {
    logError("GET", "/api/staff-leave-calendar", err);
    return NextResponse.json(
      { error: "Failed to fetch staff leave calendar" },
      { status: 500 },
    );
  }
}
