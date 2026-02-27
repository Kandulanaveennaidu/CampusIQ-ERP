import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { connectDB } from "@/lib/db";
import { logError } from "@/lib/logger";
import { audit, buildChanges } from "@/lib/audit";
import {
  profileUpdateSchema,
  changePasswordSchema,
  validationError,
} from "@/lib/validators";
import User from "@/lib/models/User";
import School from "@/lib/models/School";
import bcrypt from "bcryptjs";

// ─── GET /api/profile ───
export async function GET() {
  try {
    const { error, session } = await requireAuth("profile:read");
    if (error) return error;

    await connectDB();
    const userId = session!.user.id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "admin") {
      const school = await School.findById(session!.user.school_id).lean();
      return NextResponse.json({
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          address: school?.address || "",
          role: "admin",
          plan: school?.plan || "free",
          created_at: user.createdAt?.toISOString() || "",
          school_name: school?.school_name || "",
        },
      });
    }

    return NextResponse.json({
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        subject: user.subject || "",
        classes: user.classes?.join(", ") || "",
        role: user.role,
        joining_date: user.joiningDate?.toISOString().split("T")[0] || "",
        status: user.isActive ? "active" : "inactive",
      },
    });
  } catch (err) {
    logError("GET", "/api/profile", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/profile ───
export async function PUT(request: Request) {
  try {
    const { error, session } = await requireAuth("profile:write");
    if (error) return error;

    const body = await request.json();

    // Check if this is a password change
    if (body.currentPassword || body.newPassword) {
      const parsed = changePasswordSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      await connectDB();
      const userId = session!.user.id;
      const user = await User.findById(userId).select("+password");
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const validPw = await bcrypt.compare(
        parsed.data.currentPassword,
        user.password,
      );
      if (!validPw) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      }

      user.password = await bcrypt.hash(parsed.data.newPassword, 12);
      await user.save();

      await audit({
        schoolId: session!.user.school_id,
        action: "update",
        entity: "user",
        entityId: userId,
        userId: session!.user.id || "",
        userName: session!.user.name || session!.user.email || "",
        userRole: session!.user.role,
        changes: { password: { old: "***", new: "***changed***" } },
      });

      return NextResponse.json({ message: "Password updated successfully" });
    }

    // Profile update
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const userId = session!.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldData = { name: user.name, phone: user.phone };
    if (parsed.data.name) user.name = parsed.data.name;
    if (parsed.data.phone !== undefined) user.phone = parsed.data.phone;
    await user.save();

    // If admin, update school address
    if (user.role === "admin" && parsed.data.address !== undefined) {
      await School.findByIdAndUpdate(session!.user.school_id, {
        address: parsed.data.address,
      });
    }

    await audit({
      schoolId: session!.user.school_id,
      action: "update",
      entity: "profile",
      entityId: userId,
      userId: session!.user.id || "",
      userRole: session!.user.role,
      changes: buildChanges(oldData, { name: user.name, phone: user.phone }, [
        "name",
        "phone",
      ]),
    });

    return NextResponse.json({
      message: "Profile updated",
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
      },
    });
  } catch (err) {
    logError("PUT", "/api/profile", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
