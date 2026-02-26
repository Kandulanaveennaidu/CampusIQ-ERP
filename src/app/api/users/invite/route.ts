import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/mailer";
import User from "@/lib/models/User";
import School from "@/lib/models/School";
import Token from "@/lib/models/Token";
import { PLANS } from "@/lib/plans";
import { AUTH_CONFIG } from "@/lib/config";
import { sanitizeText } from "@/lib/sanitize";
import { z } from "zod";
import { validationError } from "@/lib/validators";

const inviteUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "teacher", "student", "parent"], {
    message: "Please select a valid role",
  }),
  phone: z.string().optional().default(""),
  allowedModules: z.array(z.string()).optional().default([]),
  // Teacher fields
  subject: z.string().optional().default(""),
  classes: z.string().optional().default(""),
  salary_per_day: z.union([z.string(), z.number()]).optional().default(0),
  // Student fields
  class_name: z.string().optional().default(""),
  roll_number: z.string().optional().default(""),
  parent_name: z.string().optional().default(""),
  parent_phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
});

/**
 * POST /api/users/invite — Invite a new user (admin only)
 *
 * Creates a user in "pending" status with no password.
 * Sends an invitation email with an activation link.
 * The invited user clicks the link, sets their own password, and activates their account.
 */
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const data = parsed.data;

    // Check duplicate email
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    // Enforce plan limits
    const school = await School.findById(session!.user.school_id);
    const plan =
      PLANS.find((p) => p.id === (school?.plan || "starter")) || PLANS[0];

    if (data.role === "teacher" && plan.limits.maxTeachers !== -1) {
      const count = await User.countDocuments({
        school: session!.user.school_id,
        role: "teacher",
        isActive: true,
      });
      if (count >= plan.limits.maxTeachers) {
        return NextResponse.json(
          {
            error: `Teacher limit (${plan.limits.maxTeachers}) reached for the ${plan.name} plan. Please upgrade.`,
          },
          { status: 403 },
        );
      }
    }
    if (data.role === "student" && plan.limits.maxStudents !== -1) {
      const count = await User.countDocuments({
        school: session!.user.school_id,
        role: "student",
        isActive: true,
      });
      if (count >= plan.limits.maxStudents) {
        return NextResponse.json(
          {
            error: `Student limit (${plan.limits.maxStudents}) reached for the ${plan.name} plan. Please upgrade.`,
          },
          { status: 403 },
        );
      }
    }

    // Create user in pending status (no password — will be set during activation)
    const placeholderPassword = crypto.randomBytes(32).toString("hex");
    const bcrypt = await import("bcryptjs");
    const hashedPlaceholder = await bcrypt.hash(placeholderPassword, 12);

    const user = await User.create({
      name: sanitizeText(data.name),
      email: data.email.toLowerCase(),
      password: hashedPlaceholder,
      role: data.role,
      school: session!.user.school_id,
      phone: data.phone || "",
      emailVerified: false,
      isActive: true,
      status: "pending",
      allowedModules: data.allowedModules || [],
      // Teacher fields
      subject: data.subject || "",
      classes: data.classes
        ? data.classes.split(",").map((c: string) => c.trim())
        : [],
      salaryPerDay: Number(data.salary_per_day) || 0,
      // Student fields
      className: data.class_name || "",
      rollNumber: data.roll_number || "",
      parentName: data.parent_name || "",
      parentPhone: data.parent_phone || "",
      address: data.address || "",
    });

    // Generate invitation token
    const tokenValue = crypto.randomBytes(32).toString("hex");
    await Token.create({
      user: user._id,
      token: tokenValue,
      type: "invitation",
      expires_at: new Date(
        Date.now() + AUTH_CONFIG.INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
      ),
    });

    // Send invitation email
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";
    const activationLink = `${appUrl}/activate?token=${tokenValue}`;
    const schoolName = school?.school_name || "your school";

    await sendEmail({
      to: data.email.toLowerCase(),
      subject: `You're invited to join ${schoolName} on CampusIQ`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">🎓 CampusIQ</h1>
            <p style="color: #64748b; margin: 5px 0 0;">School & College Management System</p>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${sanitizeText(data.name)}! 👋</h2>
            <p style="color: #475569; line-height: 1.6;">
              You've been invited to join <strong>${schoolName}</strong> as a <strong>${data.role}</strong> on CampusIQ.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              Click the button below to set your password and activate your account:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${activationLink}"
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Activate Your Account
              </a>
            </div>

            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
              This link will expire in ${AUTH_CONFIG.INVITATION_EXPIRY_HOURS} hours.
              If you did not expect this invitation, you can safely ignore this email.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${activationLink}" style="color: #2563eb; word-break: break-all;">${activationLink}</a>
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #94a3b8; font-size: 12px;">
              &copy; ${new Date().getFullYear()} CampusIQ. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    await audit({
      schoolId: session!.user.school_id,
      action: "create",
      entity: "user_invitation",
      entityId: user._id.toString(),
      userId: session!.user.id!,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: {
        name: data.name,
        email: data.email,
        role: data.role,
        method: "invitation",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: "pending",
      },
      message:
        "Invitation sent successfully. The user will receive an email with activation instructions.",
    });
  } catch (err) {
    logError("POST", "/api/users/invite", err);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 },
    );
  }
}
