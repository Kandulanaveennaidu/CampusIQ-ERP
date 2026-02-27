import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import Token from "@/lib/models/Token";
import User from "@/lib/models/User";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || token.length < 20) {
      const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";
      return NextResponse.redirect(
        new URL("/verify-email?status=invalid", baseUrl || request.url),
      );
    }

    await connectDB();

    const tokenDoc = await Token.findOne({
      token,
      type: "email_verification",
    });

    if (!tokenDoc) {
      const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";
      return NextResponse.redirect(
        new URL("/verify-email?status=expired", baseUrl || request.url),
      );
    }

    // Check token expiry
    if (tokenDoc.expires_at && tokenDoc.expires_at < new Date()) {
      await Token.findByIdAndDelete(tokenDoc._id);
      const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";
      return NextResponse.redirect(
        new URL("/verify-email?status=expired", baseUrl || request.url),
      );
    }

    // Mark user as verified
    await User.findByIdAndUpdate(tokenDoc.user, { emailVerified: true });

    // Delete the used token
    await Token.findByIdAndDelete(tokenDoc._id);

    await audit({
      schoolId: "system",
      action: "update",
      entity: "user",
      entityId: tokenDoc.user.toString(),
      userId: tokenDoc.user.toString(),
      userName: "",
      userRole: "unknown",
      changes: { emailVerified: { old: false, new: true } },
    });

    // Redirect to verification success page
    const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";
    return NextResponse.redirect(
      new URL("/verify-email?status=success", baseUrl || request.url),
    );
  } catch (err) {
    logError("GET", "/api/auth/verify-email", err);
    const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";
    return NextResponse.redirect(
      new URL("/verify-email?status=error", baseUrl || request.url),
    );
  }
}
