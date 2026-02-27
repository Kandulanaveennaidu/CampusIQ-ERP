"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Save,
  Loader2,
  Search,
  CheckCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { AttendanceStats } from "@/components/attendance/attendance-stats";
import type { AttendanceStatus } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { useClasses } from "@/hooks/use-classes";

interface StudentWithAttendance {
  student_id: string;
  roll_number: string;
  name: string;
  class_name: string;
  status: AttendanceStatus | null;
  notes: string;
}

export default function MarkAttendancePage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: session } = useSession();

  const { canAdd } = usePermissions("attendance");
  const { classes, classLabel } = useClasses();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [search, setSearch] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});

  // Fetch students when class changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!className) {
        setStudents([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          class_name: className,
          date: date,
        });
        const response = await fetch(`/api/attendance/today?${params}`);
        if (response.ok) {
          const result = await response.json();
          setStudents(result.data || []);

          // Build attendance map from existing data
          const map: Record<
            string,
            { status: AttendanceStatus; notes: string }
          > = {};
          result.data?.forEach((student: StudentWithAttendance) => {
            if (student.status) {
              map[student.student_id] = {
                status: student.status as AttendanceStatus,
                notes: student.notes || "",
              };
            }
          });
          setAttendanceMap(map);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        showError("Error", "Failed to fetch students");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [className, date]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        notes: prev[studentId]?.notes || "",
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newMap: Record<string, { status: AttendanceStatus; notes: string }> =
      {};
    students.forEach((student) => {
      newMap[student.student_id] = {
        status,
        notes: attendanceMap[student.student_id]?.notes || "",
      };
    });
    setAttendanceMap(newMap);
  };

  const handleSave = async () => {
    if (!className) {
      showError("Error", "Please select a class first");
      return;
    }

    const records = Object.entries(attendanceMap).map(([student_id, data]) => ({
      student_id,
      status: data.status,
      notes: data.notes,
    }));

    if (records.length === 0) {
      showError("Error", "No attendance marked");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          class_name: className,
          records,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(
          "Success",
          `Attendance saved! Present: ${result.stats.present}, Absent: ${result.stats.absent}`,
        );
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      showError("Error", "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const stats = {
    total: students.length,
    present: Object.values(attendanceMap).filter((a) => a.status === "present")
      .length,
    absent: Object.values(attendanceMap).filter((a) => a.status === "absent")
      .length,
    late: Object.values(attendanceMap).filter((a) => a.status === "late")
      .length,
    leave: Object.values(attendanceMap).filter((a) => a.status === "leave")
      .length,
  };

  // Filter students by search
  const filteredStudents = students.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.roll_number || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Mark Attendance
          </h1>
          <p className="text-muted-foreground">
            Record daily attendance for your class
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Class Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{classLabel}</label>
              <Select value={className} onValueChange={setClassName}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Select ${classLabel.toLowerCase()}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Quick Actions */}
            {canAdd && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Actions</label>
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleMarkAll("present")}
                    disabled={!className}
                  >
                    <CheckCheck className="mr-1 h-4 w-4" />
                    All Present
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleMarkAll("absent")}
                    disabled={!className}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    All Absent
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <AttendanceStats stats={stats} />

      {/* Attendance Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                {className
                  ? `${className} - ${students.length} students`
                  : "Select a class to view students"}
              </CardDescription>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !className || !canAdd}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Attendance
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : !className ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Please select a class to view students
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              No students found
            </div>
          ) : (
            <AttendanceGrid
              students={filteredStudents}
              attendanceMap={attendanceMap}
              onStatusChange={handleStatusChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
