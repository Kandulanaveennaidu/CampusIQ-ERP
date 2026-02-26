import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import Role from "@/lib/models/Role";
import { MODULES } from "@/lib/plans";
import { emitActivity } from "@/lib/socket-io";
import { escapeRegex } from "@/lib/utils";

/**
 * GET /api/roles — List all roles for the school (admin only)
 */
export async function GET() {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    await connectDB();

    const roles = await Role.find({ school: session!.user.school_id })
      .sort({ isSystem: -1, name: 1 })
      .lean();

    // Return available menu items for reference
    const menuItems = Object.entries(MODULES).map(([id, label]) => ({
      id,
      label,
    }));

    return NextResponse.json({ data: roles, menuItems });
  } catch (err) {
    logError("GET", "/api/roles", err);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/roles — Create a new custom role
 */
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    const { name, description, permissions } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Role name is required (minimum 2 characters)" },
        { status: 400 },
      );
    }

    // Check for duplicate role name in this school
    const existing = await Role.findOne({
      school: session!.user.school_id,
      name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 },
      );
    }

    // Validate permissions array
    const validMenuIds = Object.keys(MODULES);
    const validatedPermissions = (permissions || [])
      .filter((p: { menu: string }) => p.menu && validMenuIds.includes(p.menu))
      .map(
        (p: {
          menu: string;
          view?: boolean;
          add?: boolean;
          edit?: boolean;
          delete?: boolean;
        }) => ({
          menu: p.menu,
          view: !!p.view,
          add: !!p.add,
          edit: !!p.edit,
          delete: !!p.delete,
        }),
      );

    const role = await Role.create({
      name: name.trim(),
      school: session!.user.school_id,
      description: description || "",
      permissions: validatedPermissions,
      createdBy: session!.user.id,
      isSystem: false,
    });

    await audit({
      action: "create",
      userId: session!.user.id,
      schoolId: session!.user.school_id,
      entity: "Role",
      entityId: role._id.toString(),
      metadata: { roleName: name },
    });

    emitActivity({
      type: "role:created",
      title: "New Role Created",
      message: `Role "${name}" has been created`,
      module: "roles",
      entityId: role._id.toString(),
      actionUrl: "/roles",
      session: session!,
    });

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (err) {
    logError("POST", "/api/roles", err);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/roles — Update an existing role
 */
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    const { id, name, description, permissions, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 },
      );
    }

    const role = await Role.findOne({
      _id: id,
      school: session!.user.school_id,
    });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // System roles can only have permissions updated, not name changes
    if (role.isSystem && name && name.trim() !== role.name) {
      return NextResponse.json(
        { error: "System role names cannot be changed" },
        { status: 400 },
      );
    }

    // Check duplicate name (exclude current role)
    if (name && name.trim() !== role.name) {
      const dup = await Role.findOne({
        school: session!.user.school_id,
        name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
        _id: { $ne: id },
      });
      if (dup) {
        return NextResponse.json(
          { error: "A role with this name already exists" },
          { status: 409 },
        );
      }
    }

    // Update fields
    if (name) role.name = name.trim();
    if (typeof description === "string") role.description = description;
    if (typeof isActive === "boolean") role.isActive = isActive;

    if (permissions && Array.isArray(permissions)) {
      const validMenuIds = Object.keys(MODULES);
      role.permissions = permissions
        .filter(
          (p: { menu: string }) => p.menu && validMenuIds.includes(p.menu),
        )
        .map(
          (p: {
            menu: string;
            view?: boolean;
            add?: boolean;
            edit?: boolean;
            delete?: boolean;
          }) => ({
            menu: p.menu,
            view: !!p.view,
            add: !!p.add,
            edit: !!p.edit,
            delete: !!p.delete,
          }),
        );
    }

    await role.save();

    await audit({
      action: "update",
      userId: session!.user.id,
      schoolId: session!.user.school_id,
      entity: "Role",
      entityId: role._id.toString(),
      metadata: { roleName: role.name },
    });

    emitActivity({
      type: "role:updated",
      title: "Role Updated",
      message: `Role "${role.name}" permissions have been updated`,
      module: "roles",
      entityId: role._id.toString(),
      actionUrl: "/roles",
      session: session!,
    });

    return NextResponse.json({ data: role });
  } catch (err) {
    logError("PUT", "/api/roles", err);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/roles — Delete (soft-delete) a custom role
 */
export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    await connectDB();
    const url = request.nextUrl;
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 },
      );
    }

    const role = await Role.findOne({
      _id: id,
      school: session!.user.school_id,
    });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json(
        { error: "System roles cannot be deleted" },
        { status: 400 },
      );
    }

    // Unassign users from this role
    const User = (await import("@/lib/models/User")).default;
    await User.updateMany(
      { school: session!.user.school_id, customRole: role._id },
      { $set: { customRole: null } },
    );

    await Role.deleteOne({ _id: role._id });

    await audit({
      action: "delete",
      userId: session!.user.id,
      schoolId: session!.user.school_id,
      entity: "Role",
      entityId: role._id.toString(),
      metadata: { roleName: role.name },
    });

    emitActivity({
      type: "role:deleted",
      title: "Role Deleted",
      message: `Role "${role.name}" has been deleted`,
      module: "roles",
      entityId: role._id.toString(),
      actionUrl: "/roles",
      session: session!,
    });

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (err) {
    logError("DELETE", "/api/roles", err);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 },
    );
  }
}
