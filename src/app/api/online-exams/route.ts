import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import OnlineExam from "@/lib/models/OnlineExam";
import Student from "@/lib/models/Student";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";
import { notifyOnlineExam } from "@/lib/twilio-notifications";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("exams:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class_name");
    const subject = searchParams.get("subject");
    const teacher = searchParams.get("teacher");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { school: schoolId };
    if (className) query.class_name = className;
    if (subject) query.subject = subject;
    if (status) query.status = status;

    // Teachers see only their own exams, admin sees all
    if (session!.user.role === "teacher") {
      if (teacher) query.teacher = teacher;
      else query.teacher = session!.user.id;
    } else if (teacher) {
      query.teacher = teacher;
    }

    const [exams, total] = await Promise.all([
      OnlineExam.find(query)
        .populate("teacher", "name email")
        .select("-questions.correctOption -questions.explanation -attempts")
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OnlineExam.countDocuments(query),
    ]);

    // Add question count and attempt count
    const data = exams.map((e) => ({
      ...e,
      questionCount: e.questions?.length || 0,
    }));

    logRequest("GET", "/api/online-exams", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("GET", "/api/online-exams", err);
    return NextResponse.json(
      { error: "Failed to fetch online exams" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

    const body = await request.json();
    const {
      title,
      description,
      subject,
      class_name,
      section,
      duration,
      totalMarks,
      passingMarks,
      questions,
      startTime,
      endTime,
      settings,
      status: examStatus,
    } = body;

    if (
      !title ||
      !subject ||
      !class_name ||
      !duration ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        {
          error:
            "title, subject, class_name, duration, startTime, and endTime are required",
        },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // Calculate totalMarks from questions if not provided
    const computedTotalMarks =
      totalMarks ||
      (questions || []).reduce(
        (sum: number, q: { marks?: number }) => sum + (q.marks || 1),
        0,
      ) ||
      0;

    const exam = await OnlineExam.create({
      school: schoolId,
      title,
      description: description || "",
      subject,
      class_name,
      section: section || "",
      teacher: session!.user.id,
      duration,
      totalMarks: computedTotalMarks,
      passingMarks: passingMarks || 0,
      questions: questions || [],
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: examStatus || "draft",
      settings: settings || {},
    });

    createAuditLog({
      school: schoolId,
      action: "create",
      entity: "online-exam",
      entityId: exam._id.toString(),
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    // Notify students/parents when exam is published (not draft)
    if (examStatus === "published" || examStatus === "scheduled") {
      try {
        const students = await Student.find({
          school: schoolId,
          class_name,
          status: "active",
        })
          .select("parent_phone")
          .lean();

        const startTimeStr = new Date(startTime).toLocaleString("en-IN");
        for (const s of students) {
          if (s.parent_phone) {
            notifyOnlineExam(
              s.parent_phone,
              title,
              subject,
              startTimeStr,
            ).catch(() => {});
          }
        }
      } catch {
        // Notification is best-effort
      }
    }

    logRequest("POST", "/api/online-exams", session!.user.id, schoolId);

    emitActivity({
      type: "exam:created",
      title: "Online Exam Created",
      message: `"${exam.title}" exam scheduled for ${exam.class_name || "class"}`,
      module: "online-exams",
      entityId: exam._id.toString(),
      actionUrl: "/online-exams",
      session: session!,
    });

    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (err) {
    logError("POST", "/api/online-exams", err);
    return NextResponse.json(
      { error: "Failed to create online exam" },
      { status: 500 },
    );
  }
}
