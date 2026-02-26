"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  Plus,
  Calendar,
  Trash2,
  Loader2,
  Clock,
  GraduationCap,
  PenTool,
  BookCheck,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import { useClasses } from "@/hooks/use-classes";
import { usePermissions } from "@/hooks/use-permissions";

interface DiaryEntry {
  diary_id: string;
  class_name: string;
  section?: string;
  date: string;
  subject?: string;
  title: string;
  content: string;
  homework?: string;
  attachments: string[];
  createdBy: { _id: string; name: string } | null;
  created_at: string;
}

export default function DiaryPage() {
  const { data: session } = useSession();
  const { classes: CLASSES, classLabel } = useClasses();
  const { canAdd, canDelete } = usePermissions("diary");
  const isTeacherOrAdmin =
    session?.user?.role === "admin" || session?.user?.role === "teacher";

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedClass, setSelectedClass] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    class_name: "",
    section: "",
    date: new Date().toISOString().split("T")[0],
    subject: "",
    title: "",
    content: "",
    homework: "",
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.set("date", selectedDate);
      if (selectedClass !== "all") params.set("class", selectedClass);

      const res = await fetch(`/api/diary?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data || []);
      }
    } catch {
      console.error("Failed to fetch diary");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedClass]);

  useEffect(() => {
    if (session) fetchEntries();
  }, [session, fetchEntries]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content || !form.class_name) {
      showError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showSuccess("Diary entry created");
        setShowCreate(false);
        setForm({
          class_name: "",
          section: "",
          date: new Date().toISOString().split("T")[0],
          subject: "",
          title: "",
          content: "",
          homework: "",
        });
        fetchEntries();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to create entry");
      }
    } catch {
      showError("Error creating diary entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (diaryId: string) => {
    const confirmed = await showConfirm(
      "Delete Entry",
      "Are you sure you want to delete this diary entry?",
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/diary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diary_id: diaryId }),
      });
      if (res.ok) {
        showSuccess("Entry deleted");
        fetchEntries();
      }
    } catch {
      showError("Failed to delete");
    }
  };

  if (loading && entries.length === 0) {
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
            <BookOpen className="h-6 w-6" />
            Student Diary
          </h1>
          <p className="text-muted-foreground">
            Daily notes, homework & class summaries
          </p>
        </div>
        {isTeacherOrAdmin && canAdd && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-sm text-muted-foreground">
                Today&apos;s Entries
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
              <BookCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {entries.filter((e) => e.homework).length}
              </p>
              <p className="text-sm text-muted-foreground">With Homework</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
              <PenTool className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set(entries.map((e) => e.subject).filter(Boolean)).size}
              </p>
              <p className="text-sm text-muted-foreground">Subjects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {entries.reduce((s, e) => s + (e.attachments?.length || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Attachments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={classLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{`All ${classLabel}es`}</SelectItem>
            {CLASSES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-semibold text-muted-foreground">
              No diary entries for this date
            </p>
            <p className="text-sm text-muted-foreground">
              {isTeacherOrAdmin
                ? "Click 'New Entry' to add notes for today."
                : "Check back later for updates from your teachers."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.diary_id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{entry.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {entry.class_name}
                        {entry.section ? ` - ${entry.section}` : ""}
                      </Badge>
                      {entry.subject && (
                        <Badge variant="secondary">{entry.subject}</Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.date).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                  {isTeacherOrAdmin && canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.diary_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                {entry.homework && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
                    <p className="font-semibold text-sm text-amber-800 dark:text-amber-300 mb-1">
                      📝 Homework
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {entry.homework}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Posted by {entry.createdBy?.name || "Unknown"} at{" "}
                  {new Date(entry.created_at).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Diary Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{classLabel} *</Label>
                <Select
                  value={form.class_name}
                  onValueChange={(v) => setForm({ ...form, class_name: v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={`Select ${classLabel.toLowerCase()}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Input
                  value={form.section}
                  onChange={(e) =>
                    setForm({ ...form, section: e.target.value })
                  }
                  placeholder="A, B, C..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder="e.g. Mathematics"
                />
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Today's class summary"
              />
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Describe what was covered in class today..."
                rows={4}
              />
            </div>
            <div>
              <Label>Homework</Label>
              <Textarea
                value={form.homework}
                onChange={(e) => setForm({ ...form, homework: e.target.value })}
                placeholder="Homework assignments for students..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
