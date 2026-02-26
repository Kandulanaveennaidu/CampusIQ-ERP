import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SchoolBranding from "@/lib/models/SchoolBranding";
import { logError } from "@/lib/logger";

/**
 * GET /api/branding — Get school branding config
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("settings:read");
    if (error) return error;

    await connectDB();
    let branding = await SchoolBranding.findOne({
      school: session!.user.school_id,
    }).lean();

    if (!branding) {
      // Return defaults
      branding = {
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
        accentColor: "#f59e0b",
        fontFamily: "Inter",
        sidebarStyle: "default",
        headerStyle: "default",
        showPoweredBy: true,
      } as Record<string, unknown>;
    }

    return NextResponse.json({ data: branding });
  } catch (err) {
    logError("GET", "/api/branding", err);
    return NextResponse.json(
      { error: "Failed to fetch branding" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/branding — Update school branding
 */
export async function PUT(request: Request) {
  try {
    const { error, session } = await requireAuth("settings:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    const branding = await SchoolBranding.findOneAndUpdate(
      { school: session!.user.school_id },
      { ...body, school: session!.user.school_id },
      { upsert: true, new: true },
    );

    return NextResponse.json({ data: branding });
  } catch (err) {
    logError("PUT", "/api/branding", err);
    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 },
    );
  }
}
