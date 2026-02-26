"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  BookOpen,
  CalendarCheck,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { showError } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";

interface Child {
  student_id: string;
  name: string;
  class_name: string;
  roll_number: string;
  photo: string;
  email: string;
  status: string;
  admission_date: string;
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

interface GradeSummary {
  totalExams: number;
  avgPercentage: number;
}

interface FeeSummary {
  totalFees: number;
  totalPaid: number;
  totalDue: number;
  overdueCount: number;
}

interface ChildDashboard {
  child: Child;
  attendance: AttendanceStats | null;
  grades: GradeSummary | null;
  fees: FeeSummary | null;
}

export default function ParentDashboardPage() {
  const { data: session } = useSession();
  const { canView: _canView } = usePermissions("parent");
  const [loading, setLoading] = useState(true);
  const [childrenData, setChildrenData] = useState<ChildDashboard[]>([]);

  useEffect(() => {
    if (session?.user) {
      fetchChildren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function fetchChildren() {
    try {
      setLoading(true);
      const res = await fetch("/api/parent");
      const json = await res.json();
      if (!json.success) {
        showError("Error", json.error || "Failed to load children");
        return;
      }

      const children: Child[] = json.data;

      // Fetch summaries for each child in parallel
      const enriched = await Promise.all(
        children.map(async (child) => {
          const [attRes, gradeRes, feeRes] = await Promise.all([
            fetch(
              `/api/parent/attendance?student_id=${child.student_id}&month=${getCurrentMonth()}`,
            )
              .then((r) => r.json())
              .catch(() => null),
            fetch(`/api/parent/grades?student_id=${child.student_id}`)
              .then((r) => r.json())
              .catch(() => null),
            fetch(`/api/parent/fees?student_id=${child.student_id}`)
              .then((r) => r.json())
              .catch(() => null),
          ]);

          return {
            child,
            attendance: attRes?.stats || null,
            grades: gradeRes?.summary || null,
            fees: feeRes?.summary || null,
          };
        }),
      );

      setChildrenData(enriched);
    } catch {
      showError("Error", "Failed to load parent dashboard");
    } finally {
      setLoading(false);
    }
  }

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (childrenData.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Parent Portal
        </h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Children Linked
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              No students are currently linked to your account. Please contact
              the administration to link your children to your parent account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Parent Portal
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {session?.user?.name}. Here&apos;s an overview of your
            children&apos;s progress.
          </p>
        </div>
      </div>

      {childrenData.map(({ child, attendance, grades, fees }) => (
        <Card key={child.student_id} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">{child.name}</CardTitle>
                  <CardDescription>
                    Class {child.class_name} &bull; Roll No. {child.roll_number}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={child.status === "active" ? "default" : "secondary"}
              >
                {child.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Attendance Card */}
              <Card className="border dark:border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Attendance (This Month)
                    </CardTitle>
                    <CalendarCheck className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  {attendance ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {attendance.total > 0
                          ? Math.round(
                              (attendance.present / attendance.total) * 100,
                            )
                          : 0}
                        %
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          {attendance.present} Present
                        </span>
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" />
                          {attendance.absent} Absent
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <Clock className="h-3 w-3" />
                          {attendance.late} Late
                        </span>
                      </div>
                      <Link
                        href={`/parent/attendance?student_id=${child.student_id}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                        >
                          View Details
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Grades Card */}
              <Card className="border dark:border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Academic Performance
                    </CardTitle>
                    <BookOpen className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  {grades ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {grades.avgPercentage}%
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Average across {grades.totalExams} exam
                        {grades.totalExams !== 1 ? "s" : ""}
                      </p>
                      <Link
                        href={`/parent/grades?student_id=${child.student_id}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                        >
                          View Grades
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Fees Card */}
              <Card className="border dark:border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Fee Status
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  {fees ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        &#8377;{fees.totalDue.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Due out of &#8377;{fees.totalFees.toLocaleString()}
                      </p>
                      {fees.overdueCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          {fees.overdueCount} overdue
                        </div>
                      )}
                      <Link
                        href={`/parent/fees?student_id=${child.student_id}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                        >
                          View Fees
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
