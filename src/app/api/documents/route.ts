import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import StudentDocument from "@/lib/models/StudentDocument";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";

/**
 * GET /api/documents — List student documents
 * Query: ?student=ID&type=birth_certificate
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student");
    const type = searchParams.get("type");

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (studentId) query.student = studentId;
    if (type) query.type = type;

    const docs = await StudentDocument.find(query)
      .sort({ createdAt: -1 })
      .populate("student", "name rollNumber")
      .populate("uploadedBy", "name")
      .lean();

    const data = docs.map((d: Record<string, unknown>) => ({
      document_id: String(d._id),
      student: d.student,
      title: d.title,
      type: d.type,
      fileUrl: d.fileUrl,
      fileType: d.fileType,
      fileSize: d.fileSize,
      uploadedBy: d.uploadedBy,
      notes: d.notes,
      created_at: d.createdAt,
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    logError("GET", "/api/documents", err);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/documents — Upload a new student document
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    if (!body.student || !body.title || !body.type || !body.fileUrl) {
      return NextResponse.json(
        { error: "student, title, type, and fileUrl are required" },
        { status: 400 },
      );
    }

    const doc = await StudentDocument.create({
      school: session!.user.school_id,
      student: body.student,
      title: body.title,
      type: body.type,
      fileUrl: body.fileUrl,
      fileType: body.fileType || "",
      fileSize: body.fileSize || 0,
      uploadedBy: session!.user.id,
      notes: body.notes || "",
    });

    emitActivity({
      type: "document:uploaded",
      title: "Document Uploaded",
      message: `"${body.title || "Document"}" has been uploaded`,
      module: "documents",
      entityId: doc._id.toString(),
      actionUrl: "/documents",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      document_id: doc._id.toString(),
    });
  } catch (err) {
    logError("POST", "/api/documents", err);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/documents — Delete a document
 * Body: { document_id }
 */
export async function DELETE(request: Request) {
  try {
    const { error, session } = await requireAuth("students:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    if (!body.document_id) {
      return NextResponse.json(
        { error: "document_id is required" },
        { status: 400 },
      );
    }

    await StudentDocument.deleteOne({
      _id: body.document_id,
      school: session!.user.school_id,
    });

    emitActivity({
      type: "document:deleted",
      title: "Document Removed",
      message: `A document has been deleted`,
      module: "documents",
      entityId: body.document_id,
      actionUrl: "/documents",
      session: session!,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE", "/api/documents", err);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
