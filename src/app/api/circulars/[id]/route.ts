import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Circular from "@/lib/models/Circular";
import { requireAuth, requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    await connectDB();

    const circular = await Circular.findOne({
      _id: params.id,
      school: session!.user.school_id,
    })
      .populate("createdBy", "name email")
      .lean();

    if (!circular) {
      return NextResponse.json(
        { error: "Circular not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: circular });
  } catch (error) {
    logError("GET", `/api/circulars/${params.id}`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireRole("admin", "teacher");
    if (error) return error;

    const body = await request.json();
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      attachments,
      publishDate,
      expiryDate,
      isPublished,
    } = body;

    await connectDB();

    const circular = await Circular.findOneAndUpdate(
      { _id: params.id, school: session!.user.school_id },
      {
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
        ...(priority && { priority }),
        ...(targetAudience && { targetAudience }),
        ...(attachments && { attachments }),
        ...(publishDate && { publishDate: new Date(publishDate) }),
        ...(expiryDate !== undefined && {
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        }),
        ...(isPublished !== undefined && { isPublished }),
      },
      { new: true },
    );

    if (!circular) {
      return NextResponse.json(
        { error: "Circular not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: circular,
      message: "Circular updated successfully",
    });
  } catch (error) {
    logError("PUT", `/api/circulars/${params.id}`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireRole("admin");
    if (error) return error;

    await connectDB();

    const circular = await Circular.findOneAndDelete({
      _id: params.id,
      school: session!.user.school_id,
    });

    if (!circular) {
      return NextResponse.json(
        { error: "Circular not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Circular deleted successfully" });
  } catch (error) {
    logError("DELETE", `/api/circulars/${params.id}`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
