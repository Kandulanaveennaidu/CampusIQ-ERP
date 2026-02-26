import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/permissions";
import { studentSchema, validationError } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";
import { formatDateForStorage, escapeRegex } from "@/lib/utils";
import { notifyStudentRegistration } from "@/lib/twilio-notifications";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const school_id = session!.user.school_id;
    const class_name = searchParams.get("class_name");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );

    await connectDB();

    const query: Record<string, unknown> = {
      school: school_id,
      status: "active",
    };
    if (class_name) query.class_name = class_name;
    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { roll_number: { $regex: escaped, $options: "i" } },
        { parent_name: { $regex: escaped, $options: "i" } },
      ];
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .sort({ class_name: 1, roll_number: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = students.map((s) => ({
      student_id: s._id.toString(),
      school_id: s.school.toString(),
      class_name: s.class_name,
      roll_number: s.roll_number,
      name: s.name,
      parent_name: s.parent_name || "",
      parent_phone: s.parent_phone || "",
      email: s.email || "",
      address: s.address || "",
      admission_date: s.admission_date || "",
      status: s.status,
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logError("GET", "/api/students", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    const body = await request.json();
    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const {
      class_name,
      roll_number,
      name,
      parent_name,
      parent_phone,
      email,
      address,
    } = parsed.data;
    const school_id = session!.user.school_id;

    await connectDB();

    const duplicate = await Student.findOne({
      school: school_id,
      class_name,
      roll_number,
      status: "active",
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Roll number already exists in this class" },
        { status: 400 },
      );
    }

    const admission_date = formatDateForStorage(new Date());

    const student = await Student.create({
      school: school_id,
      class_name,
      roll_number,
      name,
      parent_name: parent_name || "",
      parent_phone: parent_phone || "",
      email: email || "",
      address: address || "",
      admission_date,
      status: "active",
    });

    await audit({
      action: "create",
      entity: "student",
      entityId: student._id.toString(),
      schoolId: school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "student:created",
      title: "New Student Added",
      message: `${name} was added to ${class_name}`,
      module: "students",
      entityId: student._id.toString(),
      actionUrl: "/students",
      session: session!,
    });

    // Fire-and-forget: Notify parent via SMS + WhatsApp
    if (parent_phone) {
      notifyStudentRegistration(
        parent_phone,
        parent_name || "Parent",
        name,
        class_name,
        roll_number,
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Student added successfully",
      data: {
        student_id: student._id.toString(),
        school_id,
        class_name,
        roll_number,
        name,
        parent_name: parent_name || "",
        parent_phone: parent_phone || "",
        email: email || "",
        address: address || "",
        admission_date,
        status: "active",
      },
    });
  } catch (error) {
    logError("POST", "/api/students", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 },
    );
  }
}
