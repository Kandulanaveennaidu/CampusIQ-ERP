"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
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
import { useClasses } from "@/hooks/use-classes";

interface AttendanceRecord {
  _id: string;
  date: string;
  subject: { _id: string; name: string; code: string };
  student: { _id: string; name: string };
  className: string;
  period: number;
  status: string;
  markedBy: { name: string };
}

interface StudentSummary {
  studentId: string;
  studentName: string;
  totalClasses: number;
  present: number;
  absent: number;
  percentage: number;
  isEligible: boolean;
}

export default function SubjectAttendancePage() {
  const { canAdd } = usePermissions("subject_attendance");
  const { classes: availableClasses, classLabel } = useClasses();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"daily" | "summary" | "eligibility">("daily");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [subjects, setSubjects] = useState<
    Array<{ _id: string; name: string; code: string }>
  >([]);
  const [students, setStudents] = useState<
    Array<{ _id: string; name: string; class_name: string }>
  >([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [marking, setMarking] = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/subjects");
      if (res.ok) {
        const d = await res.json();
        setSubjects(d.data || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const params = selectedClass ? `?class_name=${selectedClass}` : "";
      const res = await fetch(`/api/students${params}`);
      if (res.ok) {
        const d = await res.json();
        setStudents(d.data || []);
      }
    } catch {
      /* silent */
    }
  }, [selectedClass]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ type: tab });
      if (selectedSubject) params.set("subject_id", selectedSubject);
      if (selectedClass) params.set("class_name", selectedClass);
      if (tab === "daily") params.set("date", date);

      const res = await fetch(`/api/subject-attendance?${params}`);
      if (res.ok) {
        const d = await res.json();
        if (tab === "daily") {
          setRecords(d.data || []);
        } else {
          setSummaries(d.data || []);
        }
      }
    } catch {
      showError("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [tab, selectedSubject, selectedClass, date]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAttendance = async (studentId: string, status: string) => {
    if (!selectedSubject || !selectedClass) {
      showError("Error", "Select subject and class first");
      return;
    }
    try {
      setMarking(true);
      const res = await fetch("/api/subject-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          subject_id: selectedSubject,
          class_name: selectedClass,
          period: 1,
          records: [{ student_id: studentId, status }],
        }),
      });

      if (res.ok) {
        showSuccess("Marked");
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error");
    } finally {
      setMarking(false);
    }
  };

  const ineligibleCount = summaries.filter((s) => !s.isEligible).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Subject Attendance
          </h1>
          <p className="text-slate-500">
            Track subject-wise attendance with 75% eligibility
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedSubject || undefined}
            onValueChange={setSelectedSubject}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedClass || undefined}
            onValueChange={setSelectedClass}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={classLabel} />
            </SelectTrigger>
            <SelectContent>
              {availableClasses.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tab === "daily" && (
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["daily", "summary", "eligibility"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}
          >
            {t === "eligibility" ? "Eligibility (75%)" : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Daily View */}
          {tab === "daily" && (
            <div className="space-y-4">
              {/* Quick Mark for students */}
              {selectedSubject && selectedClass && (
                <Card>
                  <CardHeader>
                    <CardTitle>Mark Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {students.map((s) => {
                        const existing = records.find(
                          (r) =>
                            r.student?._id === s._id ||
                            (r.student as unknown as string) === s._id,
                        );
                        return (
                          <div
                            key={s._id}
                            className="flex items-center justify-between rounded border p-2"
                          >
                            <span className="font-medium text-sm">
                              {s.name}
                            </span>
                            {existing ? (
                              <Badge
                                variant={
                                  existing.status === "present"
                                    ? "present"
                                    : existing.status === "absent"
                                      ? "absent"
                                      : "late"
                                }
                              >
                                {existing.status}
                              </Badge>
                            ) : (
                              <div className="flex gap-1">
                                {["present", "absent", "late"].map((st) => (
                                  <Button
                                    key={st}
                                    size="sm"
                                    variant={
                                      st === "present" ? "default" : "outline"
                                    }
                                    disabled={marking || !canAdd}
                                    onClick={() => markAttendance(s._id, st)}
                                    className="text-xs capitalize"
                                  >
                                    {st}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Records */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Marked By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-slate-500"
                          >
                            No records
                          </TableCell>
                        </TableRow>
                      ) : (
                        records.map((r) => (
                          <TableRow key={r._id}>
                            <TableCell className="font-medium">
                              {r.student?.name || "—"}
                            </TableCell>
                            <TableCell>{r.subject?.name || "—"}</TableCell>
                            <TableCell>Period {r.period}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === "present"
                                    ? "present"
                                    : r.status === "absent"
                                      ? "absent"
                                      : "late"
                                }
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{r.markedBy?.name || "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary / Eligibility View */}
          {(tab === "summary" || tab === "eligibility") && (
            <div>
              {tab === "eligibility" && ineligibleCount > 0 && (
                <Card className="border-red-200 bg-red-50 mb-4">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">
                        {ineligibleCount} student(s) below 75% attendance
                      </p>
                      <p className="text-sm text-red-600">
                        These students may not be eligible for exams.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Total Classes</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Eligibility</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaries.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-slate-500"
                          >
                            No data
                          </TableCell>
                        </TableRow>
                      ) : (
                        summaries
                          .sort((a, b) =>
                            tab === "eligibility"
                              ? a.percentage - b.percentage
                              : 0,
                          )
                          .map((s) => (
                            <TableRow
                              key={s.studentId}
                              className={!s.isEligible ? "bg-red-50" : ""}
                            >
                              <TableCell className="font-medium">
                                {s.studentName}
                              </TableCell>
                              <TableCell>{s.totalClasses}</TableCell>
                              <TableCell className="text-green-600">
                                {s.present}
                              </TableCell>
                              <TableCell className="text-red-600">
                                {s.absent}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`font-bold ${s.percentage >= 75 ? "text-green-600" : "text-red-600"}`}
                                >
                                  {s.percentage}%
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={s.isEligible ? "present" : "absent"}
                                >
                                  {s.isEligible ? "Eligible" : "Not Eligible"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
