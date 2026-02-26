"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Search,
  Eye,
  Loader2,
  Plus,
  HardDrive,
  Shield,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";

const DOC_TYPES = [
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "transfer_certificate", label: "Transfer Certificate" },
  { value: "marksheet", label: "Marksheet" },
  { value: "photo", label: "Photo" },
  { value: "medical", label: "Medical Record" },
  { value: "admission_letter", label: "Admission Letter" },
  { value: "conduct_certificate", label: "Conduct Certificate" },
  { value: "income_certificate", label: "Income Certificate" },
  { value: "caste_certificate", label: "Caste Certificate" },
  { value: "other", label: "Other" },
];

interface StudentDoc {
  document_id: string;
  student: { _id: string; name: string; rollNumber?: string } | null;
  title: string;
  type: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: { _id: string; name: string } | null;
  notes: string;
  created_at: string;
}

interface Student {
  _id: string;
  name: string;
  roll_number?: string;
  student_id?: string;
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const { canAdd, canDelete } = usePermissions("documents");
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<StudentDoc[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    student: "",
    title: "",
    type: "other",
    notes: "",
    fileUrl: "",
    fileType: "",
    fileSize: 0,
  });

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.data || []);
      }
    } catch {
      console.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students?limit=500");
      if (res.ok) {
        const data = await res.json();
        setStudents(
          (data.data || []).map((s: Record<string, string>) => ({
            _id: s._id || s.student_id,
            name: s.name || s.student_name,
            roll_number: s.roll_number || s.rollNumber,
          })),
        );
      }
    } catch {
      console.error("Failed to fetch students");
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchDocs();
      fetchStudents();
    }
  }, [session, fetchDocs, fetchStudents]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          fileUrl: data.url || data.secure_url || "",
          fileType: file.type,
          fileSize: file.size,
        }));
      } else {
        showError("Failed to upload file");
      }
    } catch {
      showError("Upload error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student || !form.title || !form.fileUrl) {
      showError("Please fill all required fields and upload a file");
      return;
    }

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showSuccess("Document uploaded successfully");
        setShowUpload(false);
        setForm({
          student: "",
          title: "",
          type: "other",
          notes: "",
          fileUrl: "",
          fileType: "",
          fileSize: 0,
        });
        fetchDocs();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to upload document");
      }
    } catch {
      showError("Error uploading document");
    }
  };

  const handleDelete = async (docId: string) => {
    const confirmed = await showConfirm(
      "Delete Document",
      "Are you sure you want to delete this document?",
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId }),
      });
      if (res.ok) {
        showSuccess("Document deleted");
        fetchDocs();
      }
    } catch {
      showError("Failed to delete document");
    }
  };

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.student?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || d.type === filterType;
    return matchesSearch && matchesType;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Document Management
          </h1>
          <p className="text-muted-foreground">
            Upload and manage student documents
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
              <FolderOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{docs.length}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
              <HardDrive className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatSize(docs.reduce((s, d) => s + (d.fileSize || 0), 0))}
              </p>
              <p className="text-sm text-muted-foreground">Total Storage</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set(docs.map((d) => d.student?._id).filter(Boolean)).size}
              </p>
              <p className="text-sm text-muted-foreground">Students Covered</p>
            </div>
          </CardContent>
        </Card>
        {["birth_certificate", "aadhaar"].map((type) => (
          <Card key={type}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {docs.filter((d) => d.type === type).length}
              </p>
              <p className="text-sm text-muted-foreground">
                {DOC_TYPES.find((t) => t.value === type)?.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => (
                  <TableRow key={doc.document_id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{doc.student?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {DOC_TYPES.find((t) => t.value === doc.type)?.label ||
                          doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatSize(doc.fileSize)}</TableCell>
                    <TableCell>{doc.uploadedBy?.name || "-"}</TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.fileUrl} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.document_id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No documents found. Upload one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Student *</Label>
              <Select
                value={form.student}
                onValueChange={(v) => setForm({ ...form, student: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} {s.roll_number ? `(${s.roll_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Birth Certificate - John"
              />
            </div>
            <div>
              <Label>Document Type *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File *</Label>
              <div className="mt-1">
                {form.fileUrl ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FileText className="h-4 w-4" />
                    File uploaded
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm({
                          ...form,
                          fileUrl: "",
                          fileType: "",
                          fileSize: 0,
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 hover:bg-accent/50">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Uploading..." : "Click to upload file"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!form.fileUrl || uploading}>
                Upload
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
