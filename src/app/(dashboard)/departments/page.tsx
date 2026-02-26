"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError, confirmDelete } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
  hodId: { _id: string; name: string } | null;
  status: string;
}

export default function DepartmentsPage() {
  const { canAdd, canEdit, canDelete } = usePermissions("academics");
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/departments");
      if (res.ok) {
        const d = await res.json();
        setDepartments(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const save = async () => {
    try {
      setSubmitting(true);
      const method = editId ? "PUT" : "POST";
      const body = editId ? { id: editId, ...form } : form;

      const res = await fetch("/api/departments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showSuccess("Success", `Department ${editId ? "updated" : "created"}`);
        setShowDialog(false);
        setForm({ name: "", code: "", description: "" });
        setEditId(null);
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDept = async (id: string) => {
    const confirmed = await confirmDelete("department");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/departments?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showSuccess("Deleted");
        fetchData();
      }
    } catch {
      showError("Error", "Failed to delete");
    }
  };

  const openEdit = (d: Department) => {
    setEditId(d._id);
    setForm({ name: d.name, code: d.code, description: d.description || "" });
    setShowDialog(true);
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
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-slate-500">Manage academic departments</p>
        </div>
        {canAdd && (
          <Button
            onClick={() => {
              setEditId(null);
              setForm({ name: "", code: "", description: "" });
              setShowDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>HOD</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No departments
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{d.code}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {d.description || "—"}
                    </TableCell>
                    <TableCell>
                      {d.hodId && typeof d.hodId === "object"
                        ? d.hodId.name
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          d.status === "active" ? "present" : "secondary"
                        }
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(d)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => deleteDept(d._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
            <DialogTitle>{editId ? "Edit" : "Add"} Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Computer Science"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="CS"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
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
