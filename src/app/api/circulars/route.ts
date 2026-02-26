import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Circular from "@/lib/models/Circular";
import { requireAuth, requireRole } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import { notifyCircular } from "@/lib/twilio-notifications";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const audience = searchParams.get("audience");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    await connectDB();

    const query: Record<string, unknown> = { school: session!.user.school_id };

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (audience) query.targetAudience = { $in: [audience, "all"] };

    const total = await Circular.countDocuments(query);
    const circulars = await Circular.find(query)
      .populate("createdBy", "name email")
      .sort({ publishDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = circulars.map((c) => ({
      _id: c._id.toString(),
      title: c.title,
      content: c.content,
      type: c.type,
      priority: c.priority,
      targetAudience: c.targetAudience || [],
      attachments: c.attachments || [],
      publishDate: c.publishDate,
      expiryDate: c.expiryDate,
      isPublished: c.isPublished,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError("GET", "/api/circulars", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 },
      );
    }

    await connectDB();

    const circular = await Circular.create({
      school: session!.user.school_id,
      title,
      content,
      type: type || "circular",
      priority: priority || "medium",
      targetAudience: targetAudience || ["all"],
      attachments: attachments || [],
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isPublished: isPublished !== undefined ? isPublished : true,
      createdBy: session!.user.id,
    });

    emitActivity({
      type: "circular:created",
      title: "New Circular Published",
      message: `${title}`,
      module: "circulars",
      entityId: circular._id.toString(),
      actionUrl: "/circulars",
      session: session!,
    });

    // Fire-and-forget: SMS + WhatsApp broadcast to target audience
    if (isPublished !== false) {
      try {
        const schoolId = session!.user.school_id;
        const audiences = targetAudience || ["all"];
        const phones: string[] = [];

        // Get teachers
        if (
          audiences.includes("all") ||
          audiences.includes("teacher") ||
          audiences.includes("teachers")
        ) {
          const teachers = await User.find({
            school: schoolId,
            role: "teacher",
            isActive: true,
          })
            .select("phone")
            .lean();
          phones.push(...teachers.filter((t) => t.phone).map((t) => t.phone));
        }
        // Get parents (via students)
        if (
          audiences.includes("all") ||
          audiences.includes("parent") ||
          audiences.includes("parents") ||
          audiences.includes("student") ||
          audiences.includes("students")
        ) {
          const students = await Student.find({
            school: schoolId,
            status: "active",
          })
            .select("parent_phone")
            .lean();
          phones.push(
            ...students
              .filter((s) => s.parent_phone)
              .map((s) => s.parent_phone),
          );
        }

        // Deduplicate
        const uniquePhones = [...new Set(phones)];
        for (const phone of uniquePhones) {
          notifyCircular(phone, title).catch(() => {});
          // Rate-limit
          await new Promise((r) => setTimeout(r, 100));
        }
      } catch {
        // Notification is best-effort
      }
    }

    return NextResponse.json(
      { data: circular, message: "Circular created successfully" },
      { status: 201 },
    );
  } catch (error) {
    logError("POST", "/api/circulars", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
