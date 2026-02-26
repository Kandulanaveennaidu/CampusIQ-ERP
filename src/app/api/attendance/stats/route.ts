import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/Attendance";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/permissions";
import { logError } from "@/lib/logger";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getMonthName(date: Date): string {
  return date.toLocaleString("default", { month: "short", year: "numeric" });
}

export async function GET() {
  try {
    const { error, session } = await requireAuth("attendance:read");
    if (error) return error;

    const school_id = session!.user.school_id;

    await connectDB();

    const today = new Date();

    // --- Weekly Trend (last 7 days) ---
    const weeklyDates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      weeklyDates.push(formatDate(d));
    }

    const weeklyAttendance = await Attendance.find({
      school: school_id,
      date: { $in: weeklyDates },
    }).lean();

    const weeklyTrend = weeklyDates.map((date) => {
      const dayRecords = weeklyAttendance.filter((a) => a.date === date);
      const present = dayRecords.filter((a) => a.status === "present").length;
      const absent = dayRecords.filter((a) => a.status === "absent").length;
      const late = dayRecords.filter((a) => a.status === "late").length;
      const total = dayRecords.length;
      return {
        date: new Date(date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        present,
        absent,
        late,
        total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    // --- Today's Distribution (for pie chart) ---
    const todayStr = formatDate(today);
    const todayRecords = weeklyAttendance.filter((a) => a.date === todayStr);
    const todayDistribution = {
      present: todayRecords.filter((a) => a.status === "present").length,
      absent: todayRecords.filter((a) => a.status === "absent").length,
      late: todayRecords.filter((a) => a.status === "late").length,
      leave: todayRecords.filter((a) => a.status === "leave").length,
    };

    // --- Class-wise Attendance (today) ---
    const activeStudents = await Student.find({
      school: school_id,
      status: "active",
    })
      .select("class_name")
      .lean();

    const classNames = [
      ...new Set(activeStudents.map((s) => s.class_name)),
    ].sort();

    const classWise = classNames.map((className) => {
      const classRecords = todayRecords.filter(
        (a) => a.class_name === className,
      );
      const totalStudents = activeStudents.filter(
        (s) => s.class_name === className,
      ).length;
      const present = classRecords.filter((a) => a.status === "present").length;
      const absent = classRecords.filter((a) => a.status === "absent").length;
      const late = classRecords.filter((a) => a.status === "late").length;
      const total = classRecords.length;
      return {
        className,
        present,
        absent,
        late,
        total,
        totalStudents,
        percentage:
          totalStudents > 0
            ? Math.round(((present + late) / totalStudents) * 100)
            : 0,
      };
    });

    // --- Monthly Overview (last 6 months) ---
    const monthlyBounds: { month: string; start: string; end: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const start = formatDate(d);
      const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const end = formatDate(endDate);
      monthlyBounds.push({ month: getMonthName(d), start, end });
    }

    const sixMonthsAgo = monthlyBounds[0].start;
    const monthlyAttendance = await Attendance.find({
      school: school_id,
      date: { $gte: sixMonthsAgo, $lte: formatDate(today) },
    }).lean();

    const monthlyOverview = monthlyBounds.map(({ month, start, end }) => {
      const records = monthlyAttendance.filter(
        (a) => a.date >= start && a.date <= end,
      );
      return {
        month,
        present: records.filter((a) => a.status === "present").length,
        absent: records.filter((a) => a.status === "absent").length,
        late: records.filter((a) => a.status === "late").length,
        total: records.length,
      };
    });

    return NextResponse.json({
      success: true,
      weeklyTrend,
      todayDistribution,
      classWise,
      monthlyOverview,
    });
  } catch (err) {
    logError("GET", "/api/attendance/stats", err);
    return NextResponse.json(
      { error: "Failed to fetch attendance stats" },
      { status: 500 },
    );
  }
}
