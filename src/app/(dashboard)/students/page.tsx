"use client";

import { useEffect, useState, useCallback } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Search,
  Plus,
  Download,
  Upload,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { showSuccess, showError } from "@/lib/alerts";
import { StudentForm } from "@/components/students/student-form";
import { useClasses } from "@/hooks/use-classes";
import Link from "next/link";

interface Student {
  student_id: string;
  school_id: string;
  class_name: string;
  roll_number: string;
  name: string;
  parent_name: string;
  parent_phone: string;
  email: string;
  address: string;
  admission_date: string;
  status: string;
}

export default function StudentsPage() {
  const { canAdd, canEdit, canDelete } = usePermissions("students");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [className, setClassName] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { classes, classLabel } = useClasses();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(className && { class_name: className }),
      });
      const response = await fetch(`/api/students?${params}`);
      if (response.ok) {
        const result = await response.json();
        setStudents(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
      }
    } catch {
      showError("Error", "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, search, className]);

  const handleAddStudent = () => {
    setEditingStudent(null);
    setDialogOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setDialogOpen(true);
  };

  const handleDeleteClick = (student: Student) => {
    setDeletingStudent(student);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/students/${deletingStudent.student_id}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        showSuccess("Success", "Student deleted successfully");
        fetchStudents();
      } else {
        throw new Error("Failed to delete");
      }
    } catch {
      showError("Error", "Failed to delete student");
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
      setDeletingStudent(null);
    }
  };

  const handleFormSubmit = async (data: Partial<Student>) => {
    setSaving(true);
    try {
      const url = editingStudent
        ? `/api/students/${editingStudent.student_id}`
        : "/api/students";
      const method = editingStudent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showSuccess(
          "Success",
          editingStudent
            ? "Student updated successfully"
            : "Student added successfully",
        );
        setDialogOpen(false);
        fetchStudents();
      } else {
        const result = await response.json();
        throw new Error(result.error || "Failed to save");
      }
    } catch (error) {
      showError(
        "Error",
        error instanceof Error ? error.message : "Failed to save student",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Fetch ALL students (bypassing pagination) for export ──
  const fetchAllStudents = useCallback(async (): Promise<Student[]> => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        ...(search && { search }),
        ...(className && { class_name: className }),
      });
      const response = await fetch(`/api/students?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      const allStudents: Student[] = result.data || [];
      const totalPages = result.pagination?.totalPages || 1;

      // Fetch remaining pages if any
      if (totalPages > 1) {
        const requests = [];
        for (let p = 2; p <= totalPages; p++) {
          const pageParams = new URLSearchParams({
            page: p.toString(),
            limit: "100",
            ...(search && { search }),
            ...(className && { class_name: className }),
          });
          requests.push(
            fetch(`/api/students?${pageParams}`).then((r) => r.json()),
          );
        }
        const pages = await Promise.all(requests);
        for (const pageResult of pages) {
          allStudents.push(...(pageResult.data || []));
        }
      }

      return allStudents;
    } catch {
      throw new Error("Failed to fetch students for export");
    }
  }, [search, className]);

  // ── Export to PDF (Professional styled) ──
  const exportToPDF = async () => {
    setExporting(true);
    try {
      const allStudents = await fetchAllStudents();
      if (allStudents.length === 0) {
        showError("No Data", "No students found to export.");
        return;
      }

      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // ── Header background ──
      doc.setFillColor(17, 24, 39); // slate-900
      doc.rect(0, 0, pageWidth, 28, "F");

      // ── Title ──
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Student Report", 14, 12);

      // ── Subtitle ──
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated on ${dateStr}  |  Total Students: ${allStudents.length}${className ? `  |  Class: ${className}` : ""}${search ? `  |  Search: "${search}"` : ""}`,
        14,
        20,
      );

      // ── Institution branding right side ──
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("CampusIQ", pageWidth - 14, 12, { align: "right" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Institution Management System", pageWidth - 14, 18, {
        align: "right",
      });

      // ── Table data ──
      const tableData = allStudents.map((s, i) => [
        (i + 1).toString(),
        s.roll_number,
        s.name,
        s.class_name,
        s.parent_name || "-",
        s.parent_phone || "-",
        s.email || "-",
        s.address || "-",
        s.status.charAt(0).toUpperCase() + s.status.slice(1),
      ]);

      // ── Auto table ──
      (
        doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }
      ).autoTable({
        startY: 34,
        head: [
          [
            "S.No",
            "Roll No",
            "Student Name",
            "Class",
            "Parent Name",
            "Phone",
            "Email",
            "Address",
            "Status",
          ],
        ],
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          textColor: [30, 41, 59],
          font: "helvetica",
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
          halign: "center",
          cellPadding: 4,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          1: { halign: "center", cellWidth: 20 },
          2: { cellWidth: 40, fontStyle: "bold" },
          3: { halign: "center", cellWidth: 25 },
          4: { cellWidth: 35 },
          5: { halign: "center", cellWidth: 28 },
          6: { cellWidth: 45 },
          7: { cellWidth: 50 },
          8: { halign: "center", cellWidth: 18 },
        },
        margin: { left: 10, right: 10 },
        didParseCell: (data: {
          section: string;
          column: { index: number };
          row: { index: number };
          cell: { styles: { textColor: number[]; fontStyle: string } };
        }) => {
          // Color the status cell
          if (data.section === "body" && data.column.index === 8) {
            const val = tableData[data.row.index]?.[8];
            if (val === "Active") {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = "bold";
            } else {
              data.cell.styles.textColor = [148, 163, 184];
            }
          }
        },
        didDrawPage: (data: { pageNumber: number }) => {
          // Footer on every page
          const pageH = doc.internal.pageSize.getHeight();
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(10, pageH - 12, pageWidth - 10, pageH - 12);

          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.setFont("helvetica", "normal");
          doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageH - 7, {
            align: "center",
          });
          doc.text(`Printed: ${now.toLocaleString("en-IN")}`, 14, pageH - 7);
          doc.text("CampusIQ - Confidential", pageWidth - 14, pageH - 7, {
            align: "right",
          });
        },
      });

      doc.save(`Students_Report_${now.toISOString().slice(0, 10)}.pdf`);
      showSuccess(
        "Exported",
        `PDF exported with ${allStudents.length} students.`,
      );
    } catch (err) {
      console.error(err);
      showError("Export Failed", "Could not generate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // ── Export to Excel (Professional styled) ──
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const allStudents = await fetchAllStudents();
      if (allStudents.length === 0) {
        showError("No Data", "No students found to export.");
        return;
      }

      const XLSX = (await import("@/lib/xlsx-utils")).default;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // Build worksheet data with title rows
      const wsData: (string | number)[][] = [];

      // Row 1: Title
      wsData.push(["Student Report"]);

      // Row 2: Meta info
      wsData.push([
        `Generated: ${dateStr}`,
        "",
        `Total Students: ${allStudents.length}`,
        "",
        className ? `Class: ${className}` : "",
        "",
        search ? `Search: ${search}` : "",
      ]);

      // Row 3: Blank separator
      wsData.push([]);

      // Row 4: Headers
      wsData.push([
        "S.No",
        "Roll Number",
        "Student Name",
        "Class",
        "Parent Name",
        "Parent Phone",
        "Email",
        "Address",
        "Admission Date",
        "Status",
      ]);

      // Row 5+: Data
      allStudents.forEach((s, i) => {
        wsData.push([
          i + 1,
          s.roll_number,
          s.name,
          s.class_name,
          s.parent_name || "-",
          s.parent_phone || "-",
          s.email || "-",
          s.address || "-",
          s.admission_date || "-",
          s.status.charAt(0).toUpperCase() + s.status.slice(1),
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // ── Merge title row across all columns ──
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Title row
      ];

      // ── Column widths ──
      ws["!cols"] = [
        { wch: 6 }, // S.No
        { wch: 14 }, // Roll Number
        { wch: 25 }, // Student Name
        { wch: 14 }, // Class
        { wch: 22 }, // Parent Name
        { wch: 16 }, // Parent Phone
        { wch: 28 }, // Email
        { wch: 35 }, // Address
        { wch: 16 }, // Admission Date
        { wch: 12 }, // Status
      ];

      // ── Row heights ──
      ws["!rows"] = [
        { hpt: 30 }, // Title row
        { hpt: 20 }, // Meta row
        { hpt: 8 }, // Separator
        { hpt: 22 }, // Header row
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");

      // ── Summary sheet ──
      const summaryData = [
        ["Student Export Summary"],
        [],
        ["Generated On", now.toLocaleString("en-IN")],
        ["Total Students", allStudents.length],
        [
          "Active Students",
          allStudents.filter((s) => s.status === "active").length,
        ],
        [
          "Inactive Students",
          allStudents.filter((s) => s.status !== "active").length,
        ],
        [],
        ["Class-wise Breakdown"],
      ];

      // Count students per class
      const classCounts = allStudents.reduce(
        (acc, s) => {
          acc[s.class_name] = (acc[s.class_name] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      Object.entries(classCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([cls, count]) => {
          summaryData.push([cls, count as unknown as string]);
        });

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs["!cols"] = [{ wch: 22 }, { wch: 30 }];
      summaryWs["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      await XLSX.writeFile(
        wb,
        `Students_Report_${now.toISOString().slice(0, 10)}.xlsx`,
      );
      showSuccess(
        "Exported",
        `Excel exported with ${allStudents.length} students.`,
      );
    } catch (err) {
      console.error(err);
      showError("Export Failed", "Could not generate Excel. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage student records</p>
        </div>
        <div className="flex gap-2">
          {canAdd && (
            <Link href="/students/import">
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting}>
                {exporting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={exportToPDF}
                className="flex cursor-pointer items-center gap-2 py-2.5"
              >
                <FileText className="h-4 w-4 text-red-500" />
                <div>
                  <p className="font-medium">Export as PDF</p>
                  <p className="text-xs text-muted-foreground">
                    Styled report with tables
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={exportToExcel}
                className="flex cursor-pointer items-center gap-2 py-2.5"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <div>
                  <p className="font-medium">Export as Excel</p>
                  <p className="text-xs text-muted-foreground">
                    Spreadsheet with summary
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canAdd && (
            <Button onClick={handleAddStudent}>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or roll number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* Class Filter */}
            <Select
              value={className}
              onValueChange={(value) => {
                setClassName(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`All ${classLabel}es`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{`All ${classLabel}es`}</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>{students.length} students found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : students.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              No students found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Parent Phone</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium">
                        {student.roll_number}
                      </TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.class_name}</TableCell>
                      <TableCell>{student.parent_phone || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            student.status === "active"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditStudent(student)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(student)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? "Edit Student" : "Add Student"}
            </DialogTitle>
            <DialogDescription>
              {editingStudent
                ? "Update student information"
                : "Enter the details for the new student"}
            </DialogDescription>
          </DialogHeader>
          <StudentForm
            initialData={editingStudent || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setDialogOpen(false)}
            loading={saving}
            classes={classes}
            classLabel={classLabel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingStudent?.name}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
