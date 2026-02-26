import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { logError, logRequest } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { verifyPayment } from "@/lib/payment";
import Payment from "@/lib/models/Payment";
import School from "@/lib/models/School";
import Subscription from "@/lib/models/Subscription";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { orderId, paymentId, signature, type, plan } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Find the payment record
    const payment = await Payment.findOne({
      orderId,
      school: session.user.school_id,
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment order not found" },
        { status: 404 },
      );
    }

    if (payment.status === "paid") {
      return NextResponse.json(
        { error: "Payment already processed" },
        { status: 409 },
      );
    }

    // Verify the payment signature
    const isValid = verifyPayment(
      orderId,
      paymentId || `pay_sim_${Date.now()}`,
      signature || "simulated_signature",
    );

    if (!isValid) {
      // Mark payment as failed
      await Payment.findByIdAndUpdate(payment._id, {
        status: "failed",
        paymentId: paymentId || "",
        signature: signature || "",
      });

      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 },
      );
    }

    // Update payment record
    await Payment.findByIdAndUpdate(payment._id, {
      status: "paid",
      paymentId: paymentId || `pay_sim_${Date.now()}`,
      signature: signature || "simulated_signature",
    });

    const schoolId = session.user.school_id;

    // Handle subscription payment
    if (type === "subscription" && plan) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Update school subscription
      await School.findByIdAndUpdate(schoolId, {
        plan,
        subscriptionStatus: "active",
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      });

      // Create/update subscription record
      await Subscription.findOneAndUpdate(
        { school: schoolId, status: { $in: ["trial", "active"] } },
        {
          school: schoolId,
          plan,
          status: "active",
          billingCycle: "monthly",
          amount: payment.amount,
          currency: "INR",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          transactionId: paymentId || "",
          paymentMethod: "razorpay",
        },
        { upsert: true, new: true },
      );

      logRequest("POST", "/api/payment/verify", session.user.id, schoolId, {
        message: "Subscription activated",
        plan,
        periodEnd: periodEnd.toISOString(),
      });
    }

    // Audit log
    await audit({
      schoolId,
      action: "create",
      entity: "payment",
      entityId: payment._id.toString(),
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      metadata: {
        orderId,
        paymentId: paymentId || "",
        amount: payment.amount,
        type: type || payment.type,
        plan: plan || payment.plan,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        type === "subscription"
          ? `Subscription upgraded to ${plan} successfully!`
          : "Payment recorded successfully!",
    });
  } catch (err) {
    logError("POST", "/api/payment/verify", err);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 },
    );
  }
}
