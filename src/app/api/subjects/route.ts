import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Subject from "@/lib/models/Subject";
import User from "@/lib/models/User";
import { subjectSchema, validationError } from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("subjects:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("department_id");
    const className = searchParams.get("class_name");
    const semester = searchParams.get("semester");

    const page = parseInt(searchParams.get("page") || "1");
    const parsedLimit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * parsedLimit;

    const query: Record<string, unknown> = {
      school: schoolId,
      status: "active",
    };
    if (departmentId) query.department = departmentId;
    if (className) query.className = className;
    if (semester) query.semester = parseInt(semester);

    const [subjects, total] = await Promise.all([
      Subject.find(query)
        .populate("department", "name code")
        .populate("teacherId", "name email")
        .sort({ code: 1 })
        .skip(skip)
        .limit(parsedLimit),
      Subject.countDocuments(query),
    ]);

    logRequest("GET", "/api/subjects", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      data: subjects,
      pagination: {
        page,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (err) {
    logError("GET", "/api/subjects", err);
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("subjects:write");
    if (error) return error;

    const body = await request.json();
    const parsed = subjectSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    let teacherName = "";
    if (parsed.data.teacher_id) {
      const teacher = await User.findOne({
        _id: parsed.data.teacher_id,
        school: schoolId,
      });
      teacherName = teacher?.name || "";
    }

    const subject = await Subject.create({
      school: schoolId,
      name: parsed.data.name,
      code: parsed.data.code,
      credits: parsed.data.credits,
      type: parsed.data.type,
      semester: parsed.data.semester,
      className: parsed.data.class_name,
      department: parsed.data.department_id || null,
      teacherId: parsed.data.teacher_id || null,
      teacherName,
      maxStudents: parsed.data.max_students,
    });

    logRequest("POST", "/api/subjects", session!.user.id, schoolId);

    emitActivity({
      type: "subject:created",
      title: "New Subject Added",
      message: `${subject.name} (${subject.code}) was added`,
      module: "subjects",
      entityId: subject._id.toString(),
      actionUrl: "/subjects",
      session: session!,
    });

    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (err) {
    logError("POST", "/api/subjects", err);
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("subjects:write");
    if (error) return error;

    const body = await request.json();
    const { subject_id, ...updates } = body;

    if (!subject_id) {
      return NextResponse.json(
        { error: "subject_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // CRITICAL: Scope by school for multi-tenant isolation
    const subject = await Subject.findOne({
      _id: subject_id,
      school: schoolId,
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    Object.entries(updates).forEach(([key, value]) => {
      const fieldMap: Record<string, string> = {
        name: "name",
        code: "code",
        credits: "credits",
        type: "type",
        semester: "semester",
        class_name: "className",
        department_id: "department",
        teacher_id: "teacherId",
        max_students: "maxStudents",
        status: "status",
      };
      const field = fieldMap[key];
      if (field && value !== undefined) {
        (subject as unknown as Record<string, unknown>)[field] = value;
      }
    });

    if (updates.teacher_id) {
      const teacher = await User.findById(updates.teacher_id);
      subject.teacherName = teacher?.name || "";
    }

    await subject.save();

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "subject",
      entityId: subject_id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "subject:updated",
      title: "Subject Updated",
      message: `${subject.name} was updated`,
      module: "subjects",
      entityId: subject_id,
      actionUrl: "/subjects",
      session: session!,
    });

    logRequest("PUT", "/api/subjects", session!.user.id, schoolId);
    return NextResponse.json({ success: true, data: subject });
  } catch (err) {
    logError("PUT", "/api/subjects", err);
    return NextResponse.json(
      { error: "Failed to update subject" },
      { status: 500 },
    );
  }
}

// DELETE - Deactivate subject
export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("subjects:write");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject_id");
    if (!subjectId) {
      return NextResponse.json(
        { error: "subject_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const subject = await Subject.findOne({
      _id: subjectId,
      school: schoolId,
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    subject.status = "inactive";
    await subject.save();

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "subject",
      entityId: subjectId,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { name: subject.name, code: subject.code },
    });

    emitActivity({
      type: "subject:deleted",
      title: "Subject Deactivated",
      message: `${subject.name} (${subject.code}) was deactivated`,
      module: "subjects",
      entityId: subjectId,
      actionUrl: "/subjects",
      session: session!,
    });

    logRequest("DELETE", "/api/subjects", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      message: "Subject deactivated successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/subjects", err);
    return NextResponse.json(
      { error: "Failed to delete subject" },
      { status: 500 },
    );
  }
}
