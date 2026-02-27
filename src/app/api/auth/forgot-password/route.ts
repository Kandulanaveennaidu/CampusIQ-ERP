import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import { forgotPasswordSchema, validationError } from "@/lib/validators";
import User from "@/lib/models/User";
import Token from "@/lib/models/Token";
import { sendEmail } from "@/lib/email/mailer";
import { passwordResetEmail } from "@/lib/email/templates";
import { notifyPasswordReset } from "@/lib/twilio-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();

    const user = await User.findOne({
      email: parsed.data.email.toLowerCase().trim(),
      isActive: true,
    });

    // Always return success to prevent email enumeration
    const successMsg =
      "If an account with that email exists, a password reset link has been sent.";

    if (!user) {
      return NextResponse.json({ message: successMsg });
    }

    // Delete any existing password reset tokens for this user
    await Token.deleteMany({ user: user._id, type: "password_reset" });

    // Create new reset token (expires in 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    await Token.create({
      user: user._id,
      token: resetToken,
      type: "password_reset",
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";

    if (!appUrl) {
      logError(
        "POST",
        "/api/auth/forgot-password",
        new Error("APP_URL or NEXTAUTH_URL not configured"),
      );
    }
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset Your Password - CampusIQ",
      html: passwordResetEmail({
        name: user.name,
        resetUrl: resetLink,
        expiresIn: "1 hour",
      }),
    });

    // Fire-and-forget: SMS + WhatsApp notification with reset link
    if (user.phone) {
      notifyPasswordReset(user.phone, user.name, resetLink).catch(() => {});
    }

    return NextResponse.json({ message: successMsg });
  } catch (err) {
    logError("POST", "/api/auth/forgot-password", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
