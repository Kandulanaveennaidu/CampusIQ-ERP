"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUpCircle } from "lucide-react";
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

interface Promotion {
  _id: string;
  academicYear: string;
  fromClass: string;
  toClass: string;
  studentName: string;
  rollNumber: string;
  status: string;
  promotedAt: string;
}

export default function PromotionsPage() {
  const { canAdd } = usePermissions("academic_management");
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    academic_year: "2024-25",
    from_class: "",
    to_class: "",
    student_ids: [] as string[],
    status: "promoted",
    remarks: "",
  });
  const [students, setStudents] = useState<
    Array<{ _id: string; name: string; class_name: string }>
  >([]);
  const [filterClass, setFilterClass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClass) params.set("from_class", filterClass);
      const res = await fetch(`/api/promotions?${params}`);
      if (res.ok) {
        const d = await res.json();
        setPromotions(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch promotions");
    } finally {
      setLoading(false);
    }
  }, [filterClass]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const d = await res.json();
        setStudents(d.data || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStudents();
  }, [fetchData, fetchStudents]);

  const filteredStudents = form.from_class
    ? students.filter((s) => s.class_name === form.from_class)
    : students;

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s._id));
    }
  };

  const promoteStudents = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          student_ids: selectedStudents,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        showSuccess("Success", d.message || "Students promoted");
        setShowDialog(false);
        setSelectedStudents([]);
        fetchData();
        fetchStudents();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to process promotions");
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
          <h1 className="text-2xl font-bold text-foreground">
            Student Promotions
          </h1>
          <p className="text-slate-500">Bulk promote or retain students</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filter by class"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-36"
          />
          {canAdd && (
            <Button onClick={() => setShowDialog(true)}>
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Promote Students
            </Button>
          )}
        </div>
      </div>

      {/* Previous Promotions */}
      <Card>
        <CardHeader>
          <CardTitle>Promotion History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    No promotions yet
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-medium">
                      {p.studentName}
                    </TableCell>
                    <TableCell>{p.rollNumber}</TableCell>
                    <TableCell>{p.fromClass}</TableCell>
                    <TableCell>{p.toClass}</TableCell>
                    <TableCell>{p.academicYear}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "promoted"
                            ? "present"
                            : p.status === "graduated"
                              ? "late"
                              : "absent"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.promotedAt
                        ? new Date(p.promotedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Promote Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Promote Students</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Academic Year</Label>
              <Input
                value={form.academic_year}
                onChange={(e) =>
                  setForm({ ...form, academic_year: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>From Class</Label>
                <Input
                  value={form.from_class}
                  onChange={(e) =>
                    setForm({ ...form, from_class: e.target.value })
                  }
                  placeholder="Class 9"
                />
              </div>
              <div>
                <Label>To Class</Label>
                <Input
                  value={form.to_class}
                  onChange={(e) =>
                    setForm({ ...form, to_class: e.target.value })
                  }
                  placeholder="Class 10"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["promoted", "retained", "graduated", "transferred"].map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>
                  Select Students ({selectedStudents.length}/
                  {filteredStudents.length})
                </Label>
                <Button size="sm" variant="outline" onClick={selectAll}>
                  {selectedStudents.length === filteredStudents.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                {filteredStudents.map((s) => (
                  <label
                    key={s._id}
                    className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s._id)}
                      onChange={() => toggleStudent(s._id)}
                      className="rounded"
                    />
                    <span className="text-sm">{s.name}</span>
                    <span className="text-xs text-slate-400">
                      {s.class_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={promoteStudents}
              disabled={submitting || selectedStudents.length === 0}
              className="w-full"
            >
              {submitting
                ? "Processing..."
                : `Promote ${selectedStudents.length} Student(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
