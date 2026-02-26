import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Setting from "@/lib/models/Setting";
import School from "@/lib/models/School";
import { requireAuth, requireRole } from "@/lib/permissions";
import { settingsSchema, validationError } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";

export async function GET() {
  try {
    const { error, session } = await requireAuth("settings:read");
    if (error) return error;

    const schoolId = session!.user.school_id;
    await connectDB();

    const settings = await Setting.find({ school: schoolId }).lean();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const school = await School.findById(schoolId).lean();

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      school: school
        ? {
            school_id: school._id.toString(),
            school_name: school.school_name,
            address: school.address || "",
            phone: school.phone || "",
            email: school.email || "",
            admin_email: school.email || "",
            plan: school.plan || "free",
          }
        : null,
    });
  } catch (error) {
    logError("GET", "/api/settings", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    const schoolId = session!.user.school_id;
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { settings } = parsed.data;

    await connectDB();

    const bulkOps = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { school: new mongoose.Types.ObjectId(schoolId), key },
        update: {
          $set: {
            school: new mongoose.Types.ObjectId(schoolId),
            key,
            value: String(value),
          },
        },
        upsert: true,
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Setting.bulkWrite(bulkOps as any);

    await audit({
      action: "update",
      entity: "settings",
      entityId: schoolId,
      schoolId,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { updatedKeys: Object.keys(settings) },
    });

    emitActivity({
      type: "settings:updated",
      title: "Settings Updated",
      message: `Institution settings were updated`,
      module: "settings",
      actionUrl: "/settings",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    logError("PUT", "/api/settings", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
