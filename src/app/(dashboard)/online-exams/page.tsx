"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Monitor,
  Play,
  X,
  FileText,
  Users,
  PlayCircle,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface OnlineExam {
  _id: string;
  title: string;
  description: string;
  subject: string;
  class_name: string;
  section: string;
  teacher: { _id: string; name: string; email: string } | null;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  questionCount: number;
  startTime: string;
  endTime: string;
  status: "draft" | "published" | "active" | "completed" | "cancelled";
  settings: {
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResults?: boolean;
    allowRetake?: boolean;
    maxAttempts?: number;
  };
  createdAt: string;
}

interface Question {
  question: string;
  options: string[];
  correctOption: number;
  marks: number;
  explanation: string;
}

interface ExamDetail extends OnlineExam {
  questions: Question[];
  attempts: {
    student: {
      _id: string;
      name: string;
      rollNumber?: string;
      class_name?: string;
    } | null;
    answers: number[];
    score: number;
    totalMarks: number;
    startedAt: string;
    submittedAt: string;
    status: string;
  }[];
}

function getExamStatus(exam: OnlineExam) {
  const now = new Date();
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);

  if (exam.status === "draft")
    return {
      label: "Draft",
      color: "bg-muted text-foreground dark:bg-card dark:text-foreground",
      icon: FileText,
    };
  if (exam.status === "cancelled")
    return {
      label: "Cancelled",
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      icon: X,
    };
  if (exam.status === "completed" || now > end)
    return {
      label: "Completed",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      icon: CheckCircle,
    };
  if (now >= start && now <= end)
    return {
      label: "Live",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      icon: Play,
    };
  return {
    label: "Upcoming",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock,
  };
}

export default function OnlineExamsPage() {
  const { data: sessionData } = useSession();
  const { canAdd, canEdit, canDelete } = usePermissions("exams");
  const isTeacherOrAdmin =
    sessionData?.user?.role === "admin" ||
    sessionData?.user?.role === "teacher";

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    class_name: "",
    section: "",
    duration: 60,
    totalMarks: 100,
    passingMarks: 40,
    startTime: "",
    endTime: "",
    status: "draft" as string,
    settings: {
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: true,
      allowRetake: false,
      maxAttempts: 1,
    },
  });

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(
    null,
  );
  const [questionForm, setQuestionForm] = useState<Question>({
    question: "",
    options: ["", "", "", ""],
    correctOption: 0,
    marks: 1,
    explanation: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClass) params.set("class_name", filterClass);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/online-exams?${params}`);
      if (res.ok) {
        const d = await res.json();
        setExams(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch online exams");
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      subject: "",
      class_name: "",
      section: "",
      duration: 60,
      totalMarks: 100,
      passingMarks: 40,
      startTime: "",
      endTime: "",
      status: "draft",
      settings: {
        shuffleQuestions: false,
        shuffleOptions: false,
        showResults: true,
        allowRetake: false,
        maxAttempts: 1,
      },
    });
    setQuestions([]);
  };

  const openCreate = () => {
    setEditId(null);
    resetForm();
    setShowDialog(true);
  };

  const openEdit = async (exam: OnlineExam) => {
    setEditId(exam._id);
    setForm({
      title: exam.title,
      description: exam.description,
      subject: exam.subject,
      class_name: exam.class_name,
      section: exam.section || "",
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      startTime: exam.startTime
        ? new Date(exam.startTime).toISOString().slice(0, 16)
        : "",
      endTime: exam.endTime
        ? new Date(exam.endTime).toISOString().slice(0, 16)
        : "",
      status: exam.status,
      settings: exam.settings || {
        shuffleQuestions: false,
        shuffleOptions: false,
        showResults: true,
        allowRetake: false,
        maxAttempts: 1,
      },
    });
    // Fetch full exam with questions for editing
    try {
      const res = await fetch(`/api/online-exams/${exam._id}`);
      if (res.ok) {
        const d = await res.json();
        setQuestions(d.data?.questions || []);
      }
    } catch {
      /* silent */
    }
    setShowDialog(true);
  };

  const save = async () => {
    if (
      !form.title ||
      !form.subject ||
      !form.class_name ||
      !form.startTime ||
      !form.endTime
    ) {
      showError(
        "Validation",
        "Title, Subject, Class, Start Time, and End Time are required",
      );
      return;
    }
    try {
      setSubmitting(true);
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/online-exams/${editId}` : "/api/online-exams";
      const payload = { ...form, questions };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showSuccess("Success", `Online exam ${editId ? "updated" : "created"}`);
        setShowDialog(false);
        setEditId(null);
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to save online exam");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExam = async (id: string) => {
    const confirmed = await showConfirm(
      "Delete Online Exam",
      "This will permanently delete this exam and all attempts. Continue?",
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/online-exams/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Deleted", "Online exam deleted successfully");
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to delete online exam");
    }
  };

  const viewDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      setShowDetailDialog(true);
      const res = await fetch(`/api/online-exams/${id}`);
      if (res.ok) {
        const d = await res.json();
        setDetail(d.data);
      } else {
        showError("Error", "Failed to load exam details");
        setShowDetailDialog(false);
      }
    } catch {
      showError("Error", "Failed to load exam details");
      setShowDetailDialog(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Question management
  const openAddQuestion = () => {
    setEditingQuestionIdx(null);
    setQuestionForm({
      question: "",
      options: ["", "", "", ""],
      correctOption: 0,
      marks: 1,
      explanation: "",
    });
    setShowQuestionDialog(true);
  };

  const openEditQuestion = (idx: number) => {
    setEditingQuestionIdx(idx);
    setQuestionForm({ ...questions[idx] });
    setShowQuestionDialog(true);
  };

  const saveQuestion = () => {
    if (!questionForm.question || questionForm.options.some((o) => !o.trim())) {
      showError("Validation", "Question and all options are required");
      return;
    }
    if (editingQuestionIdx !== null) {
      const updated = [...questions];
      updated[editingQuestionIdx] = questionForm;
      setQuestions(updated);
    } else {
      setQuestions([...questions, questionForm]);
    }
    setShowQuestionDialog(false);
    // Auto-update totalMarks
    const total = [
      ...questions,
      ...(editingQuestionIdx === null ? [questionForm] : []),
    ].reduce((s, q) => s + q.marks, 0);
    if (editingQuestionIdx !== null) {
      const updatedTotal = questions.reduce(
        (s, q, i) =>
          s + (i === editingQuestionIdx ? questionForm.marks : q.marks),
        0,
      );
      setForm((f) => ({ ...f, totalMarks: updatedTotal }));
    } else {
      setForm((f) => ({ ...f, totalMarks: total }));
    }
  };

  const removeQuestion = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setForm((f) => ({
      ...f,
      totalMarks: updated.reduce((s, q) => s + q.marks, 0),
    }));
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
          <h1 className="text-2xl font-bold text-foreground">
            Online Exams (MCQ)
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Create timed MCQ exams with auto-grading
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={filterClass || undefined}
            onValueChange={(v) => setFilterClass(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Classes</SelectItem>
              {Array.from(new Set(exams.map((e) => e.class_name)))
                .filter(Boolean)
                .map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={filterStatus || undefined}
            onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {canAdd && isTeacherOrAdmin && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Exam
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: "Total",
            count: exams.length,
            icon: Monitor,
            color: "text-blue-600",
          },
          {
            label: "Draft",
            count: exams.filter((e) => e.status === "draft").length,
            icon: FileText,
            color: "text-muted-foreground",
          },
          {
            label: "Published",
            count: exams.filter((e) => e.status === "published").length,
            icon: CheckCircle,
            color: "text-green-600",
          },
          {
            label: "Active",
            count: exams.filter((e) => e.status === "active").length,
            icon: Play,
            color: "text-blue-600",
          },
          {
            label: "Completed",
            count: exams.filter((e) => e.status === "completed").length,
            icon: CheckCircle,
            color: "text-emerald-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  {s.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Exams Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-10"
                  >
                    <Monitor className="mx-auto h-10 w-10 mb-2 text-slate-300 dark:text-muted-foreground" />
                    No online exams found
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((exam) => {
                  const status = getExamStatus(exam);
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={exam._id}>
                      <TableCell className="font-medium">
                        {exam.title}
                      </TableCell>
                      <TableCell>{exam.subject}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {exam.class_name}
                          {exam.section ? ` - ${exam.section}` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>{exam.duration} min</TableCell>
                      <TableCell>{exam.questionCount}</TableCell>
                      <TableCell>{exam.totalMarks}</TableCell>
                      <TableCell className="text-xs">
                        <div>
                          {exam.startTime
                            ? new Date(exam.startTime).toLocaleString()
                            : "—"}
                        </div>
                        <div className="text-muted-foreground">
                          to{" "}
                          {exam.endTime
                            ? new Date(exam.endTime).toLocaleString()
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="View"
                            onClick={() => viewDetail(exam._id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isTeacherOrAdmin &&
                            (status.label === "Live" ||
                              exam.status === "active" ||
                              exam.status === "published") && (
                              <Link href={`/online-exams/${exam._id}/take`}>
                                <Button
                                  size="sm"
                                  variant="default"
                                  title="Take Exam"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  Take Exam
                                </Button>
                              </Link>
                            )}
                          {canEdit && isTeacherOrAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Edit"
                              onClick={() => openEdit(exam)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && isTeacherOrAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Delete"
                              onClick={() => deleteExam(exam._id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Create"} Online Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Exam title"
                />
              </div>
              <div>
                <Label>Subject *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder="Mathematics"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Exam instructions"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Class *</Label>
                <Input
                  value={form.class_name}
                  onChange={(e) =>
                    setForm({ ...form, class_name: e.target.value })
                  }
                  placeholder="Class 10"
                />
              </div>
              <div>
                <Label>Section</Label>
                <Input
                  value={form.section}
                  onChange={(e) =>
                    setForm({ ...form, section: e.target.value })
                  }
                  placeholder="A"
                />
              </div>
              <div>
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Total Marks</Label>
                <Input
                  type="number"
                  value={form.totalMarks}
                  onChange={(e) =>
                    setForm({ ...form, totalMarks: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Passing Marks</Label>
                <Input
                  type="number"
                  value={form.passingMarks}
                  onChange={(e) =>
                    setForm({ ...form, passingMarks: Number(e.target.value) })
                  }
                />
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Settings */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm text-foreground">
                Exam Settings
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "shuffleQuestions", label: "Shuffle Questions" },
                  { key: "shuffleOptions", label: "Shuffle Options" },
                  { key: "showResults", label: "Show Results to Students" },
                  { key: "allowRetake", label: "Allow Retake" },
                ].map((s) => (
                  <label
                    key={s.key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={
                        form.settings[
                          s.key as keyof typeof form.settings
                        ] as boolean
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          settings: {
                            ...form.settings,
                            [s.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-border"
                    />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
              {form.settings.allowRetake && (
                <div className="w-48">
                  <Label>Max Attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.settings.maxAttempts || 1}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        settings: {
                          ...form.settings,
                          maxAttempts: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Questions */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground">
                  Questions ({questions.length})
                </h4>
                <Button size="sm" variant="outline" onClick={openAddQuestion}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Question
                </Button>
              </div>
              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  No questions added yet. Click &quot;Add Question&quot; to
                  start.
                </p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{q.question}</p>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                          {q.options.length} options &middot; {q.marks} marks
                          &middot; Correct: Option {q.correctOption + 1}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditQuestion(idx)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeQuestion(idx)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={save} disabled={submitting} className="w-full">
              {submitting
                ? "Saving..."
                : editId
                  ? "Update Exam"
                  : "Create Exam"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuestionIdx !== null ? "Edit" : "Add"} Question
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Question *</Label>
              <Textarea
                value={questionForm.question}
                onChange={(e) =>
                  setQuestionForm({ ...questionForm, question: e.target.value })
                }
                placeholder="Enter the question"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Options *</Label>
              {questionForm.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={questionForm.correctOption === idx}
                    onChange={() =>
                      setQuestionForm({ ...questionForm, correctOption: idx })
                    }
                    className="accent-primary"
                  />
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...questionForm.options];
                      opts[idx] = e.target.value;
                      setQuestionForm({ ...questionForm, options: opts });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1"
                  />
                  {questionForm.options.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const opts = questionForm.options.filter(
                          (_, i) => i !== idx,
                        );
                        let correct = questionForm.correctOption;
                        if (idx <= correct && correct > 0) correct--;
                        setQuestionForm({
                          ...questionForm,
                          options: opts,
                          correctOption: Math.min(correct, opts.length - 1),
                        });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {questionForm.options.length < 6 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setQuestionForm({
                      ...questionForm,
                      options: [...questionForm.options, ""],
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              )}
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Select the radio button next to the correct answer
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Marks</Label>
                <Input
                  type="number"
                  min={1}
                  value={questionForm.marks}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      marks: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Explanation (shown after submission)</Label>
              <Textarea
                value={questionForm.explanation}
                onChange={(e) =>
                  setQuestionForm({
                    ...questionForm,
                    explanation: e.target.value,
                  })
                }
                placeholder="Why this is the correct answer"
                rows={2}
              />
            </div>
            <Button onClick={saveQuestion} className="w-full">
              {editingQuestionIdx !== null ? "Update" : "Add"} Question
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail / Results Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exam Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : detail ? (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {detail.title}
                </h3>
                {detail.description && (
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {detail.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary">{detail.subject}</Badge>
                  <Badge variant="secondary">
                    {detail.class_name}
                    {detail.section ? ` - ${detail.section}` : ""}
                  </Badge>
                  <Badge
                    variant={
                      detail.status === "active" ? "default" : "secondary"
                    }
                  >
                    {detail.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    Duration: {detail.duration} min
                  </span>
                  <span className="text-muted-foreground">
                    Total: {detail.totalMarks} marks
                  </span>
                  <span className="text-muted-foreground">
                    Pass: {detail.passingMarks} marks
                  </span>
                </div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {detail.startTime
                    ? new Date(detail.startTime).toLocaleString()
                    : "—"}{" "}
                  —{" "}
                  {detail.endTime
                    ? new Date(detail.endTime).toLocaleString()
                    : "—"}
                </div>
              </div>

              {/* Questions */}
              {isTeacherOrAdmin &&
                detail.questions &&
                detail.questions.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold mb-3 text-foreground">
                      Questions ({detail.questions.length})
                    </h4>
                    <div className="space-y-3">
                      {detail.questions.map((q, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <p className="font-medium text-sm">
                            <span className="text-primary mr-1">
                              Q{idx + 1}.
                            </span>
                            {q.question}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {q.options.map((opt, oi) => (
                              <div
                                key={oi}
                                className={`text-xs px-2 py-1 rounded ${oi === q.correctOption ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium" : "bg-muted/50 text-muted-foreground dark:text-muted-foreground"}`}
                              >
                                {String.fromCharCode(65 + oi)}. {opt}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {q.marks} mark{q.marks > 1 ? "s" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Attempts / Results */}
              {isTeacherOrAdmin &&
                detail.attempts &&
                detail.attempts.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Student Attempts ({detail.attempts.length})
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Submitted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.attempts.map((a, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {a.student
                                ? typeof a.student === "object"
                                  ? a.student.name
                                  : a.student
                                : "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">
                                {a.score}/{a.totalMarks}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  a.score >= detail.passingMarks
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {a.score >= detail.passingMarks
                                  ? "Pass"
                                  : "Fail"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {a.startedAt
                                ? new Date(a.startedAt).toLocaleString()
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {a.submittedAt
                                ? new Date(a.submittedAt).toLocaleString()
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
