import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Promotion from "@/lib/models/Promotion";
import Student from "@/lib/models/Student";
import { promotionSchema, validationError } from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";
import { notifyPromotion } from "@/lib/twilio-notifications";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("promotion:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get("academic_year");
    const fromClass = searchParams.get("from_class");

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/promotions", session!.user.id, schoolId);

    const page = parseInt(searchParams.get("page") || "1");
    const parsedLimit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * parsedLimit;

    const query: Record<string, unknown> = { school: schoolId };
    if (academicYear) query.academicYear = academicYear;
    if (fromClass) query.fromClass = fromClass;

    const [promotions, total] = await Promise.all([
      Promotion.find(query)
        .sort({ promotedAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Promotion.countDocuments(query),
    ]);
    return NextResponse.json({
      success: true,
      data: promotions,
      pagination: {
        page,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (err) {
    logError("GET", "/api/promotions", err);
    return NextResponse.json(
      { error: "Failed to fetch promotions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("promotion:write");
    if (error) return error;

    const body = await request.json();
    const parsed = promotionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("POST", "/api/promotions", session!.user.id, schoolId);

    const {
      academic_year,
      from_class,
      to_class,
      student_ids,
      status,
      remarks,
    } = parsed.data;

    const results = [];
    for (const studentId of student_ids) {
      // CRITICAL: Scope by school for multi-tenant isolation
      const student = await Student.findOne({
        _id: studentId,
        school: schoolId,
      });
      if (!student) continue;

      // Check if already promoted
      const existing = await Promotion.findOne({
        school: schoolId,
        academicYear: academic_year,
        student: studentId,
      });
      if (existing) {
        results.push({ student: student.name, status: "already_promoted" });
        continue;
      }

      // Create promotion record
      const promotion = await Promotion.create({
        school: schoolId,
        academicYear: academic_year,
        fromClass: from_class,
        toClass: to_class,
        student: studentId,
        studentName: student.name,
        rollNumber: student.roll_number,
        status,
        remarks,
        promotedBy: session!.user.id,
      });

      // Update student's class if promoted
      if (status === "promoted" || status === "graduated") {
        student.class_name = to_class;
        await student.save();
      }

      // Notify parent about promotion
      if (student.parent_phone) {
        notifyPromotion(
          student.parent_phone,
          student.name,
          from_class,
          to_class,
          status,
        ).catch(() => {});
      }

      results.push({
        student: student.name,
        status: "promoted",
        data: promotion,
      });
    }

    createAuditLog({
      school: schoolId,
      action: "create",
      entity: "promotion",
      entityId: `${academic_year}-${from_class}-${to_class}`,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: {
        academicYear: academic_year,
        fromClass: from_class,
        toClass: to_class,
        count: results.length,
      },
    });

    emitActivity({
      type: "promotion:processed",
      title: "Student Promotions Processed",
      message: `${results.length} student(s) promoted from ${from_class} to ${to_class}`,
      module: "promotions",
      entityId: `${academic_year}-${from_class}-${to_class}`,
      actionUrl: "/promotions",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} student(s)`,
      data: results,
    });
  } catch (err) {
    logError("POST", "/api/promotions", err);
    return NextResponse.json(
      { error: "Failed to process promotions" },
      { status: 500 },
    );
  }
}
