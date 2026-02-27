"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Star,
  Users,
  Plus,
  MessageSquare,
  TrendingUp,
  Loader2,
  BarChart3,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { showSuccess, showError } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";

const RATING_CATEGORIES = [
  { key: "teaching_quality", label: "Teaching Quality" },
  { key: "communication", label: "Communication" },
  { key: "punctuality", label: "Punctuality" },
  { key: "subject_knowledge", label: "Subject Knowledge" },
  { key: "approachability", label: "Approachability" },
] as const;

interface TeacherEvalData {
  teacher_id: string;
  name: string;
  department: string;
  totalEvals: number;
  avgRating: number;
  ratings: Record<string, number>;
  recentComments: string[];
}

interface Teacher {
  _id: string;
  name: string;
  teacher_id?: string;
}

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            className={`h-5 w-5 ${
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300 dark:text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function TeacherEvaluationPage() {
  const { data: session } = useSession();
  const { canAdd } = usePermissions("teacher_evaluation");
  const isAdmin = session?.user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [evals, setEvals] = useState<TeacherEvalData[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherEvalData | null>(null);

  const [form, setForm] = useState({
    teacher: "",
    ratings: {
      teaching_quality: 0,
      communication: 0,
      punctuality: 0,
      subject_knowledge: 0,
      approachability: 0,
    },
    comments: "",
    isAnonymous: true,
  });

  const fetchEvals = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher-evaluation");
      if (res.ok) {
        const data = await res.json();
        setEvals(data.data || []);
      }
    } catch {
      console.error("Failed to fetch evaluations");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers?limit=200");
      if (res.ok) {
        const data = await res.json();
        setTeachers(
          (data.data || []).map((t: Record<string, string>) => ({
            _id: t._id || t.teacher_id,
            name: t.name || t.teacher_name,
          })),
        );
      }
    } catch {
      console.error("Failed to fetch teachers");
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchEvals();
      fetchTeachers();
    }
  }, [session, fetchEvals, fetchTeachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacher) {
      showError("Please select a teacher");
      return;
    }
    const allRated = Object.values(form.ratings).every((r) => r >= 1);
    if (!allRated) {
      showError("Please rate all categories");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showSuccess("Evaluation submitted successfully");
        setShowDialog(false);
        setForm({
          teacher: "",
          ratings: {
            teaching_quality: 0,
            communication: 0,
            punctuality: 0,
            subject_knowledge: 0,
            approachability: 0,
          },
          comments: "",
          isAnonymous: true,
        });
        fetchEvals();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to submit evaluation");
      }
    } catch {
      showError("Error submitting evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600 dark:text-green-400";
    if (rating >= 3.5) return "text-blue-600 dark:text-blue-400";
    if (rating >= 2.5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4.5) return "Excellent";
    if (rating >= 3.5) return "Good";
    if (rating >= 2.5) return "Average";
    return "Needs Improvement";
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
            <Star className="h-6 w-6" />
            Teacher Evaluation
          </h1>
          <p className="text-muted-foreground">
            Anonymous feedback and performance ratings
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Evaluation
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Teachers Evaluated
              </p>
              <p className="text-2xl font-bold">{evals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900">
              <Star className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
              <p className="text-2xl font-bold">
                {evals.length
                  ? (
                      evals.reduce((s, e) => s + e.avgRating, 0) / evals.length
                    ).toFixed(1)
                  : "-"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-2xl font-bold">
                {evals.reduce((s, e) => s + e.totalEvals, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
              <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top Rated</p>
              <p className="text-lg font-bold truncate">
                {evals.length
                  ? [...evals].sort((a, b) => b.avgRating - a.avgRating)[0]
                      ?.name
                  : "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category-wise Analytics */}
      {evals.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Category Average Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Category-wise Average Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {RATING_CATEGORIES.map((cat) => {
                  const avg = evals.length
                    ? evals.reduce((s, e) => s + (e.ratings[cat.key] || 0), 0) /
                      evals.length
                    : 0;
                  return (
                    <div key={cat.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{cat.label}</span>
                        <span className={`font-medium ${getRatingColor(avg)}`}>
                          {avg.toFixed(1)} / 5
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(avg / 5) * 100}%`,
                            backgroundColor:
                              avg >= 4
                                ? "#10b981"
                                : avg >= 3
                                  ? "#3b82f6"
                                  : avg >= 2
                                    ? "#f59e0b"
                                    : "#ef4444",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top 5 Teachers Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" /> Top Rated Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...evals]
                  .sort((a, b) => b.avgRating - a.avgRating)
                  .slice(0, 5)
                  .map((t, i) => (
                    <div
                      key={t.teacher_id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-600" : "bg-blue-500"}`}
                      >
                        #{i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.department} • {t.totalEvals} reviews
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${getRatingColor(t.avgRating)}`}
                        >
                          {t.avgRating.toFixed(1)}
                        </p>
                        <Badge
                          variant={t.avgRating >= 4 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {getRatingBadge(t.avgRating)}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Teacher Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Reviews</TableHead>
                  <TableHead className="text-center">Teaching</TableHead>
                  <TableHead className="text-center">Communication</TableHead>
                  <TableHead className="text-center">Punctuality</TableHead>
                  <TableHead className="text-center">Knowledge</TableHead>
                  <TableHead className="text-center">Approachability</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No evaluations yet. Be the first to submit feedback!
                    </TableCell>
                  </TableRow>
                ) : (
                  evals
                    .sort((a, b) => b.avgRating - a.avgRating)
                    .map((ev) => (
                      <TableRow
                        key={ev.teacher_id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setSelectedTeacher(ev)}
                      >
                        <TableCell className="font-medium">{ev.name}</TableCell>
                        <TableCell>{ev.department || "-"}</TableCell>
                        <TableCell className="text-center">
                          {ev.totalEvals}
                        </TableCell>
                        <TableCell
                          className={`text-center font-semibold ${getRatingColor(ev.ratings.teaching_quality)}`}
                        >
                          {ev.ratings.teaching_quality}
                        </TableCell>
                        <TableCell
                          className={`text-center font-semibold ${getRatingColor(ev.ratings.communication)}`}
                        >
                          {ev.ratings.communication}
                        </TableCell>
                        <TableCell
                          className={`text-center font-semibold ${getRatingColor(ev.ratings.punctuality)}`}
                        >
                          {ev.ratings.punctuality}
                        </TableCell>
                        <TableCell
                          className={`text-center font-semibold ${getRatingColor(ev.ratings.subject_knowledge)}`}
                        >
                          {ev.ratings.subject_knowledge}
                        </TableCell>
                        <TableCell
                          className={`text-center font-semibold ${getRatingColor(ev.ratings.approachability)}`}
                        >
                          {ev.ratings.approachability}
                        </TableCell>
                        <TableCell
                          className={`text-center font-bold ${getRatingColor(ev.avgRating)}`}
                        >
                          {ev.avgRating}/5
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ev.avgRating >= 4
                                ? "default"
                                : ev.avgRating >= 3
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {getRatingBadge(ev.avgRating)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Comments Detail Dialog */}
      {selectedTeacher && (
        <Dialog
          open={!!selectedTeacher}
          onOpenChange={() => setSelectedTeacher(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedTeacher.name} — Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {RATING_CATEGORIES.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{cat.label}</span>
                    <span
                      className={`font-bold ${getRatingColor(selectedTeacher.ratings[cat.key])}`}
                    >
                      {selectedTeacher.ratings[cat.key]}/5
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Recent Comments</h4>
                {selectedTeacher.recentComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No comments yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedTeacher.recentComments.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-accent/50 p-3 text-sm"
                      >
                        &ldquo;{c}&rdquo;
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Submit Evaluation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Teacher Evaluation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Teacher *</Label>
              <Select
                value={form.teacher}
                onValueChange={(v) => setForm({ ...form, teacher: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {RATING_CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="flex items-center justify-between"
                >
                  <Label className="text-sm">{cat.label}</Label>
                  <StarRating
                    value={form.ratings[cat.key as keyof typeof form.ratings]}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        ratings: { ...form.ratings, [cat.key]: v },
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>Comments (Optional)</Label>
              <Textarea
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
                placeholder="Share your feedback..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={form.isAnonymous}
                onChange={(e) =>
                  setForm({ ...form, isAnonymous: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                Submit anonymously
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
