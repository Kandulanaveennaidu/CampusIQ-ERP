import crypto from "crypto";
import { logRequest, logError } from "@/lib/logger";

// ─── Razorpay Payment Integration ─────────────────────────────────────────────
// Uses real Razorpay SDK when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.
// Falls back to simulated orders/verification for development/testing.

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

/** Whether real Razorpay keys are configured */
export function isRazorpayConfigured(): boolean {
  return !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

/** Get the public Razorpay key (safe to send to client) */
export function getRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID;
}

// ─── Plan Prices (INR) ──────────────────────────────────────────────────────
export const PLAN_PRICES: Record<string, number> = {
  starter: 0,
  basic: 999,
  pro: 1999,
  enterprise: 3999,
};

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  simulated?: boolean;
}

/**
 * Create a Razorpay order.
 * If Razorpay keys are not configured, returns a simulated order for development.
 */
export async function createOrder(
  amount: number,
  currency: string = "INR",
  receipt: string = "",
): Promise<RazorpayOrder> {
  // Amount should be in paise for Razorpay (1 INR = 100 paise)
  const amountInPaise = Math.round(amount * 100);

  if (!isRazorpayConfigured()) {
    logRequest("POST", "/payment/create-order", undefined, undefined, {
      message: "Razorpay keys not configured — using simulated order",
    });
    const simulatedId = `order_sim_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return {
      id: simulatedId,
      amount: amountInPaise,
      currency,
      receipt,
      status: "created",
      simulated: true,
    };
  }

  // Real Razorpay order creation via API
  try {
    const auth = Buffer.from(
      `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`,
    ).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Razorpay API error: ${response.status} — ${errorBody}`);
    }

    const order = await response.json();
    logRequest("POST", "/payment/create-order", undefined, undefined, {
      orderId: order.id,
      amount: order.amount,
    });
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt || receipt,
      status: order.status,
    };
  } catch (err) {
    logError("POST", "/payment/create-order", err);
    throw err;
  }
}

/**
 * Verify a Razorpay payment signature.
 * If keys are not configured (simulated mode), returns true.
 */
export function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!isRazorpayConfigured()) {
    logRequest("POST", "/payment/verify", undefined, undefined, {
      message: "Simulated mode — payment auto-verified",
      orderId,
      paymentId,
    });
    return true;
  }

  try {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === signature;
    logRequest("POST", "/payment/verify", undefined, undefined, {
      orderId,
      paymentId,
      verified: isValid,
    });
    return isValid;
  } catch (err) {
    logError("POST", "/payment/verify", err);
    return false;
  }
}
