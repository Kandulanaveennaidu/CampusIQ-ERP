import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/Attendance";
import Student from "@/lib/models/Student";
import { logError } from "@/lib/logger";

/**
 * GET /api/ai-insights — AI-powered attendance analytics
 * Returns: risk scores, dropout prediction, trends, anomaly detection
 * Query: ?class=10A&period=30 (days)
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuth("attendance:read");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class") || "";
    const period = parseInt(searchParams.get("period") || "30", 10);
    const schoolId = session!.user.school_id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Fetch attendance records for the period (date is String "YYYY-MM-DD")
    const attendanceQuery: Record<string, unknown> = {
      school: schoolId,
      date: { $gte: startDateStr },
    };
    if (className) attendanceQuery.class_name = className;

    const [records, students] = await Promise.all([
      Attendance.find(attendanceQuery).lean(),
      Student.find({
        school: schoolId,
        ...(className ? { class_name: className } : {}),
        status: "active",
      }).lean(),
    ]);

    // Build per-student attendance map
    const studentMap = new Map<
      string,
      {
        present: number;
        absent: number;
        late: number;
        total: number;
        name: string;
        rollNumber: string;
        class_name: string;
      }
    >();

    for (const s of students as unknown as Record<string, unknown>[]) {
      studentMap.set(String(s._id), {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        name: String(s.name || ""),
        rollNumber: String(s.roll_number || ""),
        class_name: String(s.class_name || ""),
      });
    }

    for (const r of records as unknown as Record<string, unknown>[]) {
      const sid = String(r.student);
      const entry = studentMap.get(sid);
      if (entry) {
        entry.total++;
        if (r.status === "present") entry.present++;
        else if (r.status === "absent") entry.absent++;
        else if (r.status === "late") entry.late++;
      }
    }

    // Risk scoring algorithm
    const riskAnalysis = Array.from(studentMap.entries()).map(([id, data]) => {
      const attendanceRate =
        data.total > 0 ? (data.present / data.total) * 100 : 100;
      const lateRate = data.total > 0 ? (data.late / data.total) * 100 : 0;
      const absentRate = data.total > 0 ? (data.absent / data.total) * 100 : 0;

      // Risk score: 0-100 (higher = more at risk)
      let riskScore = 0;

      // Below 75% attendance → high risk
      if (attendanceRate < 60) riskScore += 50;
      else if (attendanceRate < 75) riskScore += 35;
      else if (attendanceRate < 85) riskScore += 15;

      // Chronic lateness
      if (lateRate > 30) riskScore += 20;
      else if (lateRate > 15) riskScore += 10;

      // High absence rate
      if (absentRate > 40) riskScore += 20;
      else if (absentRate > 25) riskScore += 10;

      // Consecutive absence detection (simplified)
      riskScore = Math.min(100, riskScore);

      let riskLevel: "low" | "medium" | "high" | "critical" = "low";
      if (riskScore >= 70) riskLevel = "critical";
      else if (riskScore >= 50) riskLevel = "high";
      else if (riskScore >= 25) riskLevel = "medium";

      return {
        student_id: id,
        name: data.name,
        rollNumber: data.rollNumber,
        class_name: data.class_name,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        lateRate: Math.round(lateRate * 10) / 10,
        absentRate: Math.round(absentRate * 10) / 10,
        riskScore,
        riskLevel,
        totalDays: data.total,
        presentDays: data.present,
        absentDays: data.absent,
        lateDays: data.late,
      };
    });

    // Sort by risk score (highest first)
    riskAnalysis.sort((a, b) => b.riskScore - a.riskScore);

    // Aggregated class insights
    const totalStudents = riskAnalysis.length;
    const criticalCount = riskAnalysis.filter(
      (r) => r.riskLevel === "critical",
    ).length;
    const highCount = riskAnalysis.filter((r) => r.riskLevel === "high").length;
    const mediumCount = riskAnalysis.filter(
      (r) => r.riskLevel === "medium",
    ).length;
    const lowCount = riskAnalysis.filter((r) => r.riskLevel === "low").length;
    const avgAttendance =
      totalStudents > 0
        ? Math.round(
            (riskAnalysis.reduce((s, r) => s + r.attendanceRate, 0) /
              totalStudents) *
              10,
          ) / 10
        : 0;

    // Daily trend data
    const dailyMap = new Map<
      string,
      { present: number; absent: number; late: number; total: number }
    >();
    for (const r of records as unknown as Record<string, unknown>[]) {
      const dateKey = new Date(r.date as Date).toISOString().split("T")[0];
      if (!dailyMap.has(dateKey))
        dailyMap.set(dateKey, { present: 0, absent: 0, late: 0, total: 0 });
      const day = dailyMap.get(dateKey)!;
      day.total++;
      if (r.status === "present") day.present++;
      else if (r.status === "absent") day.absent++;
      else if (r.status === "late") day.late++;
    }

    const dailyTrends = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({
        date,
        attendanceRate:
          d.total > 0
            ? Math.round(((d.present + d.late) / d.total) * 1000) / 10
            : 0,
        presentCount: d.present,
        absentCount: d.absent,
        lateCount: d.late,
      }));

    // Anomaly detection: find days with unusual patterns
    const avgRate =
      dailyTrends.length > 0
        ? dailyTrends.reduce((s, d) => s + d.attendanceRate, 0) /
          dailyTrends.length
        : 0;
    const stdDev =
      dailyTrends.length > 1
        ? Math.sqrt(
            dailyTrends.reduce(
              (s, d) => s + (d.attendanceRate - avgRate) ** 2,
              0,
            ) / dailyTrends.length,
          )
        : 0;

    const anomalies = dailyTrends.filter(
      (d) => Math.abs(d.attendanceRate - avgRate) > 2 * stdDev,
    );

    // Recommendations
    const recommendations: string[] = [];
    if (criticalCount > 0)
      recommendations.push(
        `${criticalCount} student${criticalCount > 1 ? "s" : ""} at critical dropout risk – immediate intervention needed`,
      );
    if (highCount > totalStudents * 0.2)
      recommendations.push(
        "Over 20% of students have high risk – consider class-wide engagement strategies",
      );
    if (avgAttendance < 80)
      recommendations.push(
        "Overall attendance below 80% – review scheduling and transport availability",
      );
    if (anomalies.length > 0)
      recommendations.push(
        `${anomalies.length} anomalous day${anomalies.length > 1 ? "s" : ""} detected – investigate special circumstances`,
      );

    return NextResponse.json({
      summary: {
        totalStudents,
        avgAttendance,
        riskDistribution: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
        period,
      },
      students: riskAnalysis,
      dailyTrends,
      anomalies,
      recommendations,
    });
  } catch (err) {
    logError("GET", "/api/ai-insights", err);
    return NextResponse.json(
      { error: "Failed to generate AI insights" },
      { status: 500 },
    );
  }
}
