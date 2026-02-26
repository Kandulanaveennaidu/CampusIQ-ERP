import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import School from "@/lib/models/School";
import Subscription from "@/lib/models/Subscription";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { getPlan, type PlanId, type BillingCycle } from "@/lib/plans";

/**
 * GET /api/subscriptions — Get current subscription info
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const school = await School.findById(session.user.school_id).lean();
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const subscription = await Subscription.findOne({
      school: session.user.school_id,
      status: { $in: ["active", "trial"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const planConfig = getPlan((school.plan as PlanId) || "starter");

    return NextResponse.json({
      plan: school.plan,
      subscriptionStatus: school.subscriptionStatus,
      trialEndsAt: school.trialEndsAt,
      currentPeriodEnd: school.currentPeriodEnd,
      planConfig,
      subscription,
    });
  } catch (err) {
    logError("GET", "/api/subscriptions", err);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/subscriptions — Subscribe to a plan (or upgrade)
 * Body: { plan: PlanId, billing_cycle: BillingCycle }
 *
 * In production, this would integrate with Razorpay/Stripe.
 * For now, simulates instant activation.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can subscribe
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can manage subscriptions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const planId = body.plan as PlanId;
    const billingCycle = (
      body.billing_cycle === "yearly" ? "yearly" : "monthly"
    ) as BillingCycle;

    const validPlans: PlanId[] = ["starter", "basic", "pro", "enterprise"];
    if (!validPlans.includes(planId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (planId === "starter") {
      return NextResponse.json(
        { error: "Cannot subscribe to starter plan — it is trial-only" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session.user.school_id;
    const school = await School.findById(schoolId);
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Capture previous plan BEFORE updating
    const previousPlan = school.plan;

    const planConfig = getPlan(planId);
    const amount =
      billingCycle === "monthly" ? planConfig.price : planConfig.yearlyPrice;

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Create subscription record
    const subscription = await Subscription.create({
      school: schoolId,
      plan: planId,
      status: "active",
      billingCycle,
      amount,
      currency: "INR",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      invoiceNumber: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    });

    // Update school plan
    school.plan = planId;
    school.subscriptionStatus = "active";
    school.trialEndsAt = null;
    school.currentPeriodEnd = periodEnd;
    await school.save();

    await audit({
      action: "create",
      entity: "subscription",
      entityId: subscription._id.toString(),
      schoolId,
      userId: session.user.id || "",
      userName: session.user.name,
      userRole: session.user.role,
      metadata: {
        plan: planId,
        billingCycle,
        amount,
        previousPlan,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        plan: planId,
        status: "active",
        currentPeriodEnd: periodEnd,
        amount,
        transactionId: subscription.transactionId,
        invoiceNumber: subscription.invoiceNumber,
      },
    });
  } catch (err) {
    logError("POST", "/api/subscriptions", err);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/subscriptions — Cancel the current subscription
 * School will be downgraded to starter at end of current period.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can cancel subscriptions" },
        { status: 403 },
      );
    }

    await connectDB();
    const schoolId = session.user.school_id;
    const school = await School.findById(schoolId);
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    if (school.plan === "starter") {
      return NextResponse.json(
        { error: "You are already on the starter plan" },
        { status: 400 },
      );
    }

    const previousPlan = school.plan;

    // Cancel active subscriptions
    await Subscription.updateMany(
      { school: schoolId, status: "active" },
      { $set: { status: "cancelled", cancelledAt: new Date() } },
    );

    // Downgrade school to starter
    school.plan = "starter";
    school.subscriptionStatus = "cancelled";
    await school.save();

    await audit({
      action: "delete",
      entity: "subscription",
      entityId: schoolId,
      schoolId,
      userId: session.user.id || "",
      userName: session.user.name,
      userRole: session.user.role,
      metadata: { previousPlan, action: "cancel" },
    });

    return NextResponse.json({
      success: true,
      message:
        "Subscription cancelled. You have been downgraded to the Starter plan.",
    });
  } catch (err) {
    logError("DELETE", "/api/subscriptions", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
