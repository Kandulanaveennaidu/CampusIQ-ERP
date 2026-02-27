"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface Workload {
  _id: string;
  teacher: { _id: string; name: string };
  teacherName: string;
  department?: { _id: string; name: string };
  academicYear: string;
  subjects: Array<{
    subjectName: string;
    subjectCode: string;
    className: string;
    type: string;
    hoursPerWeek: number;
    credits: number;
  }>;
  totalHoursPerWeek: number;
  maxHoursPerWeek: number;
  status: string;
}

interface Summary {
  total_faculty: number;
  under_loaded: number;
  optimal: number;
  over_loaded: number;
  avg_hours: number;
}

export default function FacultyWorkloadPage() {
  const { canAdd } = usePermissions("workload");
  const [loading, setLoading] = useState(true);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_faculty: 0,
    under_loaded: 0,
    optimal: 0,
    over_loaded: 0,
    avg_hours: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [teachers, setTeachers] = useState<
    Array<{ teacher_id: string; name: string }>
  >([]);
  const [subjects, setSubjects] = useState<
    Array<{ _id: string; name: string; code: string }>
  >([]);
  const [form, setForm] = useState({
    teacher_id: "",
    academic_year: "2024-25",
    max_hours_per_week: 30,
    department_id: "",
    subjects: [
      { subject_id: "", class_name: "", type: "theory", hours_per_week: 4 },
    ],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/faculty-workload");
      if (res.ok) {
        const d = await res.json();
        setWorkloads(d.data || []);
        setSummary(
          d.summary || {
            total_faculty: 0,
            under_loaded: 0,
            optimal: 0,
            over_loaded: 0,
            avg_hours: 0,
          },
        );
      }
    } catch {
      showError("Error", "Failed to fetch workloads");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) {
        const d = await res.json();
        setTeachers(d.data || []);
      }
    } catch {
      /* silent */
    }
  }, []);

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

  useEffect(() => {
    fetchData();
    fetchTeachers();
    fetchSubjects();
  }, [fetchData, fetchTeachers, fetchSubjects]);

  const save = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/faculty-workload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showSuccess("Success", "Workload saved");
        setShowDialog(false);
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error");
    } finally {
      setSubmitting(false);
    }
  };

  const addSubjectEntry = () => {
    setForm({
      ...form,
      subjects: [
        ...form.subjects,
        { subject_id: "", class_name: "", type: "theory", hours_per_week: 4 },
      ],
    });
  };

  const statusColor = (status: string) => {
    if (status === "optimal") return "present";
    if (status === "over-loaded") return "absent";
    return "late";
  };

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
            Faculty Workload
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage teaching workloads
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Workload
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          {
            label: "Total Faculty",
            value: summary.total_faculty,
            color: "text-blue-600",
          },
          {
            label: "Under-loaded",
            value: summary.under_loaded,
            color: "text-amber-600",
          },
          { label: "Optimal", value: summary.optimal, color: "text-green-600" },
          {
            label: "Over-loaded",
            value: summary.over_loaded,
            color: "text-red-600",
          },
          {
            label: "Avg Hours/Week",
            value: summary.avg_hours,
            color: "text-purple-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Hours/Week</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workloads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No workloads assigned
                  </TableCell>
                </TableRow>
              ) : (
                workloads.map((w) => (
                  <TableRow key={w._id}>
                    <TableCell className="font-medium">
                      {w.teacherName || w.teacher?.name}
                    </TableCell>
                    <TableCell>{w.department?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {w.subjects?.map((s, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {s.subjectName} ({s.className})
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      {w.totalHoursPerWeek}h
                    </TableCell>
                    <TableCell>{w.maxHoursPerWeek}h</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusColor(w.status) as "present" | "absent" | "late"
                        }
                      >
                        {w.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Workload</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Teacher</Label>
              <Select
                value={form.teacher_id || undefined}
                onValueChange={(v) => setForm({ ...form, teacher_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.teacher_id} value={t.teacher_id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Academic Year</Label>
                <Input
                  value={form.academic_year}
                  onChange={(e) =>
                    setForm({ ...form, academic_year: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Max Hours/Week</Label>
                <Input
                  type="number"
                  value={form.max_hours_per_week}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_hours_per_week: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Subjects</Label>
              <div className="space-y-2 mt-1">
                {form.subjects.map((s, i) => (
                  <div key={i} className="grid grid-cols-4 gap-1">
                    <Select
                      value={s.subject_id || undefined}
                      onValueChange={(v) => {
                        const subs = [...form.subjects];
                        subs[i].subject_id = v;
                        setForm({ ...form, subjects: subs });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((sub) => (
                          <SelectItem key={sub._id} value={sub._id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Class"
                      value={s.class_name}
                      onChange={(e) => {
                        const subs = [...form.subjects];
                        subs[i].class_name = e.target.value;
                        setForm({ ...form, subjects: subs });
                      }}
                    />
                    <Select
                      value={s.type}
                      onValueChange={(v) => {
                        const subs = [...form.subjects];
                        subs[i].type = v;
                        setForm({ ...form, subjects: subs });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["theory", "lab", "practical"].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Hrs"
                      value={s.hours_per_week}
                      onChange={(e) => {
                        const subs = [...form.subjects];
                        subs[i].hours_per_week = Number(e.target.value);
                        setForm({ ...form, subjects: subs });
                      }}
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addSubjectEntry}
                className="mt-2"
              >
                + Add Subject
              </Button>
            </div>

            <Button onClick={save} disabled={submitting} className="w-full">
              {submitting ? "Saving..." : "Save Workload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
