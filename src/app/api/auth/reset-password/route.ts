import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { resetPasswordSchema, validationError } from "@/lib/validators";
import Token from "@/lib/models/Token";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();

    const tokenDoc = await Token.findOne({
      token: parsed.data.token,
      type: "password_reset",
    });

    if (!tokenDoc) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 },
      );
    }

    // Check token expiry
    if (tokenDoc.expires_at && tokenDoc.expires_at < new Date()) {
      await Token.findByIdAndDelete(tokenDoc._id);
      return NextResponse.json(
        { error: "Reset link has expired. Please request a new one." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    // Update password and reset lockout
    await User.findByIdAndUpdate(tokenDoc.user, {
      password: hashedPassword,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    // Delete all reset tokens for this user
    await Token.deleteMany({ user: tokenDoc.user, type: "password_reset" });

    await audit({
      schoolId: "system",
      action: "update",
      entity: "user",
      entityId: tokenDoc.user.toString(),
      userId: tokenDoc.user.toString(),
      userName: "",
      userRole: "unknown",
      changes: { password: { old: "***", new: "***reset***" } },
    });

    return NextResponse.json({
      message:
        "Password reset successfully! You can now log in with your new password.",
    });
  } catch (err) {
    logError("POST", "/api/auth/reset-password", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
