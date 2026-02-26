import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Assignment from "@/lib/models/Assignment";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;

    const assignment = await Assignment.findOne({
      _id: params.id,
      school: schoolId,
    })
      .populate("teacher", "name email")
      .populate("submissions.student", "name rollNumber class_name")
      .populate("submissions.gradedBy", "name");

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    logRequest(
      "GET",
      `/api/assignments/${params.id}`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({ success: true, data: assignment });
  } catch (err) {
    logError("GET", "/api/assignments/[id]", err);
    return NextResponse.json(
      { error: "Failed to fetch assignment" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

    const body = await request.json();
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

    // Only the teacher who created or admin can update
    if (
      session!.user.role !== "admin" &&
      assignment.teacher.toString() !== session!.user.id
    ) {
      return NextResponse.json(
        { error: "You can only edit your own assignments" },
        { status: 403 },
      );
    }

    const allowedFields = [
      "title",
      "description",
      "subject",
      "class_name",
      "section",
      "dueDate",
      "attachments",
      "status",
      "maxMarks",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "dueDate") {
          (assignment as Record<string, unknown>)[field] = new Date(
            body[field],
          );
        } else {
          (assignment as Record<string, unknown>)[field] = body[field];
        }
      }
    }

    await assignment.save();

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "assignment",
      entityId: params.id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    logRequest(
      "PUT",
      `/api/assignments/${params.id}`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({ success: true, data: assignment });
  } catch (err) {
    logError("PUT", "/api/assignments/[id]", err);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

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

    if (
      session!.user.role !== "admin" &&
      assignment.teacher.toString() !== session!.user.id
    ) {
      return NextResponse.json(
        { error: "You can only delete your own assignments" },
        { status: 403 },
      );
    }

    await Assignment.deleteOne({ _id: params.id, school: schoolId });

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "assignment",
      entityId: params.id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { title: assignment.title },
    });

    logRequest(
      "DELETE",
      `/api/assignments/${params.id}`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/assignments/[id]", err);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 },
    );
  }
}
