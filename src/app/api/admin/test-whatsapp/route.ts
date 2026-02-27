import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { sendMultiChannelNotification } from "@/lib/twilio-notifications";

/**
 * POST /api/admin/test-whatsapp
 * Body: { phone: "+919705627977", message: "Test message" }
 * Admin-only diagnostic endpoint to test WhatsApp delivery.
 */
export async function POST(request: Request) {
  try {
    const { error } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const phone = body.phone || "+919705627977";
    const message =
      body.message || "CampusIQ Test: WhatsApp notification is working!";

    console.log("[Test-WhatsApp] Sending to:", phone);
    console.log("[Test-WhatsApp] ENV check:", {
      SID: !!process.env.TWILIO_ACCOUNT_SID,
      TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      PHONE: process.env.TWILIO_PHONE_NUMBER,
      WA: process.env.TWILIO_WHATSAPP_NUMBER,
    });

    const result = await sendMultiChannelNotification(phone, message);

    console.log("[Test-WhatsApp] Result:", JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      result,
      env: {
        hasSID: !!process.env.TWILIO_ACCOUNT_SID,
        hasToken: !!process.env.TWILIO_AUTH_TOKEN,
        smsFrom: process.env.TWILIO_PHONE_NUMBER,
        waFrom: process.env.TWILIO_WHATSAPP_NUMBER,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Test-WhatsApp] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
