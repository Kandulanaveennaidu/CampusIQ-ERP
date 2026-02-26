"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UserCog, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface TeacherRecord {
  _id: string;
  teacher: {
    _id: string;
    name: string;
    email: string;
    subject: string;
  };
  date: string;
  status: string;
  checkIn: string;
  checkOut: string;
  workedHours: number;
}

interface Summary {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export default function TeacherAttendancePage() {
  const { data: session } = useSession();

  const { canAdd } = usePermissions("teacher_attendance");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<TeacherRecord[]>([]);
  const [teachers, setTeachers] = useState<
    Array<{ teacher_id: string; name: string }>
  >([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
  });
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [view, setView] = useState("daily");
  const [marking, setMarking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ date, view });
      const res = await fetch(`/api/teacher-attendance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data || []);
        setSummary(
          data.summary || {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
          },
        );
      }
    } catch {
      showError("Error", "Failed to fetch attendance");
    } finally {
      setLoading(false);
    }
  }, [date, view]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTeachers();
  }, [fetchData, fetchTeachers]);

  const markAttendance = async (teacherId: string, status: string) => {
    try {
      setMarking(true);
      const res = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacherId,
          date,
          status,
          check_in:
            status !== "absent" && status !== "leave"
              ? new Date().toISOString()
              : undefined,
        }),
      });

      if (res.ok) {
        showSuccess("Success", "Attendance marked");
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  };

  const statusColors: Record<string, string> = {
    present: "present",
    absent: "absent",
    late: "late",
    leave: "leave",
    "half-day": "secondary",
  };

  const stats = [
    {
      label: "Total Teachers",
      value: summary.total,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Present",
      value: summary.present,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Absent",
      value: summary.absent,
      color: "text-red-600",
      bg: "bg-red-100",
    },
    {
      label: "Late",
      value: summary.late,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Teacher Attendance
          </h1>
          <p className="text-slate-500">Track and manage teacher attendance</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <div className={`rounded-full p-2 ${s.bg}`}>
                  <UserCog className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mark Attendance for unrecorded teachers */}
      {session?.user?.role === "admin" && view === "daily" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Quick Mark
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {teachers.map((t) => {
                const existing = records.find(
                  (r) =>
                    r.teacher?._id === t.teacher_id ||
                    (r.teacher as unknown as string) === t.teacher_id,
                );
                if (existing) return null;
                return (
                  <div
                    key={t.teacher_id}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <span className="text-sm font-medium">{t.name}</span>
                    <div className="flex gap-1">
                      {["present", "absent", "late", "leave"].map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={s === "present" ? "default" : "outline"}
                          disabled={marking || !canAdd}
                          onClick={() => markAttendance(t.teacher_id, s)}
                          className="text-xs capitalize"
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {teachers.every((t) =>
                records.find(
                  (r) =>
                    r.teacher?._id === t.teacher_id ||
                    (r.teacher as unknown as string) === t.teacher_id,
                ),
              ) && (
                <p className="text-sm text-slate-500">
                  All teachers have been marked for today.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="font-medium">
                      {typeof r.teacher === "object" ? r.teacher.name : "—"}
                    </TableCell>
                    <TableCell>
                      {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (statusColors[r.status] || "secondary") as
                            | "present"
                            | "absent"
                            | "late"
                            | "leave"
                            | "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.checkIn
                        ? new Date(r.checkIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {r.checkOut
                        ? new Date(r.checkOut).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {r.workedHours ? `${r.workedHours}h` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
