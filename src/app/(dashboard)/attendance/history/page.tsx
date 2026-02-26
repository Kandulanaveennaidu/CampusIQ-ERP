"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Search, Download } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { showError } from "@/lib/alerts";
import { useClasses } from "@/hooks/use-classes";

interface AttendanceRecord {
  attendance_id: string;
  date: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  class_name: string;
  status: string;
  marked_by: string;
  marked_at: string;
  notes: string;
}

export default function AttendanceHistoryPage() {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [className, setClassName] = useState("");
  const { classes, classLabel } = useClasses();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
  });

  const fetchHistory = async () => {
    if (!className) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        date,
        class_name: className,
      });
      const response = await fetch(`/api/attendance?${params}`);
      if (response.ok) {
        const result = await response.json();
        setRecords(result.data || []);
        setStats(
          result.stats || {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
          },
        );
      }
    } catch {
      showError("Error", "Failed to fetch attendance history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (className) {
      fetchHistory();
    }
  }, [date, className]);

  const filteredRecords = records.filter(
    (r) =>
      r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.roll_number?.toLowerCase().includes(search.toLowerCase()),
  );

  const exportToCSV = () => {
    const headers = [
      "Roll No",
      "Student Name",
      "Class",
      "Status",
      "Date",
      "Notes",
    ];
    const rows = filteredRecords.map((r) => [
      r.roll_number,
      r.student_name,
      r.class_name,
      r.status,
      r.date,
      r.notes,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `attendance_${date}_${className}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Attendance History
          </h1>
          <p className="text-slate-500">View past attendance records</p>
        </div>
        <Button
          variant="outline"
          onClick={exportToCSV}
          disabled={records.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Class Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{classLabel}</label>
              <Select value={className} onValueChange={setClassName}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Select ${classLabel.toLowerCase()}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {className && (
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: "Total", value: stats.total, color: "bg-slate-100" },
            { label: "Present", value: stats.present, color: "bg-green-100" },
            { label: "Absent", value: stats.absent, color: "bg-red-100" },
            { label: "Late", value: stats.late, color: "bg-amber-100" },
            { label: "Leave", value: stats.leave, color: "bg-blue-100" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className={`p-4 ${stat.color}`}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            {className
              ? `${className} - ${format(new Date(date), "dd MMM yyyy")}`
              : "Select a class to view records"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : !className ? (
            <div className="flex h-64 items-center justify-center text-slate-500">
              Please select a class to view records
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-slate-500">
              No attendance records found for this date
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marked At</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.attendance_id}>
                    <TableCell className="font-medium">
                      {record.roll_number}
                    </TableCell>
                    <TableCell>{record.student_name}</TableCell>
                    <TableCell>{record.class_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "present"
                            ? "present"
                            : record.status === "absent"
                              ? "absent"
                              : record.status === "late"
                                ? "late"
                                : "leave"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.marked_at
                        ? format(new Date(record.marked_at), "hh:mm a")
                        : "-"}
                    </TableCell>
                    <TableCell>{record.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
