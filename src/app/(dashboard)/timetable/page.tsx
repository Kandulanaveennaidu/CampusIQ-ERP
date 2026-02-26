"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError, confirmDelete } from "@/lib/alerts";
import { Clock, Plus, Trash2, BookOpen } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useClasses } from "@/hooks/use-classes";

interface Period {
  timetable_id: string;
  class_name: string;
  day: string;
  period: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_id: string;
  teacher_name: string;
  room: string;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const PERIODS = [
  { num: "1", start: "08:00", end: "08:45" },
  { num: "2", start: "08:45", end: "09:30" },
  { num: "3", start: "09:45", end: "10:30" },
  { num: "4", start: "10:30", end: "11:15" },
  { num: "5", start: "11:30", end: "12:15" },
  { num: "6", start: "12:15", end: "13:00" },
  { num: "7", start: "14:00", end: "14:45" },
  { num: "8", start: "14:45", end: "15:30" },
];

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "bg-blue-100 text-blue-800 border-blue-200",
  English: "bg-green-100 text-green-800 border-green-200",
  Science: "bg-purple-100 text-purple-800 border-purple-200",
  Hindi: "bg-orange-100 text-orange-800 border-orange-200",
  History: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Geography: "bg-teal-100 text-teal-800 border-teal-200",
  Physics: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Chemistry: "bg-pink-100 text-pink-800 border-pink-200",
  Biology: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Computer Science": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Physical Education": "bg-red-100 text-red-800 border-red-200",
  Art: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  Music: "bg-violet-100 text-violet-800 border-violet-200",
};

export default function TimetablePage() {
  useSession();

  const { canAdd, canEdit, canDelete } = usePermissions("timetable");
  const { classes: defaultClasses, classLabel } = useClasses();
  const [timetable, setTimetable] = useState<Period[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    class_name: "",
    day: "Monday",
    period: "1",
    start_time: "08:00",
    end_time: "08:45",
    subject: "",
    teacher_name: "",
    teacher_id: "",
    room: "",
  });

  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedClass ? `?class=${selectedClass}` : "";
      const res = await fetch(`/api/timetable${params}`);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data.data || []);
        if (data.classes?.length && !selectedClass) {
          setClasses(data.classes);
          setSelectedClass(data.classes[0]);
        } else if (data.classes?.length) {
          setClasses(data.classes);
        }
      }
    } catch {
      showError("Error", "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const handleSave = async () => {
    if (!form.class_name || !form.day || !form.subject) {
      showError("Error", "Class, day, and subject required");
      return;
    }
    setSubmitting(true);
    try {
      const method = editingPeriod ? "PUT" : "POST";
      const body = editingPeriod
        ? { timetable_id: editingPeriod.timetable_id, ...form }
        : form;

      const res = await fetch("/api/timetable", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(
          "Success",
          editingPeriod ? "Period updated" : "Period added",
        );
        setDialogOpen(false);
        setEditingPeriod(null);
        resetForm();
        fetchTimetable();
      } else {
        showError("Error", data.error);
      }
    } catch {
      showError("Error", "Failed to save period");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete("period");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/timetable?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showSuccess("Success", "Period deleted");
        fetchTimetable();
      }
    } catch {
      showError("Error", "Failed to delete period");
    }
  };

  const openEdit = (p: Period) => {
    setEditingPeriod(p);
    setForm({
      class_name: p.class_name,
      day: p.day,
      period: p.period,
      start_time: p.start_time,
      end_time: p.end_time,
      subject: p.subject,
      teacher_name: p.teacher_name,
      teacher_id: p.teacher_id,
      room: p.room,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setForm({
      class_name: selectedClass || "",
      day: "Monday",
      period: "1",
      start_time: "08:00",
      end_time: "08:45",
      subject: "",
      teacher_name: "",
      teacher_id: "",
      room: "",
    });
  };

  const getPeriod = (day: string, periodNum: string) => {
    return timetable.find(
      (t) => t.day === day && String(t.period) === periodNum,
    );
  };

  const getSubjectColor = (subject: string) => {
    return (
      SUBJECT_COLORS[subject] || "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  if (loading && !timetable.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Timetable Management
          </h1>
          <p className="text-gray-500 mt-1">View & manage class schedules</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={`Select ${classLabel.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canAdd && (
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingPeriod(null);
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Period
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingPeriod ? "Edit Period" : "Add Period"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{classLabel} *</Label>
                      <Input
                        list="timetable-class-options"
                        value={form.class_name}
                        onChange={(e) =>
                          setForm({ ...form, class_name: e.target.value })
                        }
                        placeholder={`Select or type ${classLabel.toLowerCase()}`}
                      />
                      <datalist id="timetable-class-options">
                        {defaultClasses.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <Label>Day *</Label>
                      <Select
                        value={form.day}
                        onValueChange={(v) => setForm({ ...form, day: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Period *</Label>
                      <Select
                        value={form.period}
                        onValueChange={(v) => {
                          const p = PERIODS.find((p) => p.num === v);
                          setForm({
                            ...form,
                            period: v,
                            start_time: p?.start || form.start_time,
                            end_time: p?.end || form.end_time,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODS.map((p) => (
                            <SelectItem key={p.num} value={p.num}>
                              Period {p.num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={form.start_time}
                        onChange={(e) =>
                          setForm({ ...form, start_time: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={form.end_time}
                        onChange={(e) =>
                          setForm({ ...form, end_time: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Subject *</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) =>
                        setForm({ ...form, subject: e.target.value })
                      }
                      placeholder="e.g. Mathematics"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Teacher Name</Label>
                      <Input
                        value={form.teacher_name}
                        onChange={(e) =>
                          setForm({ ...form, teacher_name: e.target.value })
                        }
                        placeholder="Teacher name"
                      />
                    </div>
                    <div>
                      <Label>Room</Label>
                      <Input
                        value={form.room}
                        onChange={(e) =>
                          setForm({ ...form, room: e.target.value })
                        }
                        placeholder="Room number"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSave}
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : editingPeriod
                        ? "Update Period"
                        : "Add Period"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{timetable.length}</p>
            <p className="text-xs text-gray-500">Total Periods</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">
              {Array.from(new Set(timetable.map((t) => t.subject))).length}
            </p>
            <p className="text-xs text-gray-500">Subjects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {
                Array.from(
                  new Set(
                    timetable
                      .filter((t) => t.teacher_name)
                      .map((t) => t.teacher_name),
                  ),
                ).length
              }
            </p>
            <p className="text-xs text-gray-500">Teachers Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {DAYS.filter((d) => timetable.some((t) => t.day === d)).length}
            </p>
            <p className="text-xs text-gray-500">Active Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Timetable Grid */}
      {selectedClass ? (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Timetable - Class {selectedClass}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 text-left text-sm font-semibold text-gray-600 w-20">
                    Period
                  </th>
                  <th className="border p-2 text-left text-xs text-gray-500 w-16">
                    Time
                  </th>
                  {DAYS.map((d) => (
                    <th
                      key={d}
                      className="border p-2 text-center text-sm font-semibold text-gray-600"
                    >
                      {d.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p.num} className="hover:bg-gray-50/50">
                    <td className="border p-2 text-sm font-medium text-gray-700">
                      P{p.num}
                    </td>
                    <td className="border p-2 text-xs text-gray-400">
                      {p.start}
                      <br />
                      {p.end}
                    </td>
                    {DAYS.map((day) => {
                      const period = getPeriod(day, p.num);
                      return (
                        <td key={day} className="border p-1 min-w-[100px]">
                          {period ? (
                            <div
                              className={`relative group rounded-lg p-2 border text-center cursor-pointer transition-all hover:shadow-sm ${getSubjectColor(period.subject)}`}
                              onClick={() => canEdit && openEdit(period)}
                            >
                              <p className="font-semibold text-xs">
                                {period.subject}
                              </p>
                              {period.teacher_name && (
                                <p className="text-[10px] mt-0.5 opacity-80">
                                  {period.teacher_name}
                                </p>
                              )}
                              {period.room && (
                                <p className="text-[10px] opacity-60">
                                  {period.room}
                                </p>
                              )}
                              {canDelete && (
                                <button
                                  className="absolute top-0.5 right-0.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(period.timetable_id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div
                              className={`rounded-lg p-2 text-center text-xs text-gray-300 ${canAdd ? "cursor-pointer hover:bg-gray-100 hover:text-gray-500" : ""}`}
                              onClick={() => {
                                if (canAdd) {
                                  setForm({
                                    ...form,
                                    class_name: selectedClass,
                                    day,
                                    period: p.num,
                                    start_time: p.start,
                                    end_time: p.end,
                                  });
                                  setDialogOpen(true);
                                }
                              }}
                            >
                              {canAdd ? "+ Add" : "--"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-gray-500">Select a class to view timetable</p>
            <p className="text-sm text-gray-400 mt-1">
              {classes.length === 0
                ? "No classes found. Add periods to get started."
                : "Choose from the dropdown above"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Subject Legend */}
      {timetable.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">
              Subjects:
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(timetable.map((t) => t.subject))).map(
                (sub) => (
                  <Badge key={sub} className={getSubjectColor(sub)}>
                    {sub}
                  </Badge>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
