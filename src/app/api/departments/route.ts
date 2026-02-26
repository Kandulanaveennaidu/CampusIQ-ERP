import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Department from "@/lib/models/Department";
import User from "@/lib/models/User";
import { departmentSchema, validationError } from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog, buildChanges } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";
import {
  guardDepartmentDeletion,
  cascadeDepartmentDeletion,
} from "@/lib/cascade";
import Subject from "@/lib/models/Subject";

export async function GET() {
  try {
    const { error, session } = await requireAuth("departments:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/departments", session!.user.id, schoolId);

    const departments = await Department.find({ school: schoolId })
      .populate("hodId", "name email")
      .sort({ name: 1 })
      .limit(200);

    return NextResponse.json({ success: true, data: departments });
  } catch (err) {
    logError("GET", "/api/departments", err);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("departments:write");
    if (error) return error;

    const body = await request.json();
    const parsed = departmentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    let hodName = "";
    if (parsed.data.hod_id) {
      const hod = await User.findOne({
        _id: parsed.data.hod_id,
        school: schoolId,
      });
      hodName = hod?.name || "";
    }

    const department = await Department.create({
      school: schoolId,
      name: parsed.data.name,
      code: parsed.data.code,
      description: parsed.data.description,
      hodId: parsed.data.hod_id || null,
      hodName,
    });

    createAuditLog({
      school: schoolId,
      action: "create",
      entity: "department",
      entityId: department._id.toString(),
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { name: parsed.data.name, code: parsed.data.code },
    });

    emitActivity({
      type: "department:created",
      title: "New Department Created",
      message: `${parsed.data.name} department was created`,
      module: "departments",
      entityId: department._id.toString(),
      actionUrl: "/departments",
      session: session!,
    });

    logRequest("POST", "/api/departments", session!.user.id, schoolId);
    return NextResponse.json(
      { success: true, data: department },
      { status: 201 },
    );
  } catch (err) {
    logError("POST", "/api/departments", err);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("departments:write");
    if (error) return error;

    const body = await request.json();
    const { department_id, ...updates } = body;

    if (!department_id) {
      return NextResponse.json(
        { error: "department_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // CRITICAL: Scope by school for multi-tenant isolation
    const dept = await Department.findOne({
      _id: department_id,
      school: schoolId,
    });
    if (!dept) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    const oldValues = dept.toObject();

    if (updates.name) dept.name = updates.name;
    if (updates.code) dept.code = updates.code;
    if (updates.description !== undefined)
      dept.description = updates.description;
    if (updates.hod_id !== undefined) {
      dept.hodId = updates.hod_id || null;
      if (updates.hod_id) {
        const hod = await User.findById(updates.hod_id);
        dept.hodName = hod?.name || "";
      } else {
        dept.hodName = "";
      }
    }
    if (updates.status) dept.status = updates.status;

    await dept.save();

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "department",
      entityId: department_id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      changes: buildChanges(oldValues, dept.toObject(), [
        "name",
        "code",
        "description",
        "hodId",
        "status",
      ]),
    });

    emitActivity({
      type: "department:updated",
      title: "Department Updated",
      message: `${dept.name} department was updated`,
      module: "departments",
      entityId: department_id,
      actionUrl: "/departments",
      session: session!,
    });

    logRequest("PUT", "/api/departments", session!.user.id, schoolId);
    return NextResponse.json({ success: true, data: dept });
  } catch (err) {
    logError("PUT", "/api/departments", err);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("departments:delete");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Department ID required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // Guard: check for active subjects referencing this department
    const guardError = await guardDepartmentDeletion(id, schoolId);
    if (guardError) {
      return NextResponse.json({ error: guardError }, { status: 409 });
    }

    // CRITICAL: Scope by school for multi-tenant isolation
    const deleted = await Department.findOneAndDelete({
      _id: id,
      school: schoolId,
    });
    if (!deleted) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    // Cascade: nullify department references on related entities
    const cascadeResult = await cascadeDepartmentDeletion(id, schoolId);

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "department",
      entityId: id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { departmentName: deleted.name, cascade: cascadeResult },
    });

    emitActivity({
      type: "department:deleted",
      title: "Department Deleted",
      message: `${deleted.name} department was deleted`,
      module: "departments",
      entityId: id,
      actionUrl: "/departments",
      session: session!,
    });

    logRequest("DELETE", "/api/departments", session!.user.id, schoolId);
    return NextResponse.json({ success: true, message: "Department deleted" });
  } catch (err) {
    logError("DELETE", "/api/departments", err);
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 },
    );
  }
}
