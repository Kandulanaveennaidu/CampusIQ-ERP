import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import User from "@/lib/models/User";
import Token from "@/lib/models/Token";
import { sendEmail } from "@/lib/email/mailer";
import { verificationEmail } from "@/lib/email/templates";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const successMsg =
      "If an account with that email exists, a verification email has been sent.";

    await connectDB();

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isActive: true,
    });
    if (!user) {
      return NextResponse.json({ message: successMsg });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: "Email is already verified. You can log in.",
      });
    }

    // Delete any existing verification tokens for this user
    await Token.deleteMany({ user: user._id, type: "email_verification" });

    // Create new verification token (expires in 24 hours)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await Token.create({
      user: user._id,
      token: verifyToken,
      type: "email_verification",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";

    await sendEmail({
      to: user.email,
      subject: "Verify your CampusIQ email",
      html: verificationEmail({
        name: user.name,
        verifyUrl: `${appUrl}/api/auth/verify-email?token=${verifyToken}`,
        expiresIn: "24 hours",
      }),
    });

    return NextResponse.json({ message: successMsg });
  } catch (err) {
    logError("POST", "/api/auth/resend-verification", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
