import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import Attendance from "@/lib/models/Attendance";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { escapeRegex } from "@/lib/utils";

/**
 * GET /api/parent/attendance?student_id=xxx&month=YYYY-MM
 * Returns attendance records for the parent's child.
 */
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireRole("parent");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const month = searchParams.get("month"); // e.g. "2026-02"

    if (!studentId) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Verify parent-child link
    const isLinked = await verifyParentChildLink(
      session!.user.id as string,
      studentId,
    );
    if (!isLinked) {
      return NextResponse.json(
        { error: "You are not authorized to view this student's data" },
        { status: 403 },
      );
    }

    // Build date filter
    const query: Record<string, unknown> = { student: studentId };
    if (month) {
      // Match dates starting with the month prefix (e.g. "2026-02")
      query.date = { $regex: `^${escapeRegex(month)}` };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 }).lean();

    const records = attendance.map((a) => ({
      attendance_id: a._id.toString(),
      date: a.date,
      status: a.status,
      class_name: a.class_name,
      notes: a.notes || "",
      marked_by: a.marked_by || "",
    }));

    // Calculate stats
    const stats = {
      total: records.length,
      present: records.filter((r) => r.status === "present").length,
      absent: records.filter((r) => r.status === "absent").length,
      late: records.filter((r) => r.status === "late").length,
      leave: records.filter((r) => r.status === "leave").length,
    };

    return NextResponse.json({ success: true, data: records, stats });
  } catch (err) {
    logError("GET", "/api/parent/attendance", err);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 },
    );
  }
}

/**
 * Verify that the logged-in parent is linked to the student.
 */
async function verifyParentChildLink(
  parentUserId: string,
  studentId: string,
): Promise<boolean> {
  // Check User.children[]
  const parentUser = await User.findById(parentUserId).lean();
  if (!parentUser) return false;

  const childrenIds = (parentUser.children || []).map(
    (id: { toString: () => string }) => id.toString(),
  );
  if (childrenIds.includes(studentId)) return true;

  // Check Student.parent_user
  const student = await Student.findById(studentId).lean();
  if (student && student.parent_user?.toString() === parentUserId) return true;

  return false;
}
