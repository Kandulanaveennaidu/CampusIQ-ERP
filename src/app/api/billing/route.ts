import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import School from "@/lib/models/School";
import Payment from "@/lib/models/Payment";
import Subscription from "@/lib/models/Subscription";

export async function GET() {
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

    const schoolId = session.user.school_id;
    await connectDB();

    // Get school info
    const school = await School.findById(schoolId).lean();
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Get active subscription
    const subscription = await Subscription.findOne({
      school: schoolId,
      status: { $in: ["active", "trial"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get payment history
    const payments = await Payment.find({ school: schoolId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Calculate summary
    const totalPaid = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = payments.filter((p) => p.status === "created");
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    // Determine next due date
    let nextDueDate: string | null = null;
    if (school.currentPeriodEnd) {
      nextDueDate = new Date(school.currentPeriodEnd).toISOString();
    } else if (school.trialEndsAt) {
      nextDueDate = new Date(school.trialEndsAt).toISOString();
    }

    return NextResponse.json({
      success: true,
      subscription: {
        plan: school.plan,
        status: school.subscriptionStatus,
        trialEndsAt: school.trialEndsAt,
        currentPeriodEnd: school.currentPeriodEnd,
        billingCycle: subscription?.billingCycle || "monthly",
        amount: subscription?.amount || 0,
      },
      payments: payments.map((p) => ({
        _id: p._id,
        orderId: p.orderId,
        paymentId: p.paymentId,
        amount: p.amount,
        currency: p.currency,
        type: p.type,
        plan: p.plan,
        status: p.status,
        createdAt: p.createdAt,
      })),
      summary: {
        totalPaid,
        activePlan: school.plan,
        nextDueDate,
        pendingAmount,
      },
    });
  } catch (err) {
    logError("GET", "/api/billing", err);
    return NextResponse.json(
      { error: "Failed to fetch billing information" },
      { status: 500 },
    );
  }
}
