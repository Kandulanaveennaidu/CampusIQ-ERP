import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { userActionSchema, validationError } from "@/lib/validators";
import User from "@/lib/models/User";

/**
 * POST /api/users/actions — Bulk user actions (admin only)
 * Actions: reset_password, unlock, activate, deactivate, bulk_deactivate
 */
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const parsed = userActionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const validatedData = parsed.data;
    await connectDB();
    const schoolId = session!.user.school_id;

    switch (validatedData.action) {
      case "reset_password": {
        const { user_id, new_password } = validatedData;

        const user = await User.findOne({ _id: user_id, school: schoolId });
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
          );
        }

        const hashed = await bcrypt.hash(new_password, 12);
        await User.updateOne(
          { _id: user_id },
          {
            $set: {
              password: hashed,
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          },
        );

        await audit({
          schoolId,
          action: "update",
          entity: "user",
          entityId: user_id,
          userId: session!.user.id!,
          userName: session!.user.name,
          userRole: session!.user.role,
          metadata: { action: "password_reset", target_user: user.email },
        });

        return NextResponse.json({
          success: true,
          message: `Password reset for ${user.name}`,
        });
      }

      case "unlock": {
        const { user_id } = validatedData;

        const user = await User.findOne({ _id: user_id, school: schoolId });
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
          );
        }

        await User.updateOne(
          { _id: user_id },
          { $set: { failedLoginAttempts: 0, lockedUntil: null } },
        );

        await audit({
          schoolId,
          action: "update",
          entity: "user",
          entityId: user_id,
          userId: session!.user.id!,
          userName: session!.user.name,
          userRole: session!.user.role,
          metadata: { action: "account_unlocked", target_user: user.email },
        });

        return NextResponse.json({
          success: true,
          message: `Account unlocked for ${user.name}`,
        });
      }

      case "activate":
      case "deactivate": {
        const { user_id } = validatedData;

        if (user_id === session!.user.id) {
          return NextResponse.json(
            { error: "You cannot change your own account status" },
            { status: 400 },
          );
        }

        const user = await User.findOne({ _id: user_id, school: schoolId });
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
          );
        }

        const isActive = validatedData.action === "activate";
        await User.updateOne({ _id: user_id }, { $set: { isActive } });

        await audit({
          schoolId,
          action: "update",
          entity: "user",
          entityId: user_id,
          userId: session!.user.id!,
          userName: session!.user.name,
          userRole: session!.user.role,
          metadata: {
            action: isActive ? "activated" : "deactivated",
            target_user: user.email,
          },
        });

        return NextResponse.json({
          success: true,
          message: `User ${isActive ? "activated" : "deactivated"}`,
        });
      }

      case "bulk_activate":
      case "bulk_deactivate": {
        const { user_ids } = validatedData;

        // Filter out self
        const filteredIds = user_ids.filter(
          (id: string) => id !== session!.user.id,
        );
        const isActive = validatedData.action === "bulk_activate";

        await User.updateMany(
          { _id: { $in: filteredIds }, school: schoolId },
          { $set: { isActive } },
        );

        await audit({
          schoolId,
          action: "update",
          entity: "user",
          entityId: "bulk",
          userId: session!.user.id!,
          userName: session!.user.name,
          userRole: session!.user.role,
          metadata: {
            action: `bulk_${isActive ? "activate" : "deactivate"}`,
            count: filteredIds.length,
          },
        });

        return NextResponse.json({
          success: true,
          message: `${filteredIds.length} user(s) ${isActive ? "activated" : "deactivated"}`,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    logError("POST", "/api/users/actions", err);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 },
    );
  }
}
