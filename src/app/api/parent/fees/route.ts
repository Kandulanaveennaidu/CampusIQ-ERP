import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import { FeeStructure, FeePayment } from "@/lib/models/Fee";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";

/**
 * GET /api/parent/fees?student_id=xxx
 * Returns fee payment status for the parent's child.
 */
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireRole("parent");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Verify parent-child link
    const isLinked = await verifyParentChildLink(
      session!.user.id as string,
      studentId,
    );
    if (!isLinked) {
      return NextResponse.json(
        { error: "You are not authorized to view this student's data" },
        { status: 403 },
      );
    }

    // Get the student to know their class
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get fee structures for this student's class
    const feeStructures = await FeeStructure.find({
      school: student.school,
      className: student.class_name,
      status: "active",
    }).lean();

    // Get all payments for this student
    const payments = await FeePayment.find({
      student: studentId,
    })
      .sort({ paymentDate: -1 })
      .lean();

    const paymentsByFee = new Map<string, typeof payments>();
    payments.forEach((p) => {
      const key = p.feeStructure.toString();
      if (!paymentsByFee.has(key)) paymentsByFee.set(key, []);
      paymentsByFee.get(key)!.push(p);
    });

    // Build fee status per fee structure
    const feeStatus = feeStructures.map((fs) => {
      const feePayments = paymentsByFee.get(fs._id.toString()) || [];
      const totalPaid = feePayments.reduce((sum, p) => sum + p.totalPaid, 0);
      const remaining = Math.max(0, fs.amount - totalPaid);
      const isPastDue = new Date(fs.dueDate) < new Date();

      return {
        fee_id: fs._id.toString(),
        name: fs.name,
        category: fs.category,
        amount: fs.amount,
        dueDate: fs.dueDate,
        totalPaid,
        remaining,
        status: remaining === 0 ? "paid" : isPastDue ? "overdue" : "pending",
        payments: feePayments.map((p) => ({
          payment_id: p._id.toString(),
          amount: p.totalPaid,
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          receiptNumber: p.receiptNumber,
          status: p.status,
        })),
      };
    });

    // Summary
    const totalFees = feeStructures.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalDue = Math.max(0, totalFees - totalPaid);
    const overdueCount = feeStatus.filter((f) => f.status === "overdue").length;

    return NextResponse.json({
      success: true,
      data: feeStatus,
      summary: { totalFees, totalPaid, totalDue, overdueCount },
    });
  } catch (err) {
    logError("GET", "/api/parent/fees", err);
    return NextResponse.json(
      { error: "Failed to fetch fee data" },
      { status: 500 },
    );
  }
}

async function verifyParentChildLink(
  parentUserId: string,
  studentId: string,
): Promise<boolean> {
  const parentUser = await User.findById(parentUserId).lean();
  if (!parentUser) return false;

  const childrenIds = (parentUser.children || []).map(
    (id: { toString: () => string }) => id.toString(),
  );
  if (childrenIds.includes(studentId)) return true;

  const student = await Student.findById(studentId).lean();
  if (student && student.parent_user?.toString() === parentUserId) return true;

  return false;
}
