import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { connectDB } from "@/lib/db";
import Student from "@/lib/models/Student";
import { updateStudentSchema, validationError } from "@/lib/validators";
import { logError } from "@/lib/logger";
import { createAuditLog, buildChanges } from "@/lib/audit";
import { cascadeStudentDeactivation } from "@/lib/cascade";
import { emitActivity } from "@/lib/socket-io";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // Always scope by school - no admin bypass for multi-tenant isolation
    const student = await Student.findOne({ _id: id, school: schoolId }).lean();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        student_id: student._id.toString(),
        school_id: student.school.toString(),
        class_name: student.class_name,
        roll_number: student.roll_number,
        name: student.name,
        parent_name: student.parent_name || "",
        parent_phone: student.parent_phone || "",
        parent_email: student.parent_email || "",
        email: student.email || "",
        address: student.address || "",
        admission_date: student.admission_date || "",
        status: student.status,
      },
    });
  } catch (err) {
    logError("GET", "/api/students/[id]", err);
    return NextResponse.json(
      { error: "Failed to fetch student" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // Always scope by school for multi-tenant isolation
    const student = await Student.findOne({ _id: id, school: schoolId });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check for duplicate roll number if changed
    if (body.roll_number && body.roll_number !== student.roll_number) {
      const duplicate = await Student.findOne({
        school: student.school,
        class_name: body.class_name || student.class_name,
        roll_number: body.roll_number,
        _id: { $ne: student._id },
        status: "active",
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Roll number already exists in this class" },
          { status: 400 },
        );
      }
    }

    // Capture old values for audit
    const oldValues = student.toObject();

    // Update fields from validated data
    const data = parsed.data;
    if (data.class_name) student.class_name = data.class_name;
    if (data.roll_number) student.roll_number = data.roll_number;
    if (data.name) student.name = data.name;
    if (data.parent_name !== undefined) student.parent_name = data.parent_name;
    if (data.parent_phone !== undefined)
      student.parent_phone = data.parent_phone;
    if (data.email !== undefined) student.email = data.email;
    if (data.address !== undefined) student.address = data.address;

    await student.save();

    // Audit log
    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "student",
      entityId: id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      changes: buildChanges(oldValues, student.toObject(), [
        "class_name",
        "roll_number",
        "name",
        "parent_name",
        "parent_phone",
        "email",
        "address",
      ]),
    });

    emitActivity({
      type: "student:updated",
      title: "Student Updated",
      message: `${student.name} (${student.class_name}) was updated`,
      module: "students",
      entityId: id,
      actionUrl: "/students",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: "Student updated successfully",
      data: {
        student_id: student._id.toString(),
        school_id: student.school.toString(),
        class_name: student.class_name,
        roll_number: student.roll_number,
        name: student.name,
        parent_name: student.parent_name || "",
        parent_phone: student.parent_phone || "",
        parent_email: student.parent_email || "",
        email: student.email || "",
        address: student.address || "",
        admission_date: student.admission_date || "",
        status: student.status,
      },
    });
  } catch (err) {
    logError("PUT", "/api/students/[id]", err);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { error, session } = await requireAuth("students:delete");
    if (error) return error;

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // Always scope by school for multi-tenant isolation
    const student = await Student.findOne({ _id: id, school: schoolId });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Soft delete - update status to inactive
    student.status = "inactive";
    await student.save();

    // Cascade: remove from transport assignments
    const cascadeResult = await cascadeStudentDeactivation(id, schoolId);

    // Audit log
    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "student",
      entityId: id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { cascade: cascadeResult },
    });

    emitActivity({
      type: "student:deleted",
      title: "Student Removed",
      message: `${student.name} was removed from ${student.class_name}`,
      module: "students",
      entityId: id,
      actionUrl: "/students",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/students/[id]", err);
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 },
    );
  }
}
