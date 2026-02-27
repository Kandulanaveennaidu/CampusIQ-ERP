"use client";

import { Check, X, Clock, CalendarOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

interface StudentWithAttendance {
  student_id: string;
  roll_number: string;
  name: string;
  class_name: string;
  status: AttendanceStatus | null;
  notes: string;
}

interface AttendanceGridProps {
  students: StudentWithAttendance[];
  attendanceMap: Record<string, { status: AttendanceStatus; notes: string }>;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
}

const statusOptions: {
  value: AttendanceStatus;
  label: string;
  icon: typeof Check;
  color: string;
  bgColor: string;
  activeColor: string;
}[] = [
  {
    value: "present",
    label: "P",
    icon: Check,
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
    activeColor: "bg-green-500 text-white",
  },
  {
    value: "absent",
    label: "A",
    icon: X,
    color: "text-red-600",
    bgColor: "bg-red-50 hover:bg-red-100",
    activeColor: "bg-red-500 text-white",
  },
  {
    value: "late",
    label: "L",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50 hover:bg-amber-100",
    activeColor: "bg-amber-500 text-white",
  },
  {
    value: "leave",
    label: "Lv",
    icon: CalendarOff,
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
    activeColor: "bg-blue-500 text-white",
  },
];

export function AttendanceGrid({
  students,
  attendanceMap,
  onStatusChange,
}: AttendanceGridProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Roll No</TableHead>
            <TableHead>Student Name</TableHead>
            <TableHead className="w-64 text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const currentStatus = attendanceMap[student.student_id]?.status;

            return (
              <TableRow key={student.student_id}>
                <TableCell className="font-medium">
                  {student.roll_number}
                </TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {statusOptions.map((option) => {
                      const isActive = currentStatus === option.value;
                      const Icon = option.icon;

                      return (
                        <button
                          key={option.value}
                          onClick={() =>
                            onStatusChange(student.student_id, option.value)
                          }
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg border transition-all",
                            isActive
                              ? option.activeColor
                              : `${option.bgColor} border-border`,
                          )}
                          title={
                            option.value.charAt(0).toUpperCase() +
                            option.value.slice(1)
                          }
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
