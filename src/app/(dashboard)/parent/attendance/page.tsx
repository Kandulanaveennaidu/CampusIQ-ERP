"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { showError } from "@/lib/alerts";

interface AttendanceRecord {
  attendance_id: string;
  date: string;
  status: "present" | "absent" | "late" | "leave";
  class_name: string;
  notes: string;
  marked_by: string;
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

const STATUS_CONFIG = {
  present: {
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
    dot: "bg-green-500",
    icon: CheckCircle,
    label: "Present",
  },
  absent: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
    dot: "bg-red-500",
    icon: XCircle,
    label: "Absent",
  },
  late: {
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
    dot: "bg-yellow-500",
    icon: Clock,
    label: "Late",
  },
  leave: {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    dot: "bg-gray-500",
    icon: CalendarOff,
    label: "Leave",
  },
};

export default function ParentAttendancePage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id") || "";

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (studentId) {
      fetchAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, currentMonth]);

  async function fetchAttendance() {
    try {
      setLoading(true);
      const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}`;
      const res = await fetch(
        `/api/parent/attendance?student_id=${studentId}&month=${monthStr}`,
      );
      const json = await res.json();
      if (!json.success) {
        showError("Error", json.error || "Failed to load attendance");
        return;
      }
      setRecords(json.data);
      setStats(json.stats);
    } catch {
      showError("Error", "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  function getMonthLabel() {
    const date = new Date(currentMonth.year, currentMonth.month);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  // Build calendar grid
  function buildCalendarDays() {
    const firstDay = new Date(currentMonth.year, currentMonth.month, 1);
    const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0);
    const startDay = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const attendanceByDate = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      attendanceByDate.set(r.date, r);
    });

    const days: { day: number | null; record: AttendanceRecord | null }[] = [];

    // Leading empty cells
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, record: null });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, record: attendanceByDate.get(dateStr) || null });
    }

    return days;
  }

  if (!studentId) {
    return (
      <div className="space-y-6">
        <Link href="/parent">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <Card>
          <CardContent className="py-16 text-center text-gray-500 dark:text-gray-400">
            No student selected. Please go back and select a child.
          </CardContent>
        </Card>
      </div>
    );
  }

  const calendarDays = buildCalendarDays();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parent">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Attendance
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Monthly attendance calendar view
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total Days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.present}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Present
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.absent}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.late}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Late</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {stats.leave}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Leave</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{getMonthLabel()}</CardTitle>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, index) => (
                  <div
                    key={index}
                    className={`min-h-[64px] rounded-lg border p-1 ${
                      cell.day
                        ? "border-gray-200 dark:border-gray-700"
                        : "border-transparent"
                    }`}
                  >
                    {cell.day && (
                      <>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {cell.day}
                        </span>
                        {cell.record && (
                          <div className="mt-1">
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[cell.record.status].color}`}
                            >
                              {STATUS_CONFIG[cell.record.status].label}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t dark:border-gray-700">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${cfg.dot}`}
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      {cfg.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
