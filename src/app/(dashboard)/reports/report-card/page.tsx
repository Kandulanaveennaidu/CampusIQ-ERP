"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FileText, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { showError, showWarning } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";

interface Student {
  _id: string;
  name: string;
  roll_number: string;
  class_name: string;
}

interface Exam {
  _id: string;
  name: string;
  type: string;
  className: string;
  subject: string;
  date: string;
  status: string;
}

interface ReportCardExam {
  exam_name: string;
  subjects: {
    subject: string;
    marks_obtained: number;
    total_marks: number;
    percentage: number;
    grade: string;
  }[];
  total_marks: number;
  total_possible: number;
  overall_percentage: number;
}

export default function ReportCardPage() {
  useSession();
  const { canView } = usePermissions("reports");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedExam, setSelectedExam] = useState("all");
  const [filterClass, setFilterClass] = useState("");
  const [reportData, setReportData] = useState<ReportCardExam[]>([]);
  const [searched, setSearched] = useState(false);

  // Get unique class names
  const classNames = [...new Set(students.map((s) => s.class_name))].sort();

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const d = await res.json();
        setStudents(d.data || []);
      }
    } catch {
      showError("Error", "Failed to load students");
    }
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      const params = new URLSearchParams({ type: "exams" });
      if (filterClass) params.set("class_name", filterClass);
      const res = await fetch(`/api/exams?${params}`);
      if (res.ok) {
        const d = await res.json();
        setExams(d.data || []);
      }
    } catch {
      showError("Error", "Failed to load exams");
    }
  }, [filterClass]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const filteredStudents = filterClass
    ? students.filter((s) => s.class_name === filterClass)
    : students;

  const fetchReportCard = async () => {
    if (!selectedStudent) {
      showWarning("Select Student", "Please select a student first.");
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const params = new URLSearchParams({
        type: "report-card",
        student_id: selectedStudent,
      });
      const res = await fetch(`/api/exams?${params}`);
      if (res.ok) {
        const d = await res.json();
        setReportData(d.data || []);
      } else {
        showError("Error", "Failed to fetch report card data");
      }
    } catch {
      showError("Error", "Failed to fetch report card");
    } finally {
      setLoading(false);
    }
  };

  const printReportCard = () => {
    if (!selectedStudent) {
      showWarning("Select Student", "Please select a student first.");
      return;
    }

    const params = new URLSearchParams({ student_id: selectedStudent });
    if (selectedExam && selectedExam !== "all") {
      params.set("exam_id", selectedExam);
    }
    window.open(
      `/api/reports/report-card?${params}`,
      "_blank",
      "width=900,height=700,scrollbars=yes",
    );
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground dark:text-muted-foreground">
          You do not have permission to view reports.
        </p>
      </div>
    );
  }

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "B+":
      case "B":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "C":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "D":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Report Card
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
            View and print student report cards
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="dark:bg-background dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Select Student & Exam</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Class Filter */}
            <div>
              <label className="text-sm font-medium text-foreground dark:text-foreground mb-1 block">
                Filter by Class
              </label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Select */}
            <div>
              <label className="text-sm font-medium text-foreground dark:text-foreground mb-1 block">
                Student *
              </label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Student" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.roll_number}) - {s.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exam Select */}
            <div>
              <label className="text-sm font-medium text-foreground dark:text-foreground mb-1 block">
                Exam (optional)
              </label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {exams.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.name} - {e.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button onClick={fetchReportCard} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                onClick={printReportCard}
                disabled={!selectedStudent}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {!loading && searched && reportData.length === 0 && (
        <Card className="dark:bg-background dark:border-gray-800">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground dark:text-muted-foreground">
              No grades found for this student. Please ensure grades have been
              entered.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading &&
        reportData.map((exam, idx) => (
          <Card
            key={idx}
            className="dark:bg-background dark:border-gray-800 overflow-hidden"
          >
            <CardHeader className="bg-muted/50/50">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{exam.exam_name}</span>
                <Badge variant="outline" className="text-sm">
                  {exam.overall_percentage}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">
                      Marks Obtained
                    </TableHead>
                    <TableHead className="text-center">Total Marks</TableHead>
                    <TableHead className="text-center">Percentage</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exam.subjects.map((sub, sIdx) => (
                    <TableRow key={sIdx}>
                      <TableCell className="font-medium">
                        {sub.subject}
                      </TableCell>
                      <TableCell className="text-center">
                        {sub.marks_obtained}
                      </TableCell>
                      <TableCell className="text-center">
                        {sub.total_marks}
                      </TableCell>
                      <TableCell className="text-center">
                        {sub.percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={gradeColor(sub.grade)}>
                          {sub.grade}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="bg-muted/50/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">
                      {exam.total_marks}
                    </TableCell>
                    <TableCell className="text-center">
                      {exam.total_possible}
                    </TableCell>
                    <TableCell className="text-center">
                      {exam.overall_percentage}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={gradeColor(
                          getGrade(exam.overall_percentage),
                        )}
                      >
                        {getGrade(exam.overall_percentage)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}
