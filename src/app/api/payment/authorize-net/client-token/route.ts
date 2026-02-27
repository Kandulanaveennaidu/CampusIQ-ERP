import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { isAuthorizeNetConfigured, isSandboxMode } from "@/lib/authorize-net";

/**
 * GET /api/payment/authorize-net/client-token
 * Returns whether the payment gateway is configured and in sandbox mode.
 */
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAuthorizeNetConfigured()) {
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      configured: true,
      sandbox: isSandboxMode(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to get client token" },
      { status: 500 },
    );
  }
}
