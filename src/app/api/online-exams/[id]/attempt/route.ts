import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import OnlineExam from "@/lib/models/OnlineExam";
import { logRequest, logError } from "@/lib/logger";

// POST — Start an exam attempt
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:read");
    if (error) return error;

    const body = await request.json();
    const { student_id } = body;

    if (!student_id) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 },
      );
    }

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

    if (exam.status !== "active" && exam.status !== "published") {
      return NextResponse.json(
        { error: "This exam is not currently available" },
        { status: 400 },
      );
    }

    // Check time window
    const now = new Date();
    if (now < exam.startTime) {
      return NextResponse.json(
        { error: "This exam has not started yet" },
        { status: 400 },
      );
    }
    if (now > exam.endTime) {
      return NextResponse.json(
        { error: "This exam has ended" },
        { status: 400 },
      );
    }

    // Check max attempts
    const existingAttempts = exam.attempts.filter(
      (a) => a.student.toString() === student_id,
    );
    const maxAttempts = exam.settings?.maxAttempts || 1;

    if (existingAttempts.length >= maxAttempts) {
      return NextResponse.json(
        { error: `Maximum attempts (${maxAttempts}) reached` },
        { status: 400 },
      );
    }

    // Check if there's already a started (in-progress) attempt
    const inProgress = existingAttempts.find((a) => a.status === "started");
    if (inProgress) {
      // Return existing in-progress attempt questions
      const questions = exam.questions.map((q) => ({
        question: q.question,
        options: exam.settings?.shuffleQuestions
          ? [...q.options].sort(() => Math.random() - 0.5)
          : q.options,
        marks: q.marks,
      }));

      return NextResponse.json({
        success: true,
        message: "Resuming existing attempt",
        data: {
          questions,
          duration: exam.duration,
          startedAt: inProgress.startedAt,
          totalMarks: exam.totalMarks,
        },
      });
    }

    // Create new attempt
    exam.attempts.push({
      student: student_id,
      answers: [],
      score: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalUnanswered: exam.questions.length,
      startedAt: new Date(),
      status: "started",
    } as never);

    await exam.save();

    // Return questions without correct answers
    const questions = exam.questions.map((q) => ({
      question: q.question,
      options: exam.settings?.shuffleQuestions
        ? [...q.options].sort(() => Math.random() - 0.5)
        : q.options,
      marks: q.marks,
    }));

    logRequest(
      "POST",
      `/api/online-exams/${params.id}/attempt`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({
      success: true,
      message: "Exam attempt started",
      data: {
        questions,
        duration: exam.duration,
        startedAt: new Date(),
        totalMarks: exam.totalMarks,
      },
    });
  } catch (err) {
    logError("POST", "/api/online-exams/[id]/attempt", err);
    return NextResponse.json(
      { error: "Failed to start exam attempt" },
      { status: 500 },
    );
  }
}

// PUT — Submit exam attempt (auto-calculate score)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { error, session } = await requireAuth("exams:read");
    if (error) return error;

    const body = await request.json();
    const { student_id, answers } = body;

    if (!student_id || !answers) {
      return NextResponse.json(
        { error: "student_id and answers are required" },
        { status: 400 },
      );
    }

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

    // Find the student's started attempt
    const attemptIdx = exam.attempts.findIndex(
      (a) => a.student.toString() === student_id && a.status === "started",
    );

    if (attemptIdx < 0) {
      return NextResponse.json(
        { error: "No active attempt found for this student" },
        { status: 404 },
      );
    }

    // Check if duration exceeded → timed-out
    const attempt = exam.attempts[attemptIdx];
    const elapsed =
      (Date.now() - new Date(attempt.startedAt).getTime()) / 60000;
    const isTimedOut = elapsed > exam.duration + 1; // 1 min grace

    // Calculate score
    let totalCorrect = 0;
    let totalWrong = 0;
    let score = 0;

    const answeredIndices = new Set(
      (answers as { questionIndex: number; selectedOption: number }[]).map(
        (a) => a.questionIndex,
      ),
    );

    for (const ans of answers as {
      questionIndex: number;
      selectedOption: number;
    }[]) {
      const q = exam.questions[ans.questionIndex];
      if (!q) continue;

      if (ans.selectedOption === q.correctOption) {
        totalCorrect++;
        score += q.marks || 1;
      } else {
        totalWrong++;
      }
    }

    const totalUnanswered = exam.questions.length - answeredIndices.size;

    // Update attempt
    exam.attempts[attemptIdx].answers = answers;
    exam.attempts[attemptIdx].score = score;
    exam.attempts[attemptIdx].totalCorrect = totalCorrect;
    exam.attempts[attemptIdx].totalWrong = totalWrong;
    exam.attempts[attemptIdx].totalUnanswered = totalUnanswered;
    exam.attempts[attemptIdx].submittedAt = new Date();
    exam.attempts[attemptIdx].status = isTimedOut ? "timed-out" : "submitted";

    await exam.save();

    const result = {
      score,
      totalMarks: exam.totalMarks,
      totalCorrect,
      totalWrong,
      totalUnanswered,
      passed: score >= exam.passingMarks,
      status: isTimedOut ? "timed-out" : "submitted",
    };

    logRequest(
      "PUT",
      `/api/online-exams/${params.id}/attempt`,
      session!.user.id,
      schoolId,
    );
    return NextResponse.json({
      success: true,
      message: isTimedOut
        ? "Exam timed out — answers saved"
        : "Exam submitted successfully",
      data: exam.settings?.showResults ? result : { status: result.status },
    });
  } catch (err) {
    logError("PUT", "/api/online-exams/[id]/attempt", err);
    return NextResponse.json(
      { error: "Failed to submit exam attempt" },
      { status: 500 },
    );
  }
}
