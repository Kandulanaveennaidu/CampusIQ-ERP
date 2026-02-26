"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Calendar,
  Plus,
  Eye,
  EyeOff,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

interface CalendarEntry {
  date: string;
  endDate?: string;
  title: string;
  type: string;
  description?: string;
  forClasses?: string[];
  color?: string;
}

interface AcademicCalendarData {
  _id: string;
  academicYear: string;
  title: string;
  entries: CalendarEntry[];
  isPublished: boolean;
  createdBy?: { name: string };
}

const TYPE_COLORS: Record<string, string> = {
  holiday: "#ef4444",
  exam: "#f59e0b",
  event: "#3b82f6",
  ptm: "#8b5cf6",
  vacation: "#10b981",
  working_saturday: "#6b7280",
  result_day: "#f97316",
  orientation: "#06b6d4",
  sports_day: "#ec4899",
  other: "#9ca3af",
};

const TYPE_LABELS: Record<string, string> = {
  holiday: "Holiday",
  exam: "Exam",
  event: "Event",
  ptm: "PTM",
  vacation: "Vacation",
  working_saturday: "Working Saturday",
  result_day: "Result Day",
  orientation: "Orientation",
  sports_day: "Sports Day",
  other: "Other",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AcademicCalendarPage() {
  const { data: session } = useSession();
  const { canView: _canView } = usePermissions("academic_calendar");
  const [calendars, setCalendars] = useState<AcademicCalendarData[]>([]);
  const [activeCalendar, setActiveCalendar] =
    useState<AcademicCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showGenerator, setShowGenerator] = useState(false);
  const [genForm, setGenForm] = useState({
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    title: "Academic Calendar",
  });

  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/academic-calendar");
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.data || []);
        if (data.data?.length > 0) setActiveCalendar(data.data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const generateCalendar = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/academic-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...genForm, autoPopulate: true }),
      });
      if (res.ok) {
        setShowGenerator(false);
        fetchCalendars();
        Swal.fire({
          icon: "success",
          title: "Calendar Generated!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const togglePublish = async () => {
    if (!activeCalendar) return;
    try {
      await fetch("/api/academic-calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: activeCalendar._id,
          isPublished: !activeCalendar.isPublished,
        }),
      });
      fetchCalendars();
    } catch (e) {
      console.error(e);
    }
  };

  // Build calendar grid for current month
  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) =>
    new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const getEntriesForDate = (day: number) => {
    if (!activeCalendar) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return activeCalendar.entries.filter((e) => {
      const entryDate = e.date.split("T")[0];
      const endDate = e.endDate?.split("T")[0];
      if (entryDate === dateStr) return true;
      if (endDate && entryDate <= dateStr && endDate >= dateStr) return true;
      return false;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7 text-indigo-600" /> Academic Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Auto-generate yearly calendar with holidays, exams & events
          </p>
        </div>
        <div className="flex gap-3">
          {activeCalendar && (
            <button
              onClick={togglePublish}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${activeCalendar.isPublished ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
            >
              {activeCalendar.isPublished ? (
                <>
                  <EyeOff className="h-4 w-4" /> Unpublish
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" /> Publish
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Generate Calendar
          </button>
        </div>
      </div>

      {/* Generator */}
      {showGenerator && (
        <div className="bg-card rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold mb-4">
            Auto-Generate Academic Calendar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Academic Year (e.g. 2024-2025)"
              value={genForm.academicYear}
              onChange={(e) =>
                setGenForm({ ...genForm, academicYear: e.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm dark:bg-card"
            />
            <input
              type="text"
              placeholder="Calendar Title"
              value={genForm.title}
              onChange={(e) =>
                setGenForm({ ...genForm, title: e.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm dark:bg-card"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This will auto-populate holidays, exams, events, PTMs, vacations
            from your existing data.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={generateCalendar}
              disabled={generating}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{" "}
              Generate
            </button>
            <button
              onClick={() => setShowGenerator(false)}
              className="border px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Calendar selector */}
      {calendars.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {calendars.map((c) => (
            <button
              key={c._id}
              onClick={() => setActiveCalendar(c)}
              className={`px-3 py-1.5 rounded-lg text-sm ${activeCalendar?._id === c._id ? "bg-indigo-600 text-white" : "bg-muted"}`}
            >
              {c.academicYear}
            </button>
          ))}
        </div>
      )}

      {activeCalendar ? (
        <>
          {/* Month Navigation */}
          <div className="bg-card rounded-xl shadow-sm border">
            <div className="flex items-center justify-between p-4 border-b">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else setCurrentMonth(currentMonth - 1);
                }}
                className="p-1 hover:bg-muted dark:hover:bg-gray-700 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="font-semibold text-lg">
                {MONTHS[currentMonth]} {currentYear}
              </h3>
              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else setCurrentMonth(currentMonth + 1);
                }}
                className="p-1 hover:bg-muted dark:hover:bg-gray-700 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const entries = getEntriesForDate(day);
                  const isToday =
                    day === new Date().getDate() &&
                    currentMonth === new Date().getMonth() &&
                    currentYear === new Date().getFullYear();
                  return (
                    <div
                      key={day}
                      className={`min-h-[80px] p-1 rounded-lg border text-xs ${isToday ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-gray-100 dark:border-border"}`}
                    >
                      <div
                        className={`font-medium mb-1 ${isToday ? "text-indigo-600" : ""}`}
                      >
                        {day}
                      </div>
                      {entries.slice(0, 3).map((e, j) => (
                        <div
                          key={j}
                          className="mb-0.5 px-1 py-0.5 rounded text-[10px] truncate text-white"
                          style={{
                            backgroundColor:
                              e.color || TYPE_COLORS[e.type] || "#9ca3af",
                          }}
                          title={`${e.title} (${TYPE_LABELS[e.type] || e.type})`}
                        >
                          {e.title}
                        </div>
                      ))}
                      {entries.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{entries.length - 3} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-card rounded-xl p-4 shadow-sm border">
            <h4 className="font-medium mb-2 text-sm">Legend</h4>
            <div className="flex flex-wrap gap-3">
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: TYPE_COLORS[type] }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Entries List */}
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">
                All Calendar Entries ({activeCalendar.entries.length})
              </h3>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {activeCalendar.entries.map((e, i) => (
                <div
                  key={i}
                  className="p-3 flex items-center gap-3 hover:bg-muted/50 dark:hover:bg-gray-750"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: e.color || TYPE_COLORS[e.type] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-IN")}{" "}
                      {e.endDate
                        ? ` — ${new Date(e.endDate).toLocaleDateString("en-IN")}`
                        : ""}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                    {TYPE_LABELS[e.type] || e.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>
            No academic calendar yet. Click &quot;Generate Calendar&quot; to
            create one.
          </p>
        </div>
      )}
    </div>
  );
}
