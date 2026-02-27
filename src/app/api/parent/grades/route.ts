import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import { Exam, Grade } from "@/lib/models/Exam";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";

/**
 * GET /api/parent/grades?student_id=xxx
 * Returns exam grades for the parent's child.
 */
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireRole("parent");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

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

    // Get all grades for this student
    const grades = await Grade.find({ student: studentId })
      .sort({ createdAt: -1 })
      .lean();

    // Load associated exams
    const examIds = [...new Set(grades.map((g) => g.exam.toString()))];
    const exams = await Exam.find({ _id: { $in: examIds } }).lean();
    const examMap = new Map(exams.map((e) => [e._id.toString(), e]));

    const records = grades.map((g) => {
      const exam = examMap.get(g.exam.toString());
      return {
        grade_id: g._id.toString(),
        exam_id: g.exam.toString(),
        exam_name: exam?.name || "Unknown",
        exam_type: exam?.type || "",
        exam_date: exam?.date || null,
        subject: g.subject,
        className: g.className,
        marksObtained: g.marksObtained,
        totalMarks: g.totalMarks,
        percentage: g.percentage,
        grade: g.grade,
        rank: g.rank,
        remarks: g.remarks || "",
      };
    });

    // Summary stats
    const totalExams = records.length;
    const avgPercentage =
      totalExams > 0
        ? Math.round(
            (records.reduce((sum, r) => sum + r.percentage, 0) / totalExams) *
              100,
          ) / 100
        : 0;

    return NextResponse.json({
      success: true,
      data: records,
      summary: { totalExams, avgPercentage },
    });
  } catch (err) {
    logError("GET", "/api/parent/grades", err);
    return NextResponse.json(
      { error: "Failed to fetch grades" },
      { status: 500 },
    );
  }
}

async function verifyParentChildLink(
  parentUserId: string,
  studentId: string,
): Promise<boolean> {
  const parentUser = await User.findById(parentUserId).lean();
  if (!parentUser) return false;

  const childrenIds = (parentUser.children || []).map(
    (id: { toString: () => string }) => id.toString(),
  );
  if (childrenIds.includes(studentId)) return true;

  const student = await Student.findById(studentId).lean();
  if (student && student.parent_user?.toString() === parentUserId) return true;

  return false;
}
