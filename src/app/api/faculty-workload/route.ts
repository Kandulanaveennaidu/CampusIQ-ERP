import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import FacultyWorkload from "@/lib/models/FacultyWorkload";
import Subject from "@/lib/models/Subject";
import User from "@/lib/models/User";
import {
  facultyWorkloadSchema,
  updateWorkloadSchema,
  validationError,
} from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { audit, buildChanges } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("workload:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacher_id");
    const departmentId = searchParams.get("department_id");
    const academicYear = searchParams.get("academic_year");

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/faculty-workload", session!.user.id, schoolId);

    const query: Record<string, unknown> = { school: schoolId };
    if (teacherId) query.teacher = teacherId;
    if (departmentId) query.department = departmentId;
    if (academicYear) query.academicYear = academicYear;

    const workloads = await FacultyWorkload.find(query)
      .populate("teacher", "name email subject")
      .populate("department", "name code")
      .sort({ teacherName: 1 })
      .limit(200);

    const summary = {
      total_faculty: workloads.length,
      under_loaded: workloads.filter((w) => w.status === "under-loaded").length,
      optimal: workloads.filter((w) => w.status === "optimal").length,
      over_loaded: workloads.filter((w) => w.status === "over-loaded").length,
      avg_hours:
        workloads.length > 0
          ? Math.round(
              workloads.reduce((s, w) => s + w.totalHoursPerWeek, 0) /
                workloads.length,
            )
          : 0,
    };

    return NextResponse.json({ success: true, data: workloads, summary });
  } catch (err) {
    logError("GET", "/api/faculty-workload", err);
    return NextResponse.json(
      { error: "Failed to fetch workloads" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("workload:write");
    if (error) return error;

    const body = await request.json();
    const parsed = facultyWorkloadSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const teacher = await User.findOne({
      _id: parsed.data.teacher_id,
      school: schoolId,
      role: "teacher",
    });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Build subjects array with full details
    const subjectsData = [];
    for (const s of parsed.data.subjects) {
      const subject = await Subject.findById(s.subject_id);
      subjectsData.push({
        subject: s.subject_id,
        subjectName: subject?.name || "",
        subjectCode: subject?.code || "",
        className: s.class_name,
        type: s.type,
        hoursPerWeek: s.hours_per_week,
        credits: subject?.credits || 0,
      });
    }

    const existing = await FacultyWorkload.findOne({
      school: schoolId,
      teacher: parsed.data.teacher_id,
      academicYear: parsed.data.academic_year,
    });

    if (existing) {
      existing.subjects = subjectsData as unknown as typeof existing.subjects;
      existing.maxHoursPerWeek = parsed.data.max_hours_per_week;
      if (parsed.data.department_id)
        existing.department = parsed.data
          .department_id as unknown as typeof existing.department;
      await existing.save();

      await audit({
        action: "update",
        entity: "faculty_workload",
        entityId: existing._id.toString(),
        schoolId,
        userId: session!.user.id || "",
        userName: session!.user.name,
        userRole: session!.user.role,
      });

      emitActivity({
        type: "workload:updated",
        title: "Faculty Workload Updated",
        message: `${teacher.name}'s workload has been updated`,
        module: "faculty-workload",
        entityId: existing._id.toString(),
        actionUrl: "/faculty-workload",
        session: session!,
      });

      return NextResponse.json({ success: true, data: existing });
    }

    const workload = new FacultyWorkload({
      school: schoolId,
      teacher: parsed.data.teacher_id,
      teacherName: teacher.name,
      department: parsed.data.department_id || null,
      academicYear: parsed.data.academic_year,
      subjects: subjectsData,
      maxHoursPerWeek: parsed.data.max_hours_per_week,
    });

    await workload.save();

    await audit({
      action: "create",
      entity: "faculty_workload",
      entityId: workload._id.toString(),
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    logRequest("POST", "/api/faculty-workload", session!.user.id, schoolId);

    emitActivity({
      type: "workload:assigned",
      title: "Faculty Workload Assigned",
      message: `Workload assigned to ${teacher.name}`,
      module: "faculty-workload",
      entityId: workload._id.toString(),
      actionUrl: "/faculty-workload",
      session: session!,
    });

    return NextResponse.json(
      { success: true, data: workload },
      { status: 201 },
    );
  } catch (err) {
    logError("POST", "/api/faculty-workload", err);
    return NextResponse.json(
      { error: "Failed to save workload" },
      { status: 500 },
    );
  }
}

// PUT - Update workload
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("workload:write");
    if (error) return error;

    const body = await request.json();
    const parsed = updateWorkloadSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const workload = await FacultyWorkload.findOne({
      _id: parsed.data.workload_id,
      school: schoolId,
    });
    if (!workload) {
      return NextResponse.json(
        { error: "Workload not found" },
        { status: 404 },
      );
    }

    const oldObj = workload.toObject();

    if (parsed.data.max_hours_per_week !== undefined)
      workload.maxHoursPerWeek = parsed.data.max_hours_per_week;
    if (parsed.data.department_id !== undefined)
      workload.department = parsed.data
        .department_id as unknown as typeof workload.department;
    if (parsed.data.academic_year !== undefined)
      workload.academicYear = parsed.data.academic_year;

    if (parsed.data.subjects !== undefined) {
      const subjectsData = [];
      for (const s of parsed.data.subjects) {
        const subject = await Subject.findById(s.subject_id);
        subjectsData.push({
          subject: s.subject_id,
          subjectName: subject?.name || "",
          subjectCode: subject?.code || "",
          className: s.class_name,
          type: s.type,
          hoursPerWeek: s.hours_per_week,
          credits: subject?.credits || 0,
        });
      }
      workload.subjects = subjectsData as unknown as typeof workload.subjects;
    }

    await workload.save();

    const changes = buildChanges(oldObj, workload.toObject(), [
      "maxHoursPerWeek",
      "totalHoursPerWeek",
      "status",
    ]);

    await audit({
      action: "update",
      entity: "faculty_workload",
      entityId: parsed.data.workload_id,
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      changes,
    });

    logRequest("PUT", "/api/faculty-workload", session!.user.id, schoolId);

    emitActivity({
      type: "workload:updated",
      title: "Faculty Workload Updated",
      message: `${workload.teacherName}'s workload has been updated`,
      module: "faculty-workload",
      entityId: parsed.data.workload_id,
      actionUrl: "/faculty-workload",
      session: session!,
    });

    return NextResponse.json({ success: true, data: workload });
  } catch (err) {
    logError("PUT", "/api/faculty-workload", err);
    return NextResponse.json(
      { error: "Failed to update workload" },
      { status: 500 },
    );
  }
}

// DELETE - Remove workload assignment
export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("workload:write");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const workloadId = searchParams.get("workload_id");
    if (!workloadId) {
      return NextResponse.json(
        { error: "workload_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const workload = await FacultyWorkload.findOne({
      _id: workloadId,
      school: schoolId,
    });
    if (!workload) {
      return NextResponse.json(
        { error: "Workload not found" },
        { status: 404 },
      );
    }

    await FacultyWorkload.deleteOne({ _id: workloadId, school: schoolId });

    await audit({
      action: "delete",
      entity: "faculty_workload",
      entityId: workloadId,
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { teacherName: workload.teacherName },
    });

    logRequest("DELETE", "/api/faculty-workload", session!.user.id, schoolId);

    emitActivity({
      type: "workload:deleted",
      title: "Faculty Workload Removed",
      message: `${workload.teacherName}'s workload assignment has been removed`,
      module: "faculty-workload",
      entityId: workloadId,
      actionUrl: "/faculty-workload",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: "Workload assignment deleted successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/faculty-workload", err);
    return NextResponse.json(
      { error: "Failed to delete workload" },
      { status: 500 },
    );
  }
}
