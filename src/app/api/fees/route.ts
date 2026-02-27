import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { FeeStructure, FeePayment } from "@/lib/models/Fee";
import Student from "@/lib/models/Student";
import School from "@/lib/models/School";
import {
  feeStructureSchema,
  feePaymentSchema,
  updateFeeStructureSchema,
  validationError,
} from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog, buildChanges } from "@/lib/audit";
import { notifyFeeReminder } from "@/lib/twilio-notifications";
import { emitActivity } from "@/lib/socket-io";
import { sendEmail } from "@/lib/email/mailer";
import {
  feeReminderEmail,
  feePaymentConfirmationEmail,
} from "@/lib/email/templates";

// GET - Fetch fee structures and payments
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("fees:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "structures"; // structures | payments | summary
    const className = searchParams.get("class_name");
    const studentId = searchParams.get("student_id");
    const academicYear = searchParams.get("academic_year");
    const status = searchParams.get("status");

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/fees", session!.user.id, schoolId);

    if (type === "structures") {
      const query: Record<string, unknown> = {
        school: schoolId,
        status: "active",
      };
      if (className) query.className = className;
      if (academicYear) query.academicYear = academicYear;

      const structures = await FeeStructure.find(query).sort({ dueDate: 1 });
      return NextResponse.json({ success: true, data: structures });
    }

    if (type === "payments") {
      const query: Record<string, unknown> = { school: schoolId };
      if (studentId) query.student = studentId;
      if (className) query.className = className;
      if (status) query.status = status;

      const payments = await FeePayment.find(query)
        .populate("student", "name roll_number class_name")
        .sort({ paymentDate: -1 })
        .limit(100);

      return NextResponse.json({ success: true, data: payments });
    }

    if (type === "summary") {
      const query: Record<string, unknown> = { school: schoolId };
      if (className) query.className = className;

      const totalCollected = await FeePayment.aggregate([
        { $match: { ...query, status: { $in: ["paid", "partial"] } } },
        { $group: { _id: null, total: { $sum: "$totalPaid" } } },
      ]);

      const totalPending = await FeePayment.aggregate([
        { $match: { ...query, status: { $in: ["pending", "overdue"] } } },
        { $group: { _id: null, total: { $sum: "$balanceDue" } } },
      ]);

      const byCategory = await FeePayment.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total: { $sum: "$totalPaid" },
          },
        },
      ]);

      return NextResponse.json({
        success: true,
        data: {
          total_collected: totalCollected[0]?.total || 0,
          total_pending: totalPending[0]?.total || 0,
          by_status: byCategory,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid type parameter" },
      { status: 400 },
    );
  } catch (err) {
    logError("GET", "/api/fees", err);
    return NextResponse.json(
      { error: "Failed to fetch fees" },
      { status: 500 },
    );
  }
}

// POST - Create fee structure or record payment
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("fees:write");
    if (error) return error;

    const body = await request.json();
    const action = body.action || "create_structure";

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("POST", "/api/fees", session!.user.id, schoolId);

    if (action === "create_structure") {
      const parsed = feeStructureSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const structure = await FeeStructure.create({
        school: schoolId,
        name: parsed.data.name,
        className: parsed.data.class_name,
        academicYear: parsed.data.academic_year,
        amount: parsed.data.amount,
        dueDate: new Date(parsed.data.due_date),
        category: parsed.data.category,
        description: parsed.data.description,
        isRecurring: parsed.data.is_recurring,
        frequency: parsed.data.frequency,
        lateFeePerDay: parsed.data.late_fee_per_day,
      });

      createAuditLog({
        school: schoolId,
        action: "create",
        entity: "fee_structure",
        entityId: structure._id.toString(),
        userId: session!.user.id,
        userName: session!.user.name,
        userRole: session!.user.role,
      });

      emitActivity({
        type: "fee:created",
        title: "New Fee Structure",
        message: `${parsed.data.name} fee of ₹${parsed.data.amount} created for ${parsed.data.class_name}`,
        module: "fees",
        entityId: structure._id.toString(),
        actionUrl: "/fees",
        session: session!,
      });

      // Fire-and-forget SMS + Email fee reminders to parents in this class
      try {
        const studentsInClass = await Student.find({
          school: schoolId,
          class_name: parsed.data.class_name,
          status: "active",
        }).lean();
        const school = await School.findById(schoolId).lean();
        const schoolName = school?.name || "School";
        for (const s of studentsInClass) {
          if (s.parent_phone) {
            notifyFeeReminder(
              s.parent_phone,
              s.name,
              parsed.data.amount,
              parsed.data.due_date,
            ).catch(() => {});
          }
          // Email reminder
          const parentEmail = s.parent_email || s.email;
          if (parentEmail) {
            const html = feeReminderEmail({
              parentName: s.parent_name || "Parent",
              studentName: s.name,
              className: s.class_name || parsed.data.class_name,
              feeName: parsed.data.name,
              amount: parsed.data.amount,
              dueDate: new Date(parsed.data.due_date).toLocaleDateString(
                "en-IN",
              ),
              schoolName,
            });
            sendEmail({
              to: parentEmail,
              subject: `Fee Reminder — ${parsed.data.name}`,
              html,
            }).catch(() => {});
          }
        }
      } catch (_) {
        // SMS/Email is best-effort, don't block the response
      }

      return NextResponse.json(
        { success: true, data: structure },
        { status: 201 },
      );
    }

    if (action === "record_payment") {
      const parsed = feePaymentSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      // Get student and fee structure details - SCOPE BY SCHOOL
      const student = await Student.findOne({
        _id: parsed.data.student_id,
        school: schoolId,
      });
      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 },
        );
      }

      const feeStructure = await FeeStructure.findOne({
        _id: parsed.data.fee_structure_id,
        school: schoolId,
      });
      if (!feeStructure) {
        return NextResponse.json(
          { error: "Fee structure not found" },
          { status: 404 },
        );
      }

      // Calculate late fee
      const now = new Date();
      const dueDate = new Date(feeStructure.dueDate);
      let lateFee = 0;
      if (now > dueDate && feeStructure.lateFeePerDay > 0) {
        const daysLate = Math.ceil(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        lateFee = daysLate * feeStructure.lateFeePerDay;
      }

      // Calculate total previously paid
      const previousPayments = await FeePayment.aggregate([
        {
          $match: {
            school: new mongoose.Types.ObjectId(schoolId),
            student: new mongoose.Types.ObjectId(parsed.data.student_id),
            feeStructure: new mongoose.Types.ObjectId(
              parsed.data.fee_structure_id,
            ),
            status: { $ne: "failed" }, // Exclude failed payments if any
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: "$totalPaid" },
          },
        },
      ]);

      const totalPreviouslyPaid = previousPayments[0]?.totalPaid || 0;
      const totalPaidSoFar = totalPreviouslyPaid + parsed.data.amount;

      const totalAmount = feeStructure.amount + lateFee - parsed.data.discount;
      const balanceDue = totalAmount - totalPaidSoFar;

      // Generate receipt number
      const receiptCount = await FeePayment.countDocuments({
        school: schoolId,
      });
      const receiptNumber = `RCP-${Date.now()}-${receiptCount + 1}`;

      const payment = await FeePayment.create({
        school: schoolId,
        student: student._id,
        studentName: student.name,
        className: student.class_name,
        feeStructure: feeStructure._id,
        feeName: feeStructure.name,
        amount: feeStructure.amount,
        lateFee,
        discount: parsed.data.discount,
        totalPaid: parsed.data.amount,
        balanceDue: Math.max(0, balanceDue),
        paymentDate: now,
        paymentMethod: parsed.data.payment_method,
        receiptNumber,
        status: balanceDue <= 0 ? "paid" : "partial",
        paidBy: parsed.data.paid_by,
        collectedBy: session!.user.id,
        notes: parsed.data.notes,
      });

      createAuditLog({
        school: schoolId,
        action: "create",
        entity: "fee_payment",
        entityId: payment._id.toString(),
        userId: session!.user.id,
        userName: session!.user.name,
        userRole: session!.user.role,
        metadata: {
          amount: parsed.data.amount,
          receiptNumber,
          studentName: student.name,
        },
      });

      emitActivity({
        type: "fee:paid",
        title: "Fee Payment Received",
        message: `₹${parsed.data.amount} received from ${student.name} (${student.class_name})`,
        module: "fees",
        entityId: payment._id.toString(),
        actionUrl: "/fees",
        session: session!,
      });

      // Fire-and-forget payment confirmation email to parent
      try {
        const parentEmail = student.parent_email || student.email;
        if (parentEmail) {
          const school = await School.findById(schoolId).lean();
          const html = feePaymentConfirmationEmail({
            parentName: student.parent_name || "Parent",
            studentName: student.name,
            className: student.class_name,
            feeName: feeStructure.name,
            amountPaid: parsed.data.amount,
            receiptNumber,
            paymentDate: now.toLocaleDateString("en-IN"),
            paymentMethod: parsed.data.payment_method,
            balanceDue: Math.max(0, balanceDue),
            schoolName: school?.name || "School",
          });
          sendEmail({
            to: parentEmail,
            subject: `Payment Confirmation — ${receiptNumber}`,
            html,
          }).catch(() => {});
        }
      } catch (_) {
        // best-effort
      }

      return NextResponse.json(
        { success: true, data: payment, receipt_number: receiptNumber },
        { status: 201 },
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logError("POST", "/api/fees", err);
    return NextResponse.json(
      { error: "Failed to process fee" },
      { status: 500 },
    );
  }
}

// PUT - Update fee structure
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("fees:manage");
    if (error) return error;

    const body = await request.json();
    const parsed = updateFeeStructureSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const structure = await FeeStructure.findOne({
      _id: parsed.data.structure_id,
      school: schoolId,
    });
    if (!structure) {
      return NextResponse.json(
        { error: "Fee structure not found" },
        { status: 404 },
      );
    }

    const oldObj = structure.toObject();

    if (parsed.data.name !== undefined) structure.name = parsed.data.name;
    if (parsed.data.class_name !== undefined)
      structure.className = parsed.data.class_name;
    if (parsed.data.academic_year !== undefined)
      structure.academicYear = parsed.data.academic_year;
    if (parsed.data.amount !== undefined) structure.amount = parsed.data.amount;
    if (parsed.data.due_date !== undefined)
      structure.dueDate = new Date(parsed.data.due_date);
    if (parsed.data.category !== undefined)
      structure.category = parsed.data.category;
    if (parsed.data.description !== undefined)
      structure.description = parsed.data.description;
    if (parsed.data.is_recurring !== undefined)
      structure.isRecurring = parsed.data.is_recurring;
    if (parsed.data.frequency !== undefined)
      structure.frequency = parsed.data.frequency;
    if (parsed.data.late_fee_per_day !== undefined)
      structure.lateFeePerDay = parsed.data.late_fee_per_day;
    if (parsed.data.status !== undefined) structure.status = parsed.data.status;

    await structure.save();

    const changes = buildChanges(oldObj, structure.toObject(), [
      "name",
      "amount",
      "dueDate",
      "category",
      "status",
    ]);

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "fee_structure",
      entityId: parsed.data.structure_id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      changes,
    });

    emitActivity({
      type: "fee:updated",
      title: "Fee Structure Updated",
      message: `${structure.name} fee structure was updated`,
      module: "fees",
      entityId: parsed.data.structure_id,
      actionUrl: "/fees",
      session: session!,
    });

    logRequest("PUT", "/api/fees", session!.user.id, schoolId);
    return NextResponse.json({ success: true, data: structure });
  } catch (err) {
    logError("PUT", "/api/fees", err);
    return NextResponse.json(
      { error: "Failed to update fee structure" },
      { status: 500 },
    );
  }
}

// DELETE - Deactivate fee structure
export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("fees:manage");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const structureId = searchParams.get("structure_id");
    if (!structureId) {
      return NextResponse.json(
        { error: "structure_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const structure = await FeeStructure.findOne({
      _id: structureId,
      school: schoolId,
    });
    if (!structure) {
      return NextResponse.json(
        { error: "Fee structure not found" },
        { status: 404 },
      );
    }

    // Check for linked payments — soft delete only
    const paymentCount = await FeePayment.countDocuments({
      feeStructure: structureId,
      school: schoolId,
    });

    structure.status = "inactive";
    await structure.save();

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "fee_structure",
      entityId: structureId,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { linkedPayments: paymentCount },
    });

    emitActivity({
      type: "fee:deleted",
      title: "Fee Structure Removed",
      message: `${structure.name} fee structure was deactivated`,
      module: "fees",
      entityId: structureId,
      actionUrl: "/fees",
      session: session!,
    });

    logRequest("DELETE", "/api/fees", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      message: `Fee structure deactivated (${paymentCount} payment records preserved)`,
    });
  } catch (err) {
    logError("DELETE", "/api/fees", err);
    return NextResponse.json(
      { error: "Failed to delete fee structure" },
      { status: 500 },
    );
  }
}
