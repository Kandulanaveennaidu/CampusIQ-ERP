"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
} from "lucide-react";

interface LeaveEntry {
  date: string;
  leaves: { name: string; type: string; status: string; userId: string }[];
}

interface LeaveData {
  _id: string;
  user: { _id: string; name: string; role: string; department?: string };
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: string;
}

interface SummaryData {
  totalLeaves: number;
  approved: number;
  pending: number;
  rejected: number;
  staffOnLeave: number;
  totalStaff: number;
  availableStaff: number;
  leaveTypes: Record<string, number>;
}

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
const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-200 text-green-800",
  pending: "bg-yellow-200 text-yellow-800",
  rejected: "bg-red-200 text-red-800",
};
const LEAVE_TYPE_COLORS: Record<string, string> = {
  sick: "#ef4444",
  casual: "#3b82f6",
  earned: "#8b5cf6",
  maternity: "#ec4899",
  paternity: "#06b6d4",
  unpaid: "#6b7280",
};

export default function StaffLeaveCalendarPage() {
  const { data: session } = useSession();
  const { canView: _canView } = usePermissions("leaves");
  const [calendarData, setCalendarData] = useState<LeaveEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [allStaff, setAllStaff] = useState<
    { _id: string; name: string; department: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [departmentFilter, setDepartmentFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const month = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const params = new URLSearchParams({ month });
      if (departmentFilter) params.set("department", departmentFilter);
      const res = await fetch(`/api/staff-leave-calendar?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarData(data.calendarData || []);
        setLeaves(data.leaves || []);
        setSummary(data.summary || null);
        setAllStaff(data.allStaff || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, departmentFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getDaysInMonth = (m: number, y: number) =>
    new Date(y, m + 1, 0).getDate();
  const getFirstDay = (m: number, y: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDay(currentMonth, currentYear);

  const getEntriesForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarData.find((d) => d.date === dateStr)?.leaves || [];
  };

  const departments = [
    ...new Set(allStaff.map((s) => s.department).filter(Boolean)),
  ];

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-7 w-7 text-indigo-600" /> Staff Leave
            Calendar
          </h1>
          <p className="text-gray-500 mt-1">
            Visual calendar view of staff leaves & substitute planning
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-500">Total Staff</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalStaff}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">Available</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {summary.availableStaff}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              <span className="text-sm text-gray-500">On Leave</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {summary.staffOnLeave}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-500">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">
              {summary.pending}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-500">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {summary.approved}
            </p>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else setCurrentMonth(currentMonth - 1);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-gray-500 py-2"
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
              const isWeekend =
                new Date(currentYear, currentMonth, day).getDay() === 0 ||
                new Date(currentYear, currentMonth, day).getDay() === 6;

              return (
                <div
                  key={day}
                  className={`min-h-[90px] p-1.5 rounded-lg border text-xs transition-colors ${isToday ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : isWeekend ? "bg-gray-50 dark:bg-gray-850 border-gray-200" : "border-gray-100 dark:border-gray-700"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-medium ${isToday ? "text-indigo-600" : isWeekend ? "text-gray-400" : ""}`}
                    >
                      {day}
                    </span>
                    {entries.length > 0 && (
                      <span className="bg-red-100 text-red-600 text-[10px] px-1 rounded-full">
                        {entries.length}
                      </span>
                    )}
                  </div>
                  {entries.slice(0, 3).map((e, j) => (
                    <div
                      key={j}
                      className={`mb-0.5 px-1 py-0.5 rounded text-[10px] truncate ${STATUS_COLORS[e.status] || "bg-gray-100"}`}
                      title={`${e.name} - ${e.type} (${e.status})`}
                    >
                      {e.name}
                    </div>
                  ))}
                  {entries.length > 3 && (
                    <div className="text-[10px] text-gray-400">
                      +{entries.length - 3} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leave List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">
            Leave Requests This Month ({leaves.length})
          </h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {leaves.map((l) => (
            <div
              key={l._id}
              className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-750"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: LEAVE_TYPE_COLORS[l.leaveType] || "#6b7280",
                }}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {l.user?.name || "Unknown"}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(l.startDate).toLocaleDateString("en-IN")} —{" "}
                  {new Date(l.endDate || l.startDate).toLocaleDateString(
                    "en-IN",
                  )}
                </div>
                {l.reason && (
                  <div className="text-xs text-gray-400 mt-0.5">{l.reason}</div>
                )}
              </div>
              <span
                className="text-xs capitalize px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: LEAVE_TYPE_COLORS[l.leaveType] || "#6b7280",
                  color: "white",
                  opacity: 0.8,
                }}
              >
                {l.leaveType}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] || "bg-gray-100"}`}
              >
                {l.status}
              </span>
            </div>
          ))}
          {leaves.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No leave requests for this month.
            </div>
          )}
        </div>
      </div>

      {/* Leave Type Legend */}
      {summary && Object.keys(summary.leaveTypes).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <h4 className="font-medium text-sm mb-2">Leave Type Distribution</h4>
          <div className="flex flex-wrap gap-4">
            {Object.entries(summary.leaveTypes).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: LEAVE_TYPE_COLORS[type] || "#6b7280",
                  }}
                />
                <span className="text-sm capitalize">
                  {type}: <strong>{count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
