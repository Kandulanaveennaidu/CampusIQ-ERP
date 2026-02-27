"use client";

import { useState, useEffect } from "react";
import {
  Download,
  FileText,
  Users,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  GraduationCap,
  ScrollText,
  IdCard,
  Search,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { showError, showSuccess } from "@/lib/alerts";
import { useClasses } from "@/hooks/use-classes";
import { usePermissions } from "@/hooks/use-permissions";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface StudentReport {
  student_id: string;
  student_name: string;
  roll_number: string;
  total_days: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  percentage: number;
}

interface ReportData {
  month: number;
  year: number;
  class_name: string;
  students: StudentReport[];
  summary: {
    total_students: number;
    average_attendance: number;
    total_working_days: number;
  };
  chartData: {
    pie: Array<{ name: string; value: number; color: string }>;
    lowAttendance: StudentReport[];
  };
}

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function ReportsPage() {
  const { canView } = usePermissions("reports");
  const [activeTab, setActiveTab] = useState<"attendance" | "documents">(
    "attendance",
  );
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(currentYear));
  const [className, setClassName] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Document reports state
  const [students, setStudents] = useState<
    Array<{
      _id: string;
      name: string;
      class_name: string;
      roll_number: string;
    }>
  >([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [docClass, setDocClass] = useState("");
  const [docLoading, setDocLoading] = useState<string | null>(null);

  // Fetch students for document reports
  useEffect(() => {
    if (activeTab === "documents") {
      fetch("/api/students?limit=1000")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => setStudents(d.data || []))
        .catch(() => {});
    }
  }, [activeTab]);

  const { classes, classLabel } = useClasses();

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month,
        year,
        ...(className && { class_name: className }),
      });
      const response = await fetch(`/api/reports/monthly?${params}`);
      if (response.ok) {
        const result = await response.json();
        setReportData(result.data);
      } else {
        throw new Error("Failed to generate report");
      }
    } catch {
      showError("Error", "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportData) return;

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Monthly Attendance Report", 20, 20);

    // Subtitle
    doc.setFontSize(12);
    doc.text(
      `${months.find((m) => m.value === month)?.label} ${year} - ${
        className || "All Classes"
      }`,
      20,
      30,
    );

    // Summary
    doc.setFontSize(10);
    doc.text(`Total Students: ${reportData.summary.total_students}`, 20, 45);
    doc.text(
      `Average Attendance: ${reportData.summary.average_attendance}%`,
      20,
      52,
    );
    doc.text(`Working Days: ${reportData.summary.total_working_days}`, 20, 59);

    // Table header
    let y = 75;
    doc.setFontSize(9);
    doc.text("Roll No", 20, y);
    doc.text("Name", 45, y);
    doc.text("Present", 100, y);
    doc.text("Absent", 125, y);
    doc.text("Late", 150, y);
    doc.text("%", 175, y);

    // Table rows
    y += 8;
    reportData.students.forEach((student) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(student.roll_number, 20, y);
      doc.text(student.student_name.substring(0, 20), 45, y);
      doc.text(String(student.present_count), 100, y);
      doc.text(String(student.absent_count), 125, y);
      doc.text(String(student.late_count), 150, y);
      doc.text(`${student.percentage}%`, 175, y);
      y += 7;
    });

    doc.save(`attendance_report_${month}_${year}.pdf`);
  };

  const downloadExcel = async () => {
    if (!reportData) return;

    const XLSX = (await import("@/lib/xlsx-utils")).default;

    const data = reportData.students.map((s) => ({
      "Roll Number": s.roll_number,
      "Student Name": s.student_name,
      "Total Days": s.total_days,
      Present: s.present_count,
      Absent: s.absent_count,
      Late: s.late_count,
      Leave: s.leave_count,
      Percentage: `${s.percentage}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");

    await XLSX.writeFile(wb, `attendance_report_${month}_${year}.xlsx`);
  };

  const openReportInNewTab = async (
    type: string,
    studentId: string,
    studentName: string,
  ) => {
    setDocLoading(`${type}-${studentId}`);
    try {
      const params = new URLSearchParams({ student_id: studentId });
      const res = await fetch(`/api/reports/${type}?${params}`);
      if (!res.ok) throw new Error("Failed to generate");
      const html = await res.text();
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      }
      showSuccess(
        "Report Generated",
        `${type.replace("-", " ")} for ${studentName}`,
      );
    } catch {
      showError("Error", `Failed to generate ${type.replace("-", " ")}`);
    } finally {
      setDocLoading(null);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !studentSearch ||
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = !docClass || s.class_name === docClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and download reports</p>
        </div>
        {activeTab === "attendance" && reportData && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={downloadExcel}>
              <Download className="mr-2 h-4 w-4" />
              Download Excel
            </Button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "attendance" ? "default" : "ghost"}
          onClick={() => setActiveTab("attendance")}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Attendance Reports
        </Button>
        <Button
          variant={activeTab === "documents" ? "default" : "ghost"}
          onClick={() => setActiveTab("documents")}
        >
          <FileText className="mr-2 h-4 w-4" />
          Document Reports
        </Button>
      </div>

      {/* ═══════ ATTENDANCE TAB ═══════ */}
      {activeTab === "attendance" && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-4">
                {/* Month */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Month</label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Class */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{classLabel}</label>
                  <Select
                    value={className}
                    onValueChange={(v) => setClassName(v === "all" ? "" : v)}
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

                {/* Generate Button */}
                <div className="flex items-end">
                  <Button
                    onClick={generateReport}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Generating...
                      </>
                    ) : (
                      "Generate Report"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Content */}
          {reportData && (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {reportData.summary.total_students}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {reportData.summary.average_attendance}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Average Attendance
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {reportData.chartData.lowAttendance.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Below 75%</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Tables */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Distribution</CardTitle>
                    <CardDescription>
                      Overall attendance breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.chartData.pie}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            dataKey="value"
                          >
                            {reportData.chartData.pie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Low Attendance Alert */}
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-5 w-5" />
                      Low Attendance Students
                    </CardTitle>
                    <CardDescription>
                      Students with less than 75% attendance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.chartData.lowAttendance.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        No students below 75% attendance
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Roll No</TableHead>
                            <TableHead>%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.chartData.lowAttendance.map((student) => (
                            <TableRow key={student.student_id}>
                              <TableCell>{student.student_name}</TableCell>
                              <TableCell>{student.roll_number}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {student.percentage}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Report</CardTitle>
                  <CardDescription>
                    Student-wise attendance breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-center">
                          Total Days
                        </TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Leave</TableHead>
                        <TableHead className="text-center">
                          Percentage
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.students.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">
                            {student.roll_number}
                          </TableCell>
                          <TableCell>{student.student_name}</TableCell>
                          <TableCell className="text-center">
                            {student.total_days}
                          </TableCell>
                          <TableCell className="text-center text-green-600">
                            {student.present_count}
                          </TableCell>
                          <TableCell className="text-center text-red-600">
                            {student.absent_count}
                          </TableCell>
                          <TableCell className="text-center text-amber-600">
                            {student.late_count}
                          </TableCell>
                          <TableCell className="text-center text-blue-600">
                            {student.leave_count}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                student.percentage >= 75
                                  ? "success"
                                  : "destructive"
                              }
                            >
                              {student.percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* No Data */}
          {!loading && !reportData && (
            <Card>
              <CardContent className="flex h-64 flex-col items-center justify-center">
                <FileText className="mb-4 h-12 w-12 text-slate-300" />
                <p className="text-muted-foreground">
                  Select month, year and class, then click &quot;Generate
                  Report&quot;
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════ DOCUMENT REPORTS TAB ═══════ */}
      {activeTab === "documents" && (
        <>
          {/* Document type quick-access cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                icon: GraduationCap,
                title: "Report Card",
                desc: "Student academic report cards with grades",
                color: "blue",
              },
              {
                icon: CreditCard,
                title: "Fee Receipt",
                desc: "Payment receipts for fee collections",
                color: "green",
              },
              {
                icon: ScrollText,
                title: "Transfer Certificate",
                desc: "TC for student transfers",
                color: "amber",
              },
              {
                icon: IdCard,
                title: "ID Card",
                desc: "Student identity cards with photo",
                color: "purple",
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full bg-${item.color}-100`}
                  >
                    <item.icon className={`h-6 w-6 text-${item.color}-600`} />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Student</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Name or roll number..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Select
                    value={docClass}
                    onValueChange={(v) => setDocClass(v === "all" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <p className="text-sm text-muted-foreground">
                    {filteredStudents.length} student(s) found
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students Table with Report Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Student Documents</CardTitle>
              <CardDescription>
                Select a student and click on the report type to generate &
                print
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No students found. Adjust filters above.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.slice(0, 50).map((s) => (
                      <TableRow key={s._id}>
                        <TableCell className="font-medium">
                          {s.roll_number}
                        </TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.class_name}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={docLoading === `report-card-${s._id}`}
                              onClick={() =>
                                openReportInNewTab("report-card", s._id, s.name)
                              }
                            >
                              {docLoading === `report-card-${s._id}` ? (
                                <Spinner className="h-3 w-3" />
                              ) : (
                                <GraduationCap className="mr-1 h-3 w-3" />
                              )}
                              Report Card
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                docLoading === `transfer-certificate-${s._id}`
                              }
                              onClick={() =>
                                openReportInNewTab(
                                  "transfer-certificate",
                                  s._id,
                                  s.name,
                                )
                              }
                            >
                              {docLoading ===
                              `transfer-certificate-${s._id}` ? (
                                <Spinner className="h-3 w-3" />
                              ) : (
                                <ScrollText className="mr-1 h-3 w-3" />
                              )}
                              TC
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={docLoading === `id-card-${s._id}`}
                              onClick={() =>
                                openReportInNewTab("id-card", s._id, s.name)
                              }
                            >
                              {docLoading === `id-card-${s._id}` ? (
                                <Spinner className="h-3 w-3" />
                              ) : (
                                <IdCard className="mr-1 h-3 w-3" />
                              )}
                              ID Card
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {filteredStudents.length > 50 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Showing first 50 of {filteredStudents.length} students. Use
                  search to narrow results.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
