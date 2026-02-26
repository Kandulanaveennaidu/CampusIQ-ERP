"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  BookOpen,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError, confirmDelete } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";
import { PhotoUpload } from "@/components/ui/photo-upload";

interface Teacher {
  teacher_id: string;
  school_id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  classes: string;
  salary_per_day: string;
  joining_date: string;
  role: string;
  status: string;
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  subject: "",
  classes: "",
  salary_per_day: "",
  avatar: "",
};

export default function TeachersPage() {
  useSession();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) {
        const result = await res.json();
        setTeachers(result.data || []);
      }
    } catch {
      console.error("Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const openAddDialog = () => {
    setEditTeacher(null);
    setFormData(emptyForm);
    setShowDialog(true);
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      password: "",
      phone: teacher.phone,
      subject: teacher.subject,
      classes: teacher.classes,
      salary_per_day: teacher.salary_per_day,
      avatar: (teacher as Teacher & { avatar?: string }).avatar || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editTeacher) {
        const res = await fetch("/api/teachers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacher_id: editTeacher.teacher_id,
            name: formData.name,
            phone: formData.phone,
            subject: formData.subject,
            classes: formData.classes,
            salary_per_day: formData.salary_per_day,
            avatar: formData.avatar,
          }),
        });
        if (!res.ok) throw new Error("Failed");
        showSuccess("Updated", "Teacher updated successfully");
      } else {
        const res = await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed");
        }
        showSuccess("Added", "Teacher added successfully");
      }
      setShowDialog(false);
      fetchTeachers();
    } catch (err) {
      showError(
        "Error",
        err instanceof Error ? err.message : "Failed to save teacher",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (teacherId: string) => {
    const confirmed = await confirmDelete("this teacher");
    if (!confirmed) return;
    setDeleting(teacherId);
    try {
      const res = await fetch(`/api/teachers?teacher_id=${teacherId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      showSuccess("Removed", "Teacher removed successfully");
      fetchTeachers();
    } catch {
      showError("Error", "Failed to remove teacher");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStatus = async (teacher: Teacher) => {
    const newStatus = teacher.status === "active" ? "inactive" : "active";
    try {
      await fetch("/api/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacher.teacher_id,
          status: newStatus,
        }),
      });
      showSuccess(
        "Updated",
        `Teacher ${newStatus === "active" ? "activated" : "deactivated"}`,
      );
      fetchTeachers();
    } catch {
      showError("Error", "Failed to update status");
    }
  };

  const filtered = teachers.filter(
    (t) =>
      (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.subject || "").toLowerCase().includes(search.toLowerCase()),
  );

  const { canAdd, canEdit, canDelete } = usePermissions("teachers");

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
          <h1 className="text-2xl font-bold text-foreground">Teachers</h1>
          <p className="text-slate-500">
            {teachers.length} teacher(s) registered
          </p>
        </div>
        <div className="flex gap-2">
          {canAdd && (
            <Link href="/teachers/import">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </Link>
          )}
          {canAdd && (
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Teacher
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teachers.length}</p>
                <p className="text-xs text-slate-500">Total Teachers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {teachers.filter((t) => t.status === "active").length}
                </p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {
                    Array.from(
                      new Set(teachers.map((t) => t.subject).filter(Boolean)),
                    ).length
                  }
                </p>
                <p className="text-xs text-slate-500">Subjects Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search teachers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher List</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-slate-500">
              <p>No teachers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((teacher) => (
                    <TableRow key={teacher.teacher_id}>
                      <TableCell className="font-mono text-xs">
                        {teacher.teacher_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {teacher.name}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Mail className="h-3 w-3" />
                            {teacher.email}
                          </div>
                          {teacher.phone && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Phone className="h-3 w-3" />
                              {teacher.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{teacher.subject || "-"}</TableCell>
                      <TableCell>{teacher.classes || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            teacher.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          className="cursor-pointer"
                          onClick={() => canEdit && handleToggleStatus(teacher)}
                        >
                          {teacher.status || "active"}
                        </Badge>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <div className="flex gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(teacher)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(teacher.teacher_id)}
                                disabled={deleting === teacher.teacher_id}
                              >
                                {deleting === teacher.teacher_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTeacher ? "Edit Teacher" : "Add New Teacher"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo */}
            <div className="flex justify-center">
              <PhotoUpload
                value={formData.avatar}
                onChange={(dataUrl) =>
                  setFormData({ ...formData, avatar: dataUrl })
                }
                label="Upload Photo"
              />
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={!!editTeacher}
                className={editTeacher ? "bg-slate-50" : ""}
              />
            </div>

            {!editTeacher && (
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  placeholder="Set login password"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="e.g. Mathematics"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Classes</Label>
                <Input
                  value={formData.classes}
                  onChange={(e) =>
                    setFormData({ ...formData, classes: e.target.value })
                  }
                  placeholder="e.g. 10A, 10B"
                />
              </div>
              <div className="space-y-2">
                <Label>Salary per Day</Label>
                <Input
                  type="number"
                  value={formData.salary_per_day}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salary_per_day: e.target.value,
                    })
                  }
                  placeholder="Amount"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editTeacher ? "Updating..." : "Adding..."}
                </>
              ) : editTeacher ? (
                "Update Teacher"
              ) : (
                "Add Teacher"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
