import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/lib/models/PushSubscription";
import { logError } from "@/lib/logger";

/**
 * POST /api/push-subscription — Save a push subscription
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("notifications:read");
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const { subscription, userAgent } = body;

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Invalid push subscription" },
        { status: 400 },
      );
    }

    // Upsert — replace if same endpoint already exists
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        school: session!.user.school_id,
        user: session!.user.id,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        userAgent: userAgent || "",
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("POST", "/api/push-subscription", err);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/push-subscription — Remove a push subscription
 */
export async function DELETE(request: Request) {
  try {
    const { error, session } = await requireAuth("notifications:read");
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    await PushSubscription.deleteOne({
      endpoint,
      user: session!.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE", "/api/push-subscription", err);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/push-subscription — Check if current user has a push subscription
 */
export async function GET() {
  try {
    const { error, session } = await requireAuth("notifications:read");
    if (error) return error;

    await connectDB();
    const count = await PushSubscription.countDocuments({
      user: session!.user.id,
    });

    return NextResponse.json({ subscribed: count > 0, count });
  } catch (err) {
    logError("GET", "/api/push-subscription", err);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 },
    );
  }
}
