import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { logError, logRequest } from "@/lib/logger";
import { audit } from "@/lib/audit";
import {
  chargeCard,
  PLAN_PRICES_USD,
  isAuthorizeNetConfigured,
} from "@/lib/authorize-net";
import { getPlan, type PlanId } from "@/lib/plans";
import Payment from "@/lib/models/Payment";
import School from "@/lib/models/School";
import Subscription from "@/lib/models/Subscription";
import { sendEmail } from "@/lib/email/mailer";
import { paymentReceiptEmail } from "@/lib/email/templates";

/**
 * POST /api/payment/authorize-net
 * Process a payment via Authorize.net direct card charge.
 *
 * Body:
 *  - cardNumber: string
 *  - expMonth: string (MM)
 *  - expYear: string (YYYY)
 *  - cvv: string
 *  - plan: PlanId
 *  - billingCycle: "monthly" | "yearly"
 *  - type: "subscription"
 */
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

    if (!isAuthorizeNetConfigured()) {
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const {
      cardNumber,
      expMonth,
      expYear,
      cvv,
      plan,
      billingCycle,
      type,
      billingAddress,
    } = body;

    if (!cardNumber || !expMonth || !expYear || !cvv) {
      return NextResponse.json(
        { error: "Card details are required. Please fill in all fields." },
        { status: 400 },
      );
    }

    if (type !== "subscription") {
      return NextResponse.json(
        { error: "Invalid payment type" },
        { status: 400 },
      );
    }

    const validPlans: PlanId[] = ["basic", "pro", "enterprise"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 },
      );
    }

    const planConfig = getPlan(plan);
    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
    const amount =
      cycle === "monthly" ? PLAN_PRICES_USD[plan] : PLAN_PRICES_USD[plan] * 10; // ~17% yearly discount

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid plan pricing" },
        { status: 400 },
      );
    }

    await connectDB();

    const school = await School.findById(session.user.school_id);
    if (!school) {
      return NextResponse.json(
        { error: "Institution not found" },
        { status: 404 },
      );
    }

    // Generate invoice number
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create a "created" payment record BEFORE charging
    const paymentRecord = await Payment.create({
      school: session.user.school_id,
      user: session.user.id,
      orderId,
      amount,
      currency: "USD",
      type: "subscription",
      plan,
      status: "created",
      metadata: new Map([
        ["billingCycle", cycle],
        ["invoiceNumber", invoiceNumber],
        ["gateway", "authorize.net"],
      ]),
    });

    // Process the charge via Authorize.net (direct card charge)
    const expirationDate = `${expMonth}${expYear}`;
    const txnResult = await chargeCard({
      cardNumber: cardNumber.replace(/\s+/g, ""),
      expirationDate,
      cardCode: cvv,
      amount,
      orderId,
      description: `CampusIQ ${planConfig.name} Plan — ${cycle} subscription`,
      customerEmail:
        billingAddress?.email || session.user.email || school.email || "",
      customerName: billingAddress
        ? `${billingAddress.firstName} ${billingAddress.lastName}`.trim()
        : session.user.name || "",
      invoiceNumber,
      billingAddress: billingAddress
        ? {
            firstName: billingAddress.firstName || "",
            lastName: billingAddress.lastName || "",
            company: billingAddress.company || "",
            address: billingAddress.address || "",
            city: billingAddress.city || "",
            state: billingAddress.state || "",
            zip: billingAddress.zip || "",
            country: billingAddress.country || "US",
            phone: billingAddress.phone || "",
          }
        : undefined,
    });

    if (!txnResult.success) {
      // Mark payment as failed
      await Payment.findByIdAndUpdate(paymentRecord._id, {
        status: "failed",
        paymentId: txnResult.transactionId || "",
        metadata: new Map([
          ...Array.from(paymentRecord.metadata.entries()),
          ["errorCode", txnResult.messageCode],
          ["errorText", txnResult.messageText],
          ["responseCode", txnResult.responseCode],
        ]),
      });

      return NextResponse.json(
        {
          error:
            txnResult.messageText || "Payment was declined. Please try again.",
          code: txnResult.messageCode,
        },
        { status: 402 },
      );
    }

    // Payment successful — Update records
    await Payment.findByIdAndUpdate(paymentRecord._id, {
      status: "paid",
      paymentId: txnResult.transactionId,
      signature: txnResult.authCode,
      metadata: new Map([
        ...Array.from(paymentRecord.metadata.entries()),
        ["transactionId", txnResult.transactionId],
        ["authCode", txnResult.authCode],
        ["accountNumber", txnResult.accountNumber],
        ["accountType", txnResult.accountType],
        ["refId", txnResult.refId],
      ]),
    });

    // Compute subscription period
    const periodStart = new Date();
    const periodEnd = new Date();
    if (cycle === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const previousPlan = school.plan;

    // Update school subscription
    school.plan = plan;
    school.subscriptionStatus = "active";
    school.trialEndsAt = null;
    school.currentPeriodEnd = periodEnd;
    await school.save();

    // Create/update subscription record
    await Subscription.findOneAndUpdate(
      { school: session.user.school_id, status: { $in: ["trial", "active"] } },
      {
        school: session.user.school_id,
        plan,
        status: "active",
        billingCycle: cycle,
        amount,
        currency: "USD",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        transactionId: txnResult.transactionId,
        paymentMethod: `${txnResult.accountType} ending ${txnResult.accountNumber.slice(-4)}`,
        invoiceNumber,
      },
      { upsert: true, new: true },
    );

    // Audit log
    await audit({
      schoolId: session.user.school_id,
      action: "create",
      entity: "payment",
      entityId: paymentRecord._id.toString(),
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      metadata: {
        gateway: "authorize.net",
        transactionId: txnResult.transactionId,
        plan,
        amount,
        billingCycle: cycle,
        previousPlan,
      },
    });

    logRequest(
      "POST",
      "/api/payment/authorize-net",
      session.user.id,
      session.user.school_id,
      {
        message: "Payment processed successfully",
        transactionId: txnResult.transactionId,
        plan,
        amount,
      },
    );

    // Send payment receipt email (fire-and-forget)
    const customerEmail = session.user.email || school.email;
    if (customerEmail) {
      sendEmail({
        to: customerEmail,
        subject: `Payment Confirmation — CampusIQ ${planConfig.name} Plan`,
        html: paymentReceiptEmail({
          customerName: session.user.name || "Administrator",
          institutionName: school.school_name || "Your Institution",
          planName: planConfig.name,
          billingCycle: cycle,
          amount,
          currency: "USD",
          transactionId: txnResult.transactionId,
          authCode: txnResult.authCode,
          invoiceNumber,
          cardType: txnResult.accountType,
          cardLast4: txnResult.accountNumber.slice(-4),
          paymentDate: new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          periodStart: periodStart.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          periodEnd: periodEnd.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          features: planConfig.features.slice(0, 6),
          dashboardUrl: `${process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000"}/dashboard`,
        }),
      }).catch(() => {
        // Email send failure should not affect payment response
      });
    }

    return NextResponse.json({
      success: true,
      message: `Payment successful! Your plan has been upgraded to ${planConfig.name}.`,
      transactionId: txnResult.transactionId,
      plan,
      periodEnd: periodEnd.toISOString(),
      invoiceNumber,
    });
  } catch (err) {
    logError("POST", "/api/payment/authorize-net", err);
    return NextResponse.json(
      { error: "Payment processing failed. Please try again." },
      { status: 500 },
    );
  }
}
