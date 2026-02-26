import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { registerSchema } from "@/lib/validators";
import School from "@/lib/models/School";
import User from "@/lib/models/User";
import Subscription from "@/lib/models/Subscription";
import { sendEmail } from "@/lib/email/mailer";
import { welcomeEmail } from "@/lib/email/templates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      return NextResponse.json(
        {
          error: messages[0],
          details: messages,
        },
        { status: 400 },
      );
    }

    const {
      school_name,
      school_type,
      board,
      address,
      phone,
      email,
      admin_email,
      admin_password,
    } = parsed.data;

    await connectDB();

    // Check duplicate
    const existingUser = await User.findOne({
      email: admin_email.toLowerCase(),
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    // Create school with free 7-day trial
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const school = await School.create({
      school_name,
      school_type: school_type || "",
      board: board || "",
      address,
      phone,
      email: email || admin_email,
      plan: "starter",
      subscriptionStatus: "trial",
      trialEndsAt: trialEnd,
      currentPeriodEnd: trialEnd,
      status: "active",
    });

    // Create trial subscription record
    await Subscription.create({
      school: school._id,
      plan: "starter",
      status: "trial",
      billingCycle: "monthly",
      amount: 0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(admin_password, 12);

    // Create admin user (emailVerified set to true — no email verification required for admin)
    const adminUser = await User.create({
      name: school_name + " Admin",
      email: admin_email.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      school: school._id,
      phone: phone || "",
      emailVerified: true,
      isActive: true,
    });

    const schoolId = school._id.toString();
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";

    if (!appUrl) {
      logError(
        "POST",
        "/api/auth/register",
        new Error("APP_URL or NEXTAUTH_URL not configured"),
      );
    }

    // Send welcome email (non-blocking)
    sendEmail({
      to: admin_email,
      subject: "Welcome to CampusIQ - School Registered!",
      html: welcomeEmail({
        name: school_name + " Admin",
        schoolName: school_name,
        schoolId,
        email: admin_email,
        role: "admin",
        loginUrl: `${appUrl}/login`,
      }),
    }).catch((e) => logError("POST", "/api/auth/register", e));

    await audit({
      schoolId: schoolId,
      action: "create",
      entity: "school",
      entityId: schoolId,
      userId: adminUser._id.toString(),
      userName: school_name + " Admin",
      userRole: "admin",
      metadata: { school_name, admin_email },
    });

    return NextResponse.json({
      success: true,
      school_id: schoolId,
      message: `School registered successfully! Your School ID is ${schoolId}`,
    });
  } catch (err) {
    logError("POST", "/api/auth/register", err);
    return NextResponse.json(
      { error: "Failed to register school" },
      { status: 500 },
    );
  }
}
