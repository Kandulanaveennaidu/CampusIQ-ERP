import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import OnlineExam from "@/lib/models/OnlineExam";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";

const updateExamSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    subject: z.string().min(1).max(100).optional(),
    class_name: z.string().min(1).max(50).optional(),
    section: z.string().max(10).optional(),
    duration: z.number().int().min(1).max(600).optional(),
    totalMarks: z.number().int().min(1).optional(),
    passingMarks: z.number().int().min(0).optional(),
    questions: z
      .array(
        z.object({
          question: z.string().min(1),
          options: z.array(z.string()).min(2).max(6),
          correctOption: z.number().int().min(0),
          marks: z.number().min(0).optional(),
          explanation: z.string().optional(),
        }),
      )
      .optional(),
    startTime: z
      .string()
      .datetime()
      .or(z.string().pipe(z.coerce.date()))
      .optional(),
    endTime: z
      .string()
      .datetime()
      .or(z.string().pipe(z.coerce.date()))
      .optional(),
    status: z.enum(["draft", "published", "active", "completed"]).optional(),
    settings: z
      .object({
        shuffleQuestions: z.boolean().optional(),
        showResults: z.boolean().optional(),
        allowRetake: z.boolean().optional(),
        maxAttempts: z.number().int().min(1).optional(),
      })
      .optional(),
  })
  .strict();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;

    const exam = await OnlineExam.findOne({
      _id: params.id,
      school: schoolId,
    })
      .populate("teacher", "name email")
      .populate("attempts.student", "name rollNumber class_name");

    if (!exam) {
      return NextResponse.json(
        { error: "Online exam not found" },
        { status: 404 },
      );
    }

    const examObj = exam.toObject();

    // For students: hide correct answers if exam is active/published
    if (
      session!.user.role === "student" &&
      (exam.status === "active" || exam.status === "published")
    ) {
      examObj.questions = examObj.questions.map((q) => ({
        question: q.question,
        options: q.options,
        marks: q.marks,
        correctOption: undefined as unknown as number,
        explanation: "",
      }));
      // Only show the student's own attempts
      examObj.attempts = examObj.attempts.filter(
        (a) => a.student?.toString() === session!.user.id,
      );
    }

    logRequest(
      "GET",
      `/api/online-exams/${params.id}`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({ success: true, data: examObj });
  } catch (err) {
    logError("GET", "/api/online-exams/[id]", err);
    return NextResponse.json(
      { error: "Failed to fetch online exam" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

    const body = await request.json();
    const parsed = updateExamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const data = parsed.data;
    await connectDB();
    const schoolId = session!.user.school_id;

    const exam = await OnlineExam.findOne({
      _id: params.id,
      school: schoolId,
    });

    if (!exam) {
      return NextResponse.json(
        { error: "Online exam not found" },
        { status: 404 },
      );
    }

    if (
      session!.user.role !== "admin" &&
      exam.teacher.toString() !== session!.user.id
    ) {
      return NextResponse.json(
        { error: "You can only edit your own exams" },
        { status: 403 },
      );
    }

    const allowedFields = [
      "title",
      "description",
      "subject",
      "class_name",
      "section",
      "duration",
      "totalMarks",
      "passingMarks",
      "questions",
      "startTime",
      "endTime",
      "status",
      "settings",
    ] as const;

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === "startTime" || field === "endTime") {
          (exam as Record<string, unknown>)[field] = new Date(
            data[field] as string,
          );
        } else {
          (exam as Record<string, unknown>)[field] = data[field];
        }
      }
    }

    // Recalculate totalMarks if questions changed and totalMarks not explicitly set
    if (data.questions && !data.totalMarks) {
      exam.totalMarks = data.questions.reduce(
        (sum, q) => sum + (q.marks || 1),
        0,
      );
    }

    await exam.save();

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "online-exam",
      entityId: params.id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    logRequest(
      "PUT",
      `/api/online-exams/${params.id}`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({ success: true, data: exam });
  } catch (err) {
    logError("PUT", "/api/online-exams/[id]", err);
    return NextResponse.json(
      { error: "Failed to update online exam" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:write");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;

    const exam = await OnlineExam.findOne({
      _id: params.id,
      school: schoolId,
    });

    if (!exam) {
      return NextResponse.json(
        { error: "Online exam not found" },
        { status: 404 },
      );
    }

    if (
      session!.user.role !== "admin" &&
      exam.teacher.toString() !== session!.user.id
    ) {
      return NextResponse.json(
        { error: "You can only delete your own exams" },
        { status: 403 },
      );
    }

    await OnlineExam.deleteOne({ _id: params.id, school: schoolId });

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "online-exam",
      entityId: params.id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { title: exam.title },
    });

    logRequest(
      "DELETE",
      `/api/online-exams/${params.id}`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({
      success: true,
      message: "Online exam deleted successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/online-exams/[id]", err);
    return NextResponse.json(
      { error: "Failed to delete online exam" },
      { status: 500 },
    );
  }
}
