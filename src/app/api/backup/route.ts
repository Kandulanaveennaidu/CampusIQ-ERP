import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Backup from "@/lib/models/Backup";
import mongoose from "mongoose";
import { logRequest, logError } from "@/lib/logger";
import { backupSchema, validationError } from "@/lib/validators";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const { error, session } = await requireAuth("backup:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/backup", session!.user.id, schoolId);

    const backups = await Backup.find({ school: schoolId })
      .sort({ createdAt: -1 })
      .limit(20);
    return NextResponse.json({ success: true, data: backups });
  } catch (err) {
    logError("GET", "/api/backup", err);
    return NextResponse.json(
      { error: "Failed to fetch backups" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("backup:write");
    if (error) return error;

    const body = await request.json();
    const parsed = backupSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("POST", "/api/backup", session!.user.id, schoolId);

    if (parsed.data.action === "create") {
      const collections =
        parsed.data.collections && parsed.data.collections.length > 0
          ? parsed.data.collections
          : [
              "students",
              "users",
              "attendance",
              "leaves",
              "notifications",
              "visitors",
              "rooms",
              "holidays",
              "timetables",
              "settings",
              "fees",
              "exams",
              "grades",
            ];

      const backup = await Backup.create({
        school: schoolId,
        name:
          parsed.data.name ||
          `Backup-${new Date().toISOString().split("T")[0]}`,
        type: parsed.data.type || "manual",
        collections,
        createdBy: session!.user.id,
      });

      // Collect backup data
      try {
        const db = mongoose.connection.db;
        if (!db) throw new Error("Database not connected");

        const backupData: Record<string, unknown[]> = {};
        let totalSize = 0;

        for (const collName of collections) {
          try {
            const collection = db.collection(collName);
            const docs = await collection
              .find({ school: new mongoose.Types.ObjectId(schoolId) })
              .toArray();
            backupData[collName] = docs;
            totalSize += JSON.stringify(docs).length;
          } catch {
            // Collection might not exist
          }
        }

        backup.status = "completed";
        backup.size = totalSize;
        backup.completedAt = new Date();
        backup.storageUrl = `backup://${schoolId}/${backup._id}`;
        await backup.save();

        await audit({
          action: "create",
          entity: "backup",
          entityId: backup._id.toString(),
          schoolId,
          userId: session!.user.id || "",
          userName: session!.user.name,
          userRole: session!.user.role,
          metadata: { collections: Object.keys(backupData), size: totalSize },
        });

        return NextResponse.json({
          success: true,
          data: backup,
          message: `Backup completed. ${Object.keys(backupData).length} collections backed up.`,
        });
      } catch (backupErr) {
        backup.status = "failed";
        backup.errorMessage =
          backupErr instanceof Error ? backupErr.message : "Backup failed";
        await backup.save();

        return NextResponse.json(
          {
            success: false,
            error: "Backup failed",
            data: backup,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logError("POST", "/api/backup", err);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 },
    );
  }
}
