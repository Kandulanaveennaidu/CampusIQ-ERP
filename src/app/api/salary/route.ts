import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Salary from "@/lib/models/Salary";
import TeacherAttendance from "@/lib/models/TeacherAttendance";
import User from "@/lib/models/User";
import {
  salaryGenerateSchema,
  salaryUpdateSchema,
  validationError,
} from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog, buildChanges } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";
import { notifySalaryProcessed } from "@/lib/twilio-notifications";

// GET - Fetch salary records
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("salary:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const month = parseInt(
      searchParams.get("month") || String(new Date().getMonth() + 1),
    );
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear()),
    );
    const teacherId = searchParams.get("teacher_id");
    const status = searchParams.get("status");

    await connectDB();
    const schoolId = session!.user.school_id;

    logRequest("GET", "/api/salary", session!.user.id, schoolId);

    const page = parseInt(searchParams.get("page") || "1");
    const parsedLimit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * parsedLimit;

    const query: Record<string, unknown> = { school: schoolId, month, year };
    if (teacherId) query.teacher = teacherId;
    if (status) query.status = status;

    const [salaries, total] = await Promise.all([
      Salary.find(query)
        .populate("teacher", "name email subject")
        .sort({ teacherName: 1 })
        .skip(skip)
        .limit(parsedLimit),
      Salary.countDocuments(query),
    ]);

    const summary = {
      total_teachers: salaries.length,
      total_gross: salaries.reduce((s, sal) => s + sal.grossSalary, 0),
      total_deductions: salaries.reduce((s, sal) => s + sal.deductions, 0),
      total_bonus: salaries.reduce((s, sal) => s + sal.bonus, 0),
      total_net: salaries.reduce((s, sal) => s + sal.netSalary, 0),
      drafted: salaries.filter((s) => s.status === "draft").length,
      processed: salaries.filter((s) => s.status === "processed").length,
      paid: salaries.filter((s) => s.status === "paid").length,
    };

    return NextResponse.json({
      success: true,
      data: salaries,
      summary,
      month,
      year,
      pagination: {
        page,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (err) {
    logError("GET", "/api/salary", err);
    return NextResponse.json(
      { error: "Failed to fetch salary records" },
      { status: 500 },
    );
  }
}

// POST - Generate salary for month
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("salary:write");
    if (error) return error;

    const body = await request.json();
    const parsed = salaryGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;
    const { month, year, teacher_id } = parsed.data;

    logRequest("POST", "/api/salary", session!.user.id, schoolId);

    // Get teachers
    const teacherQuery: Record<string, unknown> = {
      school: schoolId,
      role: "teacher",
      isActive: true,
    };
    if (teacher_id) teacherQuery._id = teacher_id;
    const teachers = await User.find(teacherQuery);

    if (teachers.length === 0) {
      return NextResponse.json({ error: "No teachers found" }, { status: 404 });
    }

    // Get attendance for the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const results = [];
    for (const teacher of teachers) {
      // Check if already generated
      const existing = await Salary.findOne({
        school: schoolId,
        teacher: teacher._id,
        month,
        year,
      });
      if (existing) {
        results.push({
          teacher: teacher.name,
          status: "already_exists",
          salary: existing,
        });
        continue;
      }

      // Calculate from attendance
      const attendance = await TeacherAttendance.find({
        school: schoolId,
        teacher: teacher._id,
        date: { $gte: startDate, $lte: endDate },
      });

      const present = attendance.filter((a) => a.status === "present").length;
      const absent = attendance.filter((a) => a.status === "absent").length;
      const late = attendance.filter((a) => a.status === "late").length;
      const leave = attendance.filter((a) => a.status === "leave").length;
      const halfDay = attendance.filter((a) => a.status === "half-day").length;
      const totalDays = attendance.length;
      const effectiveDays = present + late + halfDay * 0.5;

      const salaryPerDay = teacher.salaryPerDay || 0;
      const grossSalary = Math.round(effectiveDays * salaryPerDay);

      const salary = await Salary.create({
        school: schoolId,
        teacher: teacher._id,
        teacherName: teacher.name,
        month,
        year,
        totalDays,
        presentDays: present,
        absentDays: absent,
        lateDays: late,
        leaveDays: leave,
        halfDays: halfDay,
        salaryPerDay,
        grossSalary,
        deductions: 0,
        bonus: 0,
        netSalary: grossSalary,
        status: "draft",
        generatedBy: session!.user.id,
      });

      results.push({ teacher: teacher.name, status: "generated", salary });
    }

    emitActivity({
      type: "salary:processed",
      title: "Salary Generated",
      message: `Salary generated for ${results.length} teacher(s)`,
      module: "salary",
      actionUrl: "/salary",
      session: session!,
    });

    // Fire-and-forget: Notify teachers via SMS + WhatsApp
    for (const r of results) {
      if (r.status === "generated" && r.salary) {
        const teacher = teachers.find((t) => t.name === r.teacher);
        if (teacher?.phone) {
          notifySalaryProcessed(
            teacher.phone,
            teacher.name,
            month,
            year,
            r.salary.netSalary,
            "generated",
          ).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Salary generated for ${results.length} teacher(s)`,
      data: results,
    });
  } catch (err) {
    logError("POST", "/api/salary", err);
    return NextResponse.json(
      { error: "Failed to generate salary" },
      { status: 500 },
    );
  }
}

// PUT - Update salary record
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("salary:manage");
    if (error) return error;

    const body = await request.json();
    const parsed = salaryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const { salary_id, ...updates } = parsed.data;
    const schoolId = session!.user.school_id;

    // CRITICAL: Always scope by school for multi-tenant isolation
    const salary = await Salary.findOne({ _id: salary_id, school: schoolId });
    if (!salary) {
      return NextResponse.json(
        { error: "Salary record not found" },
        { status: 404 },
      );
    }

    const oldValues = salary.toObject();

    if (updates.deductions !== undefined)
      salary.deductions = updates.deductions;
    if (updates.bonus !== undefined) salary.bonus = updates.bonus;
    if (updates.status) {
      salary.status = updates.status;
      if (updates.status === "paid") salary.paidDate = new Date();
    }
    if (updates.payment_method) salary.paymentMethod = updates.payment_method;
    if (updates.transaction_id) salary.transactionId = updates.transaction_id;
    if (updates.notes) salary.notes = updates.notes;

    // Recalculate net salary
    salary.netSalary = salary.grossSalary - salary.deductions + salary.bonus;

    await salary.save();

    // Audit log for financial data
    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "salary",
      entityId: salary_id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      changes: buildChanges(oldValues, salary.toObject(), [
        "deductions",
        "bonus",
        "netSalary",
        "status",
        "paymentMethod",
      ]),
    });

    emitActivity({
      type: "salary:processed",
      title: "Salary Updated",
      message: `${salary.teacherName}'s salary record was updated (₹${salary.netSalary})`,
      module: "salary",
      entityId: salary_id,
      actionUrl: "/salary",
      session: session!,
    });

    // Fire-and-forget: Notify teacher when salary is paid
    if (updates.status === "paid") {
      try {
        const teacher = await User.findById(salary.teacher)
          .select("phone name")
          .lean();
        if (teacher?.phone) {
          notifySalaryProcessed(
            teacher.phone,
            teacher.name,
            salary.month,
            salary.year,
            salary.netSalary,
            "paid",
          ).catch(() => {});
        }
      } catch (_) {
        // Best-effort notification
      }
    }

    logRequest("PUT", "/api/salary", session!.user.id, schoolId);

    return NextResponse.json({ success: true, data: salary });
  } catch (err) {
    logError("PUT", "/api/salary", err);
    return NextResponse.json(
      { error: "Failed to update salary" },
      { status: 500 },
    );
  }
}
