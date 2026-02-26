import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TeacherEvaluation from "@/lib/models/TeacherEvaluation";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";

/**
 * GET /api/teacher-evaluation — List evaluations
 * Query: ?teacher=ID to filter by teacher
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("teachers:read");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacher");

    const query: Record<string, unknown> = { school: session!.user.school_id };
    if (teacherId) query.teacher = teacherId;

    const evals = await TeacherEvaluation.find(query)
      .sort({ createdAt: -1 })
      .populate("teacher", "name role")
      .lean();

    // Group by teacher and compute aggregate stats
    const teacherMap = new Map<
      string,
      {
        teacher_id: string;
        name: string;
        department: string;
        totalEvals: number;
        avgRating: number;
        ratings: {
          teaching_quality: number;
          communication: number;
          punctuality: number;
          subject_knowledge: number;
          approachability: number;
        };
        recentComments: string[];
      }
    >();

    for (const ev of evals) {
      const tid = String(
        (ev.teacher as Record<string, unknown>)?._id || ev.teacher,
      );
      const tName = (ev.teacher as Record<string, unknown>)?.name || "Unknown";
      const role = (ev.teacher as Record<string, unknown>)?.role || "";

      if (!teacherMap.has(tid)) {
        teacherMap.set(tid, {
          teacher_id: tid,
          name: String(tName),
          department: String(role),
          totalEvals: 0,
          avgRating: 0,
          ratings: {
            teaching_quality: 0,
            communication: 0,
            punctuality: 0,
            subject_knowledge: 0,
            approachability: 0,
          },
          recentComments: [],
        });
      }

      const t = teacherMap.get(tid)!;
      t.totalEvals++;
      const r = ev.ratings as Record<string, number>;
      t.ratings.teaching_quality += r.teaching_quality;
      t.ratings.communication += r.communication;
      t.ratings.punctuality += r.punctuality;
      t.ratings.subject_knowledge += r.subject_knowledge;
      t.ratings.approachability += r.approachability;
      if (ev.comments && t.recentComments.length < 5) {
        t.recentComments.push(String(ev.comments));
      }
    }

    // Compute averages
    const data = Array.from(teacherMap.values()).map((t) => ({
      ...t,
      avgRating:
        Math.round(
          ((t.ratings.teaching_quality +
            t.ratings.communication +
            t.ratings.punctuality +
            t.ratings.subject_knowledge +
            t.ratings.approachability) /
            (5 * t.totalEvals)) *
            10,
        ) / 10,
      ratings: {
        teaching_quality:
          Math.round((t.ratings.teaching_quality / t.totalEvals) * 10) / 10,
        communication:
          Math.round((t.ratings.communication / t.totalEvals) * 10) / 10,
        punctuality:
          Math.round((t.ratings.punctuality / t.totalEvals) * 10) / 10,
        subject_knowledge:
          Math.round((t.ratings.subject_knowledge / t.totalEvals) * 10) / 10,
        approachability:
          Math.round((t.ratings.approachability / t.totalEvals) * 10) / 10,
      },
    }));

    return NextResponse.json({
      data,
      total: data.length,
      rawCount: evals.length,
    });
  } catch (err) {
    logError("GET", "/api/teacher-evaluation", err);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/teacher-evaluation — Submit an evaluation
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("teachers:write");
    if (error) return error;

    await connectDB();
    const body = await request.json();

    if (!body.teacher || !body.ratings) {
      return NextResponse.json(
        { error: "teacher and ratings are required" },
        { status: 400 },
      );
    }

    const {
      teaching_quality,
      communication,
      punctuality,
      subject_knowledge,
      approachability,
    } = body.ratings;
    if (
      [
        teaching_quality,
        communication,
        punctuality,
        subject_knowledge,
        approachability,
      ].some((r) => !r || r < 1 || r > 5)
    ) {
      return NextResponse.json(
        { error: "All ratings must be between 1 and 5" },
        { status: 400 },
      );
    }

    const evaluation = await TeacherEvaluation.create({
      school: session!.user.school_id,
      teacher: body.teacher,
      evaluator: session!.user.id,
      evaluatorRole: session!.user.role || "student",
      semester: body.semester || "",
      ratings: body.ratings,
      comments: body.comments || "",
      isAnonymous: body.isAnonymous !== false,
    });

    emitActivity({
      type: "evaluation:submitted",
      title: "Teacher Evaluation Submitted",
      message: `A new teacher evaluation has been submitted`,
      module: "teacher-evaluation",
      entityId: evaluation._id.toString(),
      actionUrl: "/teacher-evaluation",
      session: session!,
    });

    return NextResponse.json({
      success: true,
      evaluation_id: evaluation._id.toString(),
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        {
          error:
            "You have already submitted an evaluation for this teacher this semester",
        },
        { status: 409 },
      );
    }
    logError("POST", "/api/teacher-evaluation", err);
    return NextResponse.json(
      { error: "Failed to submit evaluation" },
      { status: 500 },
    );
  }
}
