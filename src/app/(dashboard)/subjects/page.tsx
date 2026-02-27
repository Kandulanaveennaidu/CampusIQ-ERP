"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil } from "lucide-react";
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

interface Subject {
  _id: string;
  name: string;
  code: string;
  credits: number;
  type: string;
  className: string;
  department: { _id: string; name: string } | null;
  teacherId: { _id: string; name: string } | null;
}

export default function SubjectsPage() {
  const { canAdd, canEdit } = usePermissions("academics");
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [teachers, setTeachers] = useState<
    Array<{ teacher_id: string; name: string }>
  >([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    credits: 3,
    type: "theory",
    class_name: "",
    department_id: "",
    teacher_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterDept, setFilterDept] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterDept) params.set("department_id", filterDept);
      const res = await fetch(`/api/subjects?${params}`);
      if (res.ok) {
        const d = await res.json();
        setSubjects(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  }, [filterDept]);

  const fetchDeps = useCallback(async () => {
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const d = await res.json();
        setDepartments(d.data || []);
      }
    } catch {
      /* silent */
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

  useEffect(() => {
    fetchData();
    fetchDeps();
    fetchTeachers();
  }, [fetchData, fetchDeps, fetchTeachers]);

  const save = async () => {
    try {
      setSubmitting(true);
      const method = editId ? "PUT" : "POST";
      const body = editId ? { id: editId, ...form } : form;

      const res = await fetch("/api/subjects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showSuccess("Success", `Subject ${editId ? "updated" : "created"}`);
        setShowDialog(false);
        setEditId(null);
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to save subject");
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
          <p className="text-muted-foreground">
            Manage academic subjects and assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={filterDept || undefined}
            onValueChange={(v) => setFilterDept(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Depts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canAdd && (
            <Button
              onClick={() => {
                setEditId(null);
                setForm({
                  name: "",
                  code: "",
                  credits: 3,
                  type: "theory",
                  class_name: "",
                  department_id: "",
                  teacher_id: "",
                });
                setShowDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No subjects
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.code}</Badge>
                    </TableCell>
                    <TableCell>{s.credits}</TableCell>
                    <TableCell>{s.type}</TableCell>
                    <TableCell>{s.className || "—"}</TableCell>
                    <TableCell>
                      {s.department && typeof s.department === "object"
                        ? s.department.name
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {s.teacherId && typeof s.teacherId === "object"
                        ? s.teacherId.name
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditId(s._id);
                            setForm({
                              name: s.name,
                              code: s.code,
                              credits: s.credits,
                              type: s.type,
                              class_name: s.className || "",
                              department_id:
                                s.department && typeof s.department === "object"
                                  ? s.department._id
                                  : "",
                              teacher_id:
                                s.teacherId && typeof s.teacherId === "object"
                                  ? s.teacherId._id
                                  : "",
                            });
                            setShowDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mathematics"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="MAT101"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Credits</Label>
                <Input
                  type="number"
                  value={form.credits}
                  onChange={(e) =>
                    setForm({ ...form, credits: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["theory", "lab", "practical", "elective"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Class</Label>
              <Input
                value={form.class_name}
                onChange={(e) =>
                  setForm({ ...form, class_name: e.target.value })
                }
                placeholder="Class 10"
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select
                value={form.department_id || undefined}
                onValueChange={(v) => setForm({ ...form, department_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher</Label>
              <Select
                value={form.teacher_id || undefined}
                onValueChange={(v) => setForm({ ...form, teacher_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
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
            <Button onClick={save} disabled={submitting} className="w-full">
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
