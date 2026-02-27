import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Assignment from "@/lib/models/Assignment";
import Student from "@/lib/models/Student";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";
import { notifyAssignment } from "@/lib/twilio-notifications";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("exams:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class_name");
    const subject = searchParams.get("subject");
    const teacher = searchParams.get("teacher");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { school: schoolId };
    if (className) query.class_name = className;
    if (subject) query.subject = subject;
    if (status) query.status = status;

    // Teachers see only their own assignments, admin sees all
    if (session!.user.role === "teacher") {
      if (teacher) query.teacher = teacher;
      else query.teacher = session!.user.id;
    } else if (teacher) {
      query.teacher = teacher;
    }

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate("teacher", "name email")
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Assignment.countDocuments(query),
    ]);

    // Strip full submissions from list view for performance
    const data = assignments.map((a) => ({
      ...a,
      submissionCount: a.submissions?.length || 0,
      submissions: undefined,
    }));

    logRequest("GET", "/api/assignments", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("GET", "/api/assignments", err);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

    const body = await request.json();
    const {
      title,
      description,
      subject,
      class_name,
      section,
      dueDate,
      attachments,
      maxMarks,
    } = body;

    if (!title || !subject || !class_name || !dueDate) {
      return NextResponse.json(
        { error: "title, subject, class_name, and dueDate are required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const assignment = await Assignment.create({
      school: schoolId,
      title,
      description: description || "",
      subject,
      class_name,
      section: section || "",
      teacher: session!.user.id,
      dueDate: new Date(dueDate),
      attachments: attachments || [],
      maxMarks: maxMarks || 100,
      status: "active",
    });

    createAuditLog({
      school: schoolId,
      action: "create",
      entity: "assignment",
      entityId: assignment._id.toString(),
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "assignment:created",
      title: "New Assignment",
      message: `${title} for ${class_name} (${subject})`,
      module: "assignments",
      entityId: assignment._id.toString(),
      actionUrl: "/assignments",
      session: session!,
    });

    // Fire-and-forget SMS + WhatsApp notifications to parents
    try {
      const students = await Student.find({
        school: schoolId,
        class_name,
        status: "active",
      })
        .select("parent_phone")
        .lean();

      const dueDateStr = new Date(dueDate).toLocaleDateString("en-IN");
      for (const s of students) {
        if (s.parent_phone) {
          notifyAssignment(
            s.parent_phone,
            class_name,
            subject,
            title,
            dueDateStr,
          ).catch(() => {});
        }
      }
    } catch {
      // Notification is best-effort
    }

    logRequest("POST", "/api/assignments", session!.user.id, schoolId);
    return NextResponse.json(
      { success: true, data: assignment },
      { status: 201 },
    );
  } catch (err) {
    logError("POST", "/api/assignments", err);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 },
    );
  }
}
