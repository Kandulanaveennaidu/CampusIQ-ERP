import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { emitActivity } from "@/lib/socket-io";
import {
  createUserSchema,
  updateUserSchema,
  validationError,
} from "@/lib/validators";
import User from "@/lib/models/User";
import School from "@/lib/models/School";
import { escapeRegex } from "@/lib/utils";
import { PLANS, type PlanId } from "@/lib/plans";
import { cascadeTeacherDeactivation } from "@/lib/cascade";

/**
 * GET /api/users — List all users for the school (admin only)
 * Query params: role, search, status, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    await connectDB();
    const url = request.nextUrl;
    const role = url.searchParams.get("role") || "";
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const filter: Record<string, unknown> = {
      school: session!.user.school_id,
    };
    if (role) filter.role = role;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -failedLoginAttempts -lockedUntil")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Per-role counts — use session school_id directly (works even when users is empty)
    const mongoose = await import("mongoose");
    const schoolOid = new mongoose.Types.ObjectId(
      String(session!.user.school_id),
    );
    const roleCounts = await User.aggregate([
      { $match: { school: schoolOid } },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
        },
      },
    ]);

    const summary = {
      total,
      admins: 0,
      teachers: 0,
      students: 0,
      parents: 0,
      active: 0,
      inactive: 0,
    };

    for (const r of roleCounts) {
      if (r._id === "admin") summary.admins = r.count;
      if (r._id === "teacher") summary.teachers = r.count;
      if (r._id === "student") summary.students = r.count;
      if (r._id === "parent") summary.parents = r.count;
      summary.active += r.active;
      summary.inactive += r.count - r.active;
    }

    return NextResponse.json({
      data: users,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("GET", "/api/users", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/users — Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
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

    // Enforce plan limits before creating user
    const school = await School.findById(session!.user.school_id);
    const plan =
      PLANS.find((p) => p.id === (school?.plan || "starter")) || PLANS[0];
    if (data.role === "teacher" && plan.limits.maxTeachers !== -1) {
      const teacherCount = await User.countDocuments({
        school: session!.user.school_id,
        role: "teacher",
        isActive: true,
      });
      if (teacherCount >= plan.limits.maxTeachers) {
        return NextResponse.json(
          {
            error: `Teacher limit (${plan.limits.maxTeachers}) reached for the ${plan.name} plan. Please upgrade to add more teachers.`,
          },
          { status: 403 },
        );
      }
    }
    if (data.role === "student" && plan.limits.maxStudents !== -1) {
      const studentCount = await User.countDocuments({
        school: session!.user.school_id,
        role: "student",
        isActive: true,
      });
      if (studentCount >= plan.limits.maxStudents) {
        return NextResponse.json(
          {
            error: `Student limit (${plan.limits.maxStudents}) reached for the ${plan.name} plan. Please upgrade to add more students.`,
          },
          { status: 403 },
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: data.role,
      school: session!.user.school_id,
      phone: data.phone || "",
      emailVerified: true,
      isActive: true,
      // Module-level access control
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

    await audit({
      schoolId: session!.user.school_id,
      action: "create",
      entity: "user",
      entityId: user._id.toString(),
      userId: session!.user.id!,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { name: data.name, email: data.email, role: data.role },
    });

    emitActivity({
      type: "user:created",
      title: "New User Created",
      message: `${data.name} added as ${data.role}`,
      module: "users",
      entityId: user._id.toString(),
      actionUrl: "/users",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    logError("POST", "/api/users", err);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/users — Update a user (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const { id, ...updateData } = parsed.data;

    const user = await User.findOne({
      _id: id,
      school: session!.user.school_id,
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deactivating your own account
    if (
      updateData.isActive === false &&
      user._id.toString() === session!.user.id
    ) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }

    // Build update fields
    const updateFields: Record<string, unknown> = {};
    if (updateData.name) updateFields.name = updateData.name;
    if (updateData.email) updateFields.email = updateData.email.toLowerCase();
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
    if (updateData.role) updateFields.role = updateData.role;
    if (updateData.isActive !== undefined)
      updateFields.isActive = updateData.isActive;
    if (updateData.subject !== undefined)
      updateFields.subject = updateData.subject;
    if (updateData.classes !== undefined)
      updateFields.classes = updateData.classes
        .split(",")
        .map((c: string) => c.trim());
    if (updateData.salary_per_day !== undefined)
      updateFields.salaryPerDay = Number(updateData.salary_per_day);
    if (updateData.class_name !== undefined)
      updateFields.className = updateData.class_name;
    if (updateData.roll_number !== undefined)
      updateFields.rollNumber = updateData.roll_number;
    if (updateData.parent_name !== undefined)
      updateFields.parentName = updateData.parent_name;
    if (updateData.parent_phone !== undefined)
      updateFields.parentPhone = updateData.parent_phone;
    if (updateData.address !== undefined)
      updateFields.address = updateData.address;
    if (updateData.allowedModules !== undefined)
      updateFields.allowedModules = updateData.allowedModules;

    // Password change
    if (updateData.password) {
      updateFields.password = await bcrypt.hash(updateData.password, 12);
    }

    // Check email uniqueness if email is being changed
    if (
      updateData.email &&
      updateData.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      const dup = await User.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (dup) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 },
        );
      }
    }

    await User.updateOne({ _id: id }, { $set: updateFields });

    await audit({
      schoolId: session!.user.school_id,
      action: "update",
      entity: "user",
      entityId: id,
      userId: session!.user.id!,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { updated_fields: Object.keys(updateFields) },
    });

    emitActivity({
      type: "user:updated",
      title: "User Updated",
      message: `${user.name}'s profile was updated`,
      module: "users",
      entityId: id,
      actionUrl: "/users",
      session: session!,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("PUT", "/api/users", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/users — Deactivate a user (admin only)
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const body = await request.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findOne({
      _id: id,
      school: session!.user.school_id,
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-deletion
    if (user._id.toString() === session!.user.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }

    await User.updateOne(
      { _id: id },
      { $set: { isActive: false, status: "inactive" } },
    );

    // Cascade: clean up references if user is a teacher
    let cascadeResult = {};
    if (user.role === "teacher") {
      cascadeResult = await cascadeTeacherDeactivation(
        id,
        session!.user.school_id,
      );
    }

    await audit({
      schoolId: session!.user.school_id,
      action: "delete",
      entity: "user",
      entityId: id,
      userId: session!.user.id!,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { deactivated_user: user.email, cascade: cascadeResult },
    });

    emitActivity({
      type: "user:deleted",
      title: "User Deactivated",
      message: `${user.name} (${user.role}) was deactivated`,
      module: "users",
      entityId: id,
      actionUrl: "/users",
      session: session!,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE", "/api/users", err);
    return NextResponse.json(
      { error: "Failed to deactivate user" },
      { status: 500 },
    );
  }
}
