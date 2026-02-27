import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Student from "@/lib/models/Student";
import Attendance from "@/lib/models/Attendance";
import User from "@/lib/models/User";
import { FeeStructure, FeePayment } from "@/lib/models/Fee";
import { Exam } from "@/lib/models/Exam";
import Event from "@/lib/models/Event";
import Holiday from "@/lib/models/Holiday";
import LeaveRequest from "@/lib/models/LeaveRequest";
import Department from "@/lib/models/Department";
import Subject from "@/lib/models/Subject";
import Assignment from "@/lib/models/Assignment";
import { logError } from "@/lib/logger";

// ── Gemini AI Client ─────────────────────────────────────────────────────────

// Models to try in order — if one is quota-exhausted, fall back to the next
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Try sending a chat message with model fallback.
 * If one model hits quota limits (429), automatically try the next model.
 */
async function sendWithFallback(
  genAI: GoogleGenerativeAI,
  chatHistory: { role: string; parts: { text: string }[] }[],
  message: string,
): Promise<string> {
  let lastError: Error | null = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message || "";

      // Only retry on quota/rate-limit errors (429)
      if (
        msg.includes("429") ||
        msg.includes("quota") ||
        msg.includes("Too Many Requests")
      ) {
        console.warn(`[AI] Model ${modelName} quota exceeded, trying next...`);
        continue;
      }

      // For non-quota errors, throw immediately
      throw lastError;
    }
  }

  // All models exhausted
  throw new Error(
    "QUOTA_EXHAUSTED: All AI models have exceeded their quota. Please try again later or upgrade your API key at https://aistudio.google.com",
  );
}

// ── Data Fetchers — live school context for the chatbot ──────────────────────

async function fetchSchoolContext(schoolId: string, userRole: string) {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [
    studentCount,
    activeStudents,
    teacherCount,
    todayAttendance,
    recentAttendance,
    feeStructures,
    recentPayments,
    upcomingExams,
    upcomingEvents,
    holidays,
    pendingLeaves,
    departments,
    subjects,
    pendingAssignments,
  ] = await Promise.all([
    Student.countDocuments({ school: schoolId }),
    Student.countDocuments({ school: schoolId, status: "active" }),
    User.countDocuments({ school: schoolId, role: "teacher", isActive: true }),
    Attendance.find({ school: schoolId, date: today }).lean(),
    Attendance.find({
      school: schoolId,
      date: { $gte: thirtyDaysAgoStr },
    })
      .lean()
      .limit(500),
    FeeStructure.find({ school: schoolId, status: "active" }).lean(),
    FeePayment.find({ school: schoolId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Exam.find({
      school: schoolId,
      date: { $gte: new Date() },
      status: "scheduled",
    })
      .sort({ date: 1 })
      .limit(10)
      .lean(),
    Event.find({
      school: schoolId,
      date: { $gte: new Date() },
    })
      .sort({ date: 1 })
      .limit(10)
      .lean(),
    Holiday.find({ school: schoolId }).lean(),
    LeaveRequest.find({ school: schoolId, status: "pending" }).lean(),
    Department.find({ school: schoolId }).lean(),
    Subject.find({ school: schoolId }).lean(),
    Assignment.find({
      school: schoolId,
      dueDate: { $gte: new Date() },
    })
      .sort({ dueDate: 1 })
      .limit(10)
      .lean(),
  ]);

  // Attendance analytics
  const todayPresent = todayAttendance.filter(
    (a) => a.status === "present",
  ).length;
  const todayAbsent = todayAttendance.filter(
    (a) => a.status === "absent",
  ).length;
  const todayLate = todayAttendance.filter((a) => a.status === "late").length;

  // 30-day attendance rate
  const totalRecords30d = recentAttendance.length;
  const presentRecords30d = recentAttendance.filter(
    (a) => a.status === "present",
  ).length;
  const attendanceRate30d =
    totalRecords30d > 0
      ? ((presentRecords30d / totalRecords30d) * 100).toFixed(1)
      : "N/A";

  // Fee collection summary
  const totalFeeAmount = feeStructures.reduce(
    (sum: number, f) => sum + (f.amount || 0),
    0,
  );
  const totalCollected = recentPayments.reduce(
    (sum: number, p) =>
      sum + ((p as unknown as { amount: number }).amount || 0),
    0,
  );

  // Class-wise student distribution
  const classDist: Record<string, number> = {};
  const allStudents = await Student.find({
    school: schoolId,
    status: "active",
  })
    .select("class_name")
    .lean();

  for (const s of allStudents) {
    const cn = s.class_name;
    classDist[cn] = (classDist[cn] || 0) + 1;
  }

  return {
    overview: {
      totalStudents: studentCount,
      activeStudents,
      totalTeachers: teacherCount,
      totalDepartments: departments.length,
      totalSubjects: subjects.length,
    },
    attendance: {
      today: {
        date: today,
        present: todayPresent,
        absent: todayAbsent,
        late: todayLate,
        total: todayAttendance.length,
      },
      thirtyDayRate: `${attendanceRate30d}%`,
    },
    fees: {
      activeFeeStructures: feeStructures.length,
      totalFeeAmount,
      recentCollections: totalCollected,
      recentPaymentCount: recentPayments.length,
    },
    exams: upcomingExams.map((e) => ({
      name: e.name,
      subject: e.subject,
      class: e.className,
      date: e.date,
      type: e.type,
    })),
    events: upcomingEvents.map((e) => ({
      title: (e as unknown as { title: string }).title,
      date: (e as unknown as { date: Date }).date,
      type: (e as unknown as { type: string }).type,
    })),
    holidays: holidays.map((h) => ({
      name: h.name,
      date: h.date,
    })),
    pendingLeaves: pendingLeaves.length,
    pendingAssignments: pendingAssignments.map((a) => ({
      title: a.title,
      subject: (a as unknown as { subject: string }).subject,
      class: (a as unknown as { className: string }).className,
      dueDate: a.dueDate,
    })),
    classDistribution: classDist,
    userRole,
  };
}

// ── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  context: Awaited<ReturnType<typeof fetchSchoolContext>>,
  schoolName: string,
  userName: string,
) {
  return `You are the AI Assistant for CampusIQ — an advanced, real-time Institution Management System. You serve as an intelligent companion for school administrators, teachers, students, and parents.

## Your Identity
- Name: CampusIQ AI Assistant
- Role: Intelligent school management companion
- Tone: Professional, warm, concise, and helpful
- Language: Respond in the same language the user writes in

## Current User
- Name: ${userName}
- Role: ${context.userRole}
- School: ${schoolName}

## Live School Data (Real-Time)
${JSON.stringify(context, null, 2)}

## Your Capabilities
1. **Data Analysis**: Analyze attendance trends, fee collection rates, exam performance, and provide actionable insights
2. **Smart Recommendations**: Suggest interventions for at-risk students, optimize timetables, recommend resource allocation
3. **Quick Answers**: Instantly answer questions about school data — student counts, attendance %, upcoming events, pending tasks
4. **Workflow Guidance**: Guide users through platform features — how to mark attendance, add students, generate reports
5. **Predictive Insights**: Identify patterns — students at dropout risk, fee defaulters, attendance anomalies
6. **Report Generation**: Help users understand what reports to generate and interpret results
7. **Administrative Help**: Answer questions about school policies, academic calendar, holidays, exam schedules

## Response Rules
1. Always use the LIVE DATA provided above — never make up numbers
2. Format responses with markdown — use tables, lists, bold text for readability
3. When showing numbers, always provide context (e.g., "85% attendance rate — above the 80% benchmark")
4. If asked about data you don't have, suggest which module the user should check
5. Be proactive — if attendance is low, mention it. If exams are near, remind about preparation
6. For teachers: focus on their classes, student performance, assignments
7. For parents: focus on their child's attendance, grades, and fees
8. For admins: provide high-level overview with actionable metrics
9. Keep responses concise — max 300 words unless the user asks for detailed analysis
10. Use emojis sparingly for clarity (📊 for data, ⚠️ for warnings, ✅ for positive metrics)

## Module Navigation Help
When users ask how to do something, guide them to the correct module:
- Students → /students (add, edit, import students)
- Attendance → /attendance/mark (mark attendance), /attendance/history (view history)
- Fees → /fees (manage fee structures and payments)
- Exams → /exams (create and manage exams)
- Reports → /reports (generate attendance and performance reports)
- Timetable → /timetable (view/manage class schedules)
- Events → /events (school events and calendar)
- Settings → /settings (school configuration)
- Analytics → /analytics (detailed charts and analytics)
- AI Insights → /ai-insights (attendance risk analysis)

## Edge Cases
- If data is empty (new school, just reset), acknowledge it warmly and suggest first steps
- If user asks about features their plan doesn't include, mention it diplomatically
- Never reveal internal system details, API routes, or database structure
- Never generate harmful, discriminatory, or inappropriate content`;
}

// ── API Route ────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/chat
 * Body: { message: string, history?: { role: "user" | "assistant", content: string }[] }
 * Returns: { success: true, data: { reply: string } }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuth("students:read");
    if (error) return error;

    const body = await request.json();
    const { message, history = [] } = body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Message too long (max 2000 characters)" },
        { status: 400 },
      );
    }

    await connectDB();

    // Fetch real-time school context
    const context = await fetchSchoolContext(
      session!.user.school_id,
      session!.user.role,
    );

    const systemPrompt = buildSystemPrompt(
      context,
      session!.user.school_name,
      session!.user.name,
    );

    const genAI = getGeminiClient();

    // Build conversation history for Gemini
    const chatHistory = [
      {
        role: "user" as const,
        parts: [{ text: "System instructions: " + systemPrompt }],
      },
      {
        role: "model" as const,
        parts: [
          {
            text: "Understood. I am the CampusIQ AI Assistant. I have access to your school's live data and I'm ready to help. How can I assist you today?",
          },
        ],
      },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: (h.role === "user" ? "user" : "model") as "user" | "model",
        parts: [{ text: h.content }],
      })),
    ];

    const reply = await sendWithFallback(genAI, chatHistory, message);

    return NextResponse.json({
      success: true,
      data: { reply },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    logError("POST", "/api/ai/chat", err);

    // Log full error in dev for debugging
    if (process.env.NODE_ENV !== "production") {
      console.error("[AI Chat Error]", errMsg);
    }

    if (errMsg.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI Assistant is not configured. Please add GEMINI_API_KEY to your environment variables.",
        },
        { status: 503 },
      );
    }

    // Quota exhausted — all models hit rate limits
    if (
      errMsg.includes("QUOTA_EXHAUSTED") ||
      errMsg.includes("429") ||
      errMsg.includes("quota") ||
      errMsg.includes("Too Many Requests")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI quota exceeded. The free tier limit has been reached. Please wait a few minutes and try again, or generate a new API key at https://aistudio.google.com/apikey",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV !== "production"
            ? `AI Error: ${errMsg}`
            : "AI Assistant encountered an error. Please try again.",
      },
      { status: 500 },
    );
  }
}
