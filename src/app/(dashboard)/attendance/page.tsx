"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ClipboardList,
  QrCode,
  BookOpenCheck,
  UserCheck,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  CalendarDays,
  History,
  FileBarChart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useClasses } from "@/hooks/use-classes";
import { usePermissions } from "@/hooks/use-permissions";

interface AttendanceOverview {
  todayStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    percentage: number;
  };
  weeklyTrend: {
    date: string;
    percentage: number;
  }[];
  recentActivity: {
    class: string;
    markedBy: string;
    time: string;
    count: number;
  }[];
}

const quickActions = [
  {
    title: "Mark Attendance",
    description: "Take daily student attendance by class",
    href: "/attendance/mark",
    icon: ClipboardList,
    color: "bg-blue-500",
    lightColor: "bg-blue-50 dark:bg-blue-950",
  },
  {
    title: "Attendance History",
    description: "View and export past attendance records",
    href: "/attendance/history",
    icon: History,
    color: "bg-green-500",
    lightColor: "bg-green-50 dark:bg-green-950",
  },
  {
    title: "QR Attendance",
    description: "Generate QR codes for quick check-in",
    href: "/attendance/qr",
    icon: QrCode,
    color: "bg-purple-500",
    lightColor: "bg-purple-50 dark:bg-purple-950",
  },
  {
    title: "Subject Attendance",
    description: "Track per-subject attendance",
    href: "/subject-attendance",
    icon: BookOpenCheck,
    color: "bg-amber-500",
    lightColor: "bg-amber-50 dark:bg-amber-950",
  },
  {
    title: "Teacher Attendance",
    description: "Manage teacher check-in & check-out",
    href: "/teacher-attendance",
    icon: UserCheck,
    color: "bg-teal-500",
    lightColor: "bg-teal-50 dark:bg-teal-950",
  },
  {
    title: "Reports & Analytics",
    description: "Attendance reports and insights",
    href: "/reports",
    icon: FileBarChart,
    color: "bg-rose-500",
    lightColor: "bg-rose-50 dark:bg-rose-950",
  },
];

export default function AttendancePage() {
  const { canView: _canView } = usePermissions("attendance");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AttendanceOverview | null>(null);
  const { classLabel } = useClasses();

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/attendance?today=true");
      if (res.ok) {
        const data = await res.json();
        const records = data.records || [];
        const total = records.length;
        const present = records.filter(
          (r: { status: string }) => r.status === "present",
        ).length;
        const absent = records.filter(
          (r: { status: string }) => r.status === "absent",
        ).length;
        const late = records.filter(
          (r: { status: string }) => r.status === "late",
        ).length;
        const leave = records.filter(
          (r: { status: string }) => r.status === "leave",
        ).length;

        setOverview({
          todayStats: {
            total,
            present,
            absent,
            late,
            leave,
            percentage: total > 0 ? Math.round((present / total) * 100) : 0,
          },
          weeklyTrend: [],
          recentActivity: [],
        });
      }
    } catch {
      // Silently fail — show empty state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = overview?.todayStats || {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    percentage: 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Attendance Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track, manage, and analyze student &amp; teacher attendance
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <CalendarDays className="h-4 w-4 mr-1" />
          {format(new Date(), "EEEE, MMM d, yyyy")}
        </Badge>
      </div>

      {/* Today&apos;s Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.present}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.absent}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Late</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.late}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attendance %</p>
                <p className="text-2xl font-bold">{stats.percentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group h-full border hover:border-primary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${action.lightColor}`}>
                        <Icon
                          className={`h-5 w-5 text-white ${action.color} rounded p-0.5`}
                        />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {action.title}
                        </CardTitle>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{action.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How Attendance Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="text-sm font-medium">
                  Select {classLabel} &amp; Date
                </p>
                <p className="text-xs text-muted-foreground">
                  Choose the {classLabel.toLowerCase()} and date for attendance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Mark Each Student</p>
                <p className="text-xs text-muted-foreground">
                  Set status as Present, Absent, Late, or Leave
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Save &amp; Review</p>
                <p className="text-xs text-muted-foreground">
                  Submit and view attendance history anytime
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                "Daily Tracking",
                "QR Code Check-in",
                "Subject-wise Records",
                "Teacher Attendance",
                "Export to CSV/PDF",
                "Analytics & Reports",
                "Leave Integration",
                "Bulk Operations",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
