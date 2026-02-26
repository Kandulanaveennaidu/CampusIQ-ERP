import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import User from "@/lib/models/User";
import Token from "@/lib/models/Token";
import { AUTH_CONFIG } from "@/lib/config";
import { z } from "zod";

const activateSchema = z.object({
  token: z.string().min(1, "Activation token is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

/**
 * POST /api/auth/activate — Activate an invited user account
 *
 * Validates the invitation token, lets the user set their password,
 * and activates their account (status: "active", emailVerified: true).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = activateSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return NextResponse.json(
        { error: messages[0], details: messages },
        { status: 400 },
      );
    }

    const { token: tokenValue, password } = parsed.data;

    await connectDB();

    // Find invitation token
    const tokenDoc = await Token.findOne({
      token: tokenValue,
      type: "invitation",
    });

    if (!tokenDoc) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired activation link. Please request a new invitation from your administrator.",
        },
        { status: 400 },
      );
    }

    // Check if token is expired
    if (new Date(tokenDoc.expires_at) < new Date()) {
      await Token.deleteOne({ _id: tokenDoc._id });
      return NextResponse.json(
        {
          error:
            "This activation link has expired. Please request a new invitation from your administrator.",
        },
        { status: 400 },
      );
    }

    // Find the invited user
    const user = await User.findById(tokenDoc.user);
    if (!user) {
      await Token.deleteOne({ _id: tokenDoc._id });
      return NextResponse.json(
        { error: "User account not found. Please contact your administrator." },
        { status: 404 },
      );
    }

    // Check if already activated
    if (user.status === "active" && user.emailVerified) {
      await Token.deleteOne({ _id: tokenDoc._id });
      return NextResponse.json(
        { error: "This account has already been activated. Please log in." },
        { status: 400 },
      );
    }

    // Set password and activate account
    const hashedPassword = await bcrypt.hash(
      password,
      AUTH_CONFIG.BCRYPT_ROUNDS,
    );

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          emailVerified: true,
          status: "active",
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      },
    );

    // Delete the used invitation token
    await Token.deleteMany({ user: user._id, type: "invitation" });

    // Audit log
    await audit({
      action: "update",
      entity: "user_activation",
      entityId: user._id.toString(),
      schoolId: user.school ? user.school.toString() : "",
      userId: user._id.toString(),
      userName: user.name,
      userRole: user.role,
      metadata: { email: user.email, activatedVia: "invitation" },
    });

    return NextResponse.json({
      success: true,
      message: "Account activated successfully! You can now log in.",
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    logError("POST", "/api/auth/activate", err);
    return NextResponse.json(
      { error: "Failed to activate account. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auth/activate?token=xxx — Validate an invitation token
 *
 * Used by the activation page to check if the token is valid
 * before showing the password form.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenValue = searchParams.get("token");

    if (!tokenValue) {
      return NextResponse.json(
        { error: "Token is required", valid: false },
        { status: 400 },
      );
    }

    await connectDB();

    const tokenDoc = await Token.findOne({
      token: tokenValue,
      type: "invitation",
    });

    if (!tokenDoc) {
      return NextResponse.json(
        { error: "Invalid or expired activation link", valid: false },
        { status: 400 },
      );
    }

    if (new Date(tokenDoc.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This activation link has expired", valid: false },
        { status: 400 },
      );
    }

    const user = await User.findById(tokenDoc.user).select("name email role");
    if (!user) {
      return NextResponse.json(
        { error: "User not found", valid: false },
        { status: 404 },
      );
    }

    return NextResponse.json({
      valid: true,
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    logError("GET", "/api/auth/activate", err);
    return NextResponse.json(
      { error: "Failed to validate token", valid: false },
      { status: 500 },
    );
  }
}
