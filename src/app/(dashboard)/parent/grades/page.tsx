"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Trophy, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { showError } from "@/lib/alerts";

interface GradeRecord {
  grade_id: string;
  exam_id: string;
  exam_name: string;
  exam_type: string;
  exam_date: string | null;
  subject: string;
  className: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  rank: number;
  remarks: string;
}

interface GradeSummary {
  totalExams: number;
  avgPercentage: number;
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
  A: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "B+": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400",
  B: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
  D: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400",
  F: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
};

export default function ParentGradesPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id") || "";

  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [summary, setSummary] = useState<GradeSummary | null>(null);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterExamType, setFilterExamType] = useState("all");

  useEffect(() => {
    if (studentId) fetchGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function fetchGrades() {
    try {
      setLoading(true);
      const res = await fetch(`/api/parent/grades?student_id=${studentId}`);
      const json = await res.json();
      if (!json.success) {
        showError("Error", json.error || "Failed to load grades");
        return;
      }
      setGrades(json.data);
      setSummary(json.summary);
    } catch {
      showError("Error", "Failed to load grades");
    } finally {
      setLoading(false);
    }
  }

  const subjects = [...new Set(grades.map((g) => g.subject))];
  const examTypes = [...new Set(grades.map((g) => g.exam_type))];

  const filtered = grades.filter((g) => {
    if (filterSubject !== "all" && g.subject !== filterSubject) return false;
    if (filterExamType !== "all" && g.exam_type !== filterExamType)
      return false;
    return true;
  });

  // Per-subject averages
  const subjectAverages = subjects.map((subj) => {
    const subjectGrades = grades.filter((g) => g.subject === subj);
    const avg =
      subjectGrades.length > 0
        ? Math.round(
            (subjectGrades.reduce((s, g) => s + g.percentage, 0) /
              subjectGrades.length) *
              100,
          ) / 100
        : 0;
    return { subject: subj, avg, count: subjectGrades.length };
  });

  if (!studentId) {
    return (
      <div className="space-y-6">
        <Link href="/parent">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <Card>
          <CardContent className="py-16 text-center text-gray-500 dark:text-gray-400">
            No student selected. Please go back and select a child.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parent">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Grade Report
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Detailed academic performance across all exams
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {summary?.totalExams || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Exams
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {summary?.avgPercentage || 0}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Overall Average
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {subjects.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Subjects
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject-wise Performance */}
          {subjectAverages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Subject-wise Performance
                </CardTitle>
                <CardDescription>
                  Average percentage across all exams per subject
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subjectAverages.map((sa) => (
                    <div key={sa.subject} className="flex items-center gap-4">
                      <span className="text-sm font-medium w-32 text-gray-700 dark:text-gray-300 truncate">
                        {sa.subject}
                      </span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            sa.avg >= 80
                              ? "bg-green-500"
                              : sa.avg >= 60
                                ? "bg-blue-500"
                                : sa.avg >= 40
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(sa.avg, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-14 text-right text-gray-900 dark:text-white">
                        {sa.avg}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters & Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg">All Exam Results</CardTitle>
                <div className="flex gap-2">
                  <Select
                    value={filterSubject}
                    onValueChange={setFilterSubject}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterExamType}
                    onValueChange={setFilterExamType}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {examTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No exam results found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Marks</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((g) => (
                        <TableRow key={g.grade_id}>
                          <TableCell className="font-medium">
                            {g.exam_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {g.exam_type.replace("-", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{g.subject}</TableCell>
                          <TableCell>
                            {g.exam_date
                              ? new Date(g.exam_date).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {g.marksObtained}/{g.totalMarks}
                          </TableCell>
                          <TableCell className="text-center">
                            {g.percentage}%
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                GRADE_COLORS[g.grade] ||
                                "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              }
                            >
                              {g.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {g.rank > 0 ? `#${g.rank}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
