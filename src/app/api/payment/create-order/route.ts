import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import { createOrder, getRazorpayKeyId, PLAN_PRICES } from "@/lib/payment";
import Payment from "@/lib/models/Payment";

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
    const { plan, amount, type } = body;

    if (!type || !["subscription", "fee"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'subscription' or 'fee'" },
        { status: 400 },
      );
    }

    // For subscription payments, validate the plan
    let finalAmount = amount;
    if (type === "subscription") {
      if (!plan || !PLAN_PRICES[plan]) {
        return NextResponse.json(
          { error: "Invalid plan. Must be basic, pro, or enterprise" },
          { status: 400 },
        );
      }
      // Use the plan price if amount not explicitly provided
      if (!finalAmount) {
        finalAmount = PLAN_PRICES[plan];
      }
    }

    if (!finalAmount || finalAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    await connectDB();

    const receipt = `rcpt_${session.user.school_id}_${Date.now()}`;
    const order = await createOrder(finalAmount, "INR", receipt);

    // Create payment record with status "created"
    await Payment.create({
      school: session.user.school_id,
      user: session.user.id,
      orderId: order.id,
      amount: finalAmount,
      currency: "INR",
      type,
      plan: plan || "starter",
      status: "created",
      metadata: new Map([
        ["receipt", receipt],
        ["simulated", String(!!order.simulated)],
      ]),
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: finalAmount,
      amountInPaise: order.amount,
      currency: order.currency,
      key: getRazorpayKeyId(),
      simulated: !!order.simulated,
    });
  } catch (err) {
    logError("POST", "/api/payment/create-order", err);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 },
    );
  }
}
