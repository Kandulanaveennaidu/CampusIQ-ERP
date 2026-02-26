import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Assignment from "@/lib/models/Assignment";
import { logRequest, logError } from "@/lib/logger";

// POST — Student submits homework
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:read");
    if (error) return error;

    const body = await request.json();
    const { student_id, content, attachments } = body;

    if (!student_id) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const assignment = await Assignment.findOne({
      _id: params.id,
      school: schoolId,
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    if (assignment.status === "closed") {
      return NextResponse.json(
        { error: "This assignment is closed for submissions" },
        { status: 400 },
      );
    }

    // Check if student already submitted
    const existingIdx = assignment.submissions.findIndex(
      (s) => s.student.toString() === student_id,
    );

    if (existingIdx >= 0) {
      // Update existing submission
      assignment.submissions[existingIdx].content = content || "";
      assignment.submissions[existingIdx].attachments = attachments || [];
      assignment.submissions[existingIdx].submittedAt = new Date();
    } else {
      // New submission
      assignment.submissions.push({
        student: student_id,
        submittedAt: new Date(),
        content: content || "",
        attachments: attachments || [],
      } as never);
    }

    await assignment.save();

    logRequest(
      "POST",
      `/api/assignments/${params.id}/submit`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({
      success: true,
      message:
        existingIdx >= 0
          ? "Submission updated"
          : "Homework submitted successfully",
    });
  } catch (err) {
    logError("POST", "/api/assignments/[id]/submit", err);
    return NextResponse.json(
      { error: "Failed to submit homework" },
      { status: 500 },
    );
  }
}

// PUT — Teacher grades a submission
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

    const body = await request.json();
    const { student_id, grade, feedback } = body;

    if (!student_id || grade === undefined) {
      return NextResponse.json(
        { error: "student_id and grade are required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const assignment = await Assignment.findOne({
      _id: params.id,
      school: schoolId,
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    const submissionIdx = assignment.submissions.findIndex(
      (s) => s.student.toString() === student_id,
    );

    if (submissionIdx < 0) {
      return NextResponse.json(
        { error: "Submission not found for this student" },
        { status: 404 },
      );
    }

    assignment.submissions[submissionIdx].grade = grade;
    assignment.submissions[submissionIdx].feedback = feedback || "";
    assignment.submissions[submissionIdx].gradedAt = new Date();
    assignment.submissions[submissionIdx].gradedBy = session!.user.id as never;

    await assignment.save();

    logRequest(
      "PUT",
      `/api/assignments/${params.id}/submit`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({
      success: true,
      message: "Submission graded successfully",
    });
  } catch (err) {
    logError("PUT", "/api/assignments/[id]/submit", err);
    return NextResponse.json(
      { error: "Failed to grade submission" },
      { status: 500 },
    );
  }
}
