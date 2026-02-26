"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PenTool, Plus } from "lucide-react";
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

interface Exam {
  _id: string;
  name: string;
  type: string;
  className: string;
  subjectName: string;
  totalMarks: number;
  passingMarks: number;
  date: string;
  status: string;
}

interface Grade {
  _id: string;
  studentName: string;
  examName: string;
  subjectName: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  isPassed: boolean;
}

export default function ExamsPage() {
  useSession();
  const { canAdd, canEdit } = usePermissions("exams");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"exams" | "grades">("exams");
  const [exams, setExams] = useState<Exam[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [examForm, setExamForm] = useState({
    name: "",
    type: "unit-test",
    class_name: "",
    subject_id: "",
    total_marks: 100,
    passing_marks: 35,
    date: "",
  });
  const [gradeForm, setGradeForm] = useState({
    exam_id: "",
    entries: [{ student_id: "", marks_obtained: 0 }],
  });
  const [students, setStudents] = useState<
    Array<{ _id: string; name: string; class_name: string }>
  >([]);
  const [subjects, setSubjects] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [filterClass, setFilterClass] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClass) params.set("class_name", filterClass);

      const [eRes, gRes] = await Promise.all([
        fetch(`/api/exams?type=exams&${params}`),
        fetch(`/api/exams?type=grades&${params}`),
      ]);

      if (eRes.ok) {
        const d = await eRes.json();
        setExams(d.data || []);
      }
      if (gRes.ok) {
        const d = await gRes.json();
        setGrades(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch exam data");
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

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/subjects");
      if (res.ok) {
        const d = await res.json();
        setSubjects(d.data || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStudents();
    fetchSubjects();
  }, [fetchData, fetchStudents, fetchSubjects]);

  const createExam = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_exam", ...examForm }),
      });

      if (res.ok) {
        showSuccess("Success", "Exam created");
        setShowExamDialog(false);
        setExamForm({
          name: "",
          type: "unit-test",
          class_name: "",
          subject_id: "",
          total_marks: 100,
          passing_marks: 35,
          date: "",
        });
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to create exam");
    } finally {
      setSubmitting(false);
    }
  };

  const enterGrades = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enter_grades", ...gradeForm }),
      });

      if (res.ok) {
        showSuccess("Success", "Grades entered");
        setShowGradeDialog(false);
        setGradeForm({
          exam_id: "",
          entries: [{ student_id: "", marks_obtained: 0 }],
        });
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to enter grades");
    } finally {
      setSubmitting(false);
    }
  };

  const addGradeEntry = () => {
    setGradeForm({
      ...gradeForm,
      entries: [...gradeForm.entries, { student_id: "", marks_obtained: 0 }],
    });
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
          <h1 className="text-2xl font-bold text-foreground">Exams & Grades</h1>
          <p className="text-slate-500">
            Manage examinations and student grades
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filter by class"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-36"
          />
          {canAdd && (
            <Button onClick={() => setShowExamDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setShowGradeDialog(true)}>
              <PenTool className="mr-2 h-4 w-4" />
              Enter Grades
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["exams", "grades"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "exams" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Passing</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-slate-500"
                    >
                      No exams found
                    </TableCell>
                  </TableRow>
                ) : (
                  exams.map((e) => (
                    <TableRow key={e._id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{e.type}</Badge>
                      </TableCell>
                      <TableCell>{e.className}</TableCell>
                      <TableCell>{e.subjectName}</TableCell>
                      <TableCell>{e.totalMarks}</TableCell>
                      <TableCell>{e.passingMarks}</TableCell>
                      <TableCell>
                        {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.status === "completed"
                              ? "present"
                              : e.status === "ongoing"
                                ? "late"
                                : "secondary"
                          }
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "grades" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-slate-500"
                    >
                      No grades found
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map((g) => (
                    <TableRow key={g._id}>
                      <TableCell className="font-medium">
                        {g.studentName}
                      </TableCell>
                      <TableCell>{g.examName}</TableCell>
                      <TableCell>{g.subjectName}</TableCell>
                      <TableCell>
                        {g.marksObtained}/{g.totalMarks}
                      </TableCell>
                      <TableCell>{g.percentage}%</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{g.grade}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={g.isPassed ? "present" : "absent"}>
                          {g.isPassed ? "Pass" : "Fail"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Exam Dialog */}
      <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Exam Name</Label>
              <Input
                value={examForm.name}
                onChange={(e) =>
                  setExamForm({ ...examForm, name: e.target.value })
                }
                placeholder="Unit Test 1"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={examForm.type}
                onValueChange={(v) => setExamForm({ ...examForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "unit-test",
                    "mid-term",
                    "final",
                    "practical",
                    "assignment",
                    "quiz",
                  ].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Input
                value={examForm.class_name}
                onChange={(e) =>
                  setExamForm({ ...examForm, class_name: e.target.value })
                }
                placeholder="Class 10"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Select
                value={examForm.subject_id || undefined}
                onValueChange={(v) =>
                  setExamForm({ ...examForm, subject_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Total Marks</Label>
                <Input
                  type="number"
                  value={examForm.total_marks}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      total_marks: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Passing Marks</Label>
                <Input
                  type="number"
                  value={examForm.passing_marks}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      passing_marks: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={examForm.date}
                onChange={(e) =>
                  setExamForm({ ...examForm, date: e.target.value })
                }
              />
            </div>
            <Button
              onClick={createExam}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Creating..." : "Create Exam"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enter Grades Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enter Grades</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Exam</Label>
              <Select
                value={gradeForm.exam_id || undefined}
                onValueChange={(v) =>
                  setGradeForm({ ...gradeForm, exam_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.name} - {e.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {gradeForm.entries.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <Select
                    value={entry.student_id || undefined}
                    onValueChange={(v) => {
                      const newEntries = [...gradeForm.entries];
                      newEntries[i].student_id = v;
                      setGradeForm({ ...gradeForm, entries: newEntries });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-24"
                    placeholder="Marks"
                    value={entry.marks_obtained}
                    onChange={(e) => {
                      const newEntries = [...gradeForm.entries];
                      newEntries[i].marks_obtained = Number(e.target.value);
                      setGradeForm({ ...gradeForm, entries: newEntries });
                    }}
                  />
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addGradeEntry}>
              + Add Student
            </Button>
            <Button
              onClick={enterGrades}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Saving..." : "Save Grades"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
