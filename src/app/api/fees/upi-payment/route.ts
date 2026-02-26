import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { FeeStructure, FeePayment } from "@/lib/models/Fee";
import Student from "@/lib/models/Student";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";
import { notifyFeePaymentConfirmation } from "@/lib/twilio-notifications";
import {
  isRazorpayConfigured,
  createOrder,
  verifyPayment,
  getRazorpayKeyId,
} from "@/lib/payment";
import crypto from "crypto";

// ─── Generate UPI Payment Link / QR Data ────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("fees:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    const body = await request.json();
    const { feeStructureId, studentId, amount } = body;

    if (!feeStructureId || !studentId || !amount) {
      return NextResponse.json(
        { error: "feeStructureId, studentId, and amount are required" },
        { status: 400 },
      );
    }

    logRequest("POST", "/api/fees/upi-payment", session!.user.id, schoolId);

    // Validate fee structure exists
    const feeStructure = await FeeStructure.findOne({
      _id: feeStructureId,
      school: schoolId,
    });
    if (!feeStructure) {
      return NextResponse.json(
        { error: "Fee structure not found" },
        { status: 404 },
      );
    }

    // Validate student exists
    const student = await Student.findOne({ _id: studentId, school: schoolId });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const receiptId = `FEE_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Option 1: If Razorpay is configured, create real order
    if (isRazorpayConfigured()) {
      const order = await createOrder(amount, "INR", receiptId);

      // Generate UPI deep link for direct UPI payment
      const upiMerchantId = process.env.UPI_MERCHANT_VPA || "school@upi";
      const schoolName = process.env.SCHOOL_NAME || "CampusIQ School";

      const upiLink = `upi://pay?pa=${encodeURIComponent(upiMerchantId)}&pn=${encodeURIComponent(schoolName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Fee: ${feeStructure.name} - ${student.name}`)}&tr=${receiptId}`;

      return NextResponse.json({
        success: true,
        data: {
          orderId: order.id,
          amount: amount,
          currency: "INR",
          razorpayKeyId: getRazorpayKeyId(),
          receiptId,
          upiLink,
          // QR code data (can be rendered via qrcode library on frontend)
          qrData: upiLink,
          student: { name: student.name, rollNumber: student.roll_number },
          feeStructure: {
            name: feeStructure.name,
            className: feeStructure.className,
          },
          paymentMethods: ["upi", "card", "netbanking", "wallet"],
        },
      });
    }

    // Option 2: Simulated mode — generate UPI link with dummy VPA
    const upiMerchantId = process.env.UPI_MERCHANT_VPA || "school@ybl";
    const schoolName = process.env.SCHOOL_NAME || "CampusIQ School";
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiMerchantId)}&pn=${encodeURIComponent(schoolName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Fee: ${feeStructure.name} - ${student.name}`)}&tr=${receiptId}`;

    const simulatedOrderId = `order_sim_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    return NextResponse.json({
      success: true,
      data: {
        orderId: simulatedOrderId,
        amount: amount,
        currency: "INR",
        razorpayKeyId: getRazorpayKeyId() || "rzp_test_simulated",
        receiptId,
        upiLink,
        qrData: upiLink,
        student: { name: student.name, rollNumber: student.roll_number },
        feeStructure: {
          name: feeStructure.name,
          className: feeStructure.className,
        },
        paymentMethods: ["upi"],
        simulated: true,
      },
    });
  } catch (err) {
    logError("POST", "/api/fees/upi-payment", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── Verify UPI Payment & Record ────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("fees:write");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    const body = await request.json();
    const {
      orderId,
      paymentId,
      signature,
      feeStructureId,
      studentId,
      amount,
      paymentMethod = "upi",
    } = body;

    logRequest("PUT", "/api/fees/upi-payment", session!.user.id, schoolId);

    // Verify payment
    const isValid = verifyPayment(
      orderId,
      paymentId || `pay_sim_${Date.now()}`,
      signature || "simulated",
    );
    if (!isValid) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 },
      );
    }

    // Record the payment
    const feeStructure = await FeeStructure.findOne({
      _id: feeStructureId,
      school: schoolId,
    });
    const student = await Student.findOne({ _id: studentId, school: schoolId });

    if (!feeStructure || !student) {
      return NextResponse.json(
        { error: "Fee structure or student not found" },
        { status: 404 },
      );
    }

    // Check if payment already exists for this order
    const existingPayment = await FeePayment.findOne({
      "metadata.orderId": orderId,
      school: schoolId,
    });
    if (existingPayment) {
      return NextResponse.json(
        { error: "Payment already recorded" },
        { status: 409 },
      );
    }

    const receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`;

    const payment = await FeePayment.create({
      school: schoolId,
      student: studentId,
      feeStructure: feeStructureId,
      studentName: student.name,
      feeStructureName: feeStructure.name,
      amount: amount,
      lateFee: 0,
      discount: 0,
      totalPaid: amount,
      balanceDue: Math.max(0, feeStructure.amount - amount),
      paymentMethod: paymentMethod,
      transactionId: paymentId || orderId,
      receiptNumber,
      status: "paid",
      paidAt: new Date(),
      metadata: {
        orderId,
        paymentId,
        upi: true,
        verifiedAt: new Date(),
      },
    });

    await createAuditLog({
      school: schoolId,
      userId: session!.user.id,
      action: "create",
      entity: "fee_payment",
      entityId: payment._id?.toString(),
      metadata: {
        detail: `UPI payment of \u20B9${amount} recorded for ${student.name} \u2014 ${feeStructure.name}`,
      },
    });

    // Fire-and-forget: SMS + WhatsApp payment confirmation to parent
    if (student.parent_phone) {
      notifyFeePaymentConfirmation(
        student.parent_phone,
        student.name,
        amount,
        feeStructure.name,
        receiptNumber,
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment._id,
        receiptNumber,
        amount,
        status: "paid",
        message: `Payment of ₹${amount} recorded successfully via ${paymentMethod.toUpperCase()}`,
      },
    });
  } catch (err) {
    logError("PUT", "/api/fees/upi-payment", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
