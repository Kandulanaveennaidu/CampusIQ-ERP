import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import QRToken from "@/lib/models/QRToken";
import Attendance from "@/lib/models/Attendance";
import { requireAuth } from "@/lib/permissions";
import {
  qrGenerateSchema,
  qrScanSchema,
  validationError,
} from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import crypto from "crypto";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("qr:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class_name");

    if (!className) {
      return NextResponse.json(
        { error: "class_name is required" },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];
    await connectDB();

    const existing = await QRToken.findOne({
      school: session!.user.school_id,
      class_name: className,
      date: today,
      expires_at: { $gt: new Date() },
    }).lean();

    if (existing) {
      return NextResponse.json({
        data: {
          token: existing.token,
          class_name: className,
          date: today,
          expires_at: existing.expires_at.toISOString(),
        },
      });
    }

    return NextResponse.json({ data: null, message: "No active QR token" });
  } catch (error) {
    logError("GET", "/api/qr-attendance", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("qr:write");
    if (error) return error;

    const body = await request.json();
    const { action } = body;

    await connectDB();

    if (action === "generate") {
      const parsed = qrGenerateSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const { class_name, duration_minutes } = parsed.data;
      const today = new Date().toISOString().split("T")[0];
      const token = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date(
        Date.now() + (duration_minutes || 30) * 60 * 1000,
      );

      await QRToken.create({
        school: session!.user.school_id,
        class_name,
        date: today,
        token,
        expires_at: expiresAt,
        created_by: session!.user.id,
      });

      await audit({
        action: "create",
        entity: "qr_token",
        entityId: token,
        schoolId: session!.user.school_id,
        userId: session!.user.id || "",
        userName: session!.user.name,
        userRole: session!.user.role,
        metadata: { class_name, duration_minutes },
      });

      emitActivity({
        type: "qr:generated",
        title: "QR Attendance Token Generated",
        message: `QR code generated for ${class_name} (${duration_minutes || 30} min)`,
        module: "qr-attendance",
        entityId: token,
        actionUrl: "/qr-attendance",
        session: session!,
      });

      return NextResponse.json({
        message: "QR token generated",
        data: {
          token,
          class_name,
          date: today,
          expires_at: expiresAt.toISOString(),
          qr_content: JSON.stringify({
            school_id: session!.user.school_id,
            class_name,
            token,
            date: today,
          }),
        },
      });
    } else if (action === "scan") {
      const parsed = qrScanSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const { token, student_id } = parsed.data;

      const validToken = await QRToken.findOne({
        token,
        school: session!.user.school_id,
        expires_at: { $gt: new Date() },
      }).lean();

      if (!validToken) {
        return NextResponse.json(
          { error: "Invalid or expired QR token" },
          { status: 400 },
        );
      }

      const today = new Date().toISOString().split("T")[0];

      const alreadyMarked = await Attendance.findOne({
        date: today,
        student: student_id,
        school: session!.user.school_id,
      });

      if (alreadyMarked) {
        return NextResponse.json({
          message: "Attendance already marked",
          data: { status: alreadyMarked.status },
        });
      }

      const now = new Date();
      const hour = now.getHours();
      const status = hour >= 9 ? "late" : "present";

      await Attendance.create({
        date: today,
        school: session!.user.school_id,
        class_name: validToken.class_name,
        student: student_id,
        status,
        marked_by: "qr_scan",
        marked_at: now.toISOString(),
        notes:
          status === "late"
            ? `Late arrival at ${now.toLocaleTimeString()}`
            : "QR scan check-in",
      });

      emitActivity({
        type: "qr:scanned",
        title: "QR Attendance Scanned",
        message: `Student attendance marked via QR scan (${validToken.class_name})`,
        module: "qr-attendance",
        actionUrl: "/qr-attendance",
        session: session!,
      });

      return NextResponse.json({
        message: "Attendance marked via QR scan",
        data: { status, time: now.toISOString() },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logError("POST", "/api/qr-attendance", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
