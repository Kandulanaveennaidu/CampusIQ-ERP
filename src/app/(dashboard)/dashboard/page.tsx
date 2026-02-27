"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  CalendarCheck,
  UserPlus,
  AlertTriangle,
  CreditCard,
  BusFront,
  Library,
  BedDouble,
  PenTool,
  BookOpen,
  DollarSign,
  Briefcase,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardData {
  stats: {
    total: number;
    marked: number;
    unmarked: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
  };
  trend: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
  }>;
  data: Array<{
    student_id: string;
    name: string;
    roll_number: string;
    class_name: string;
    status: string | null;
  }>;
}

interface AttendanceStats {
  weeklyTrend: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    percentage: number;
  }>;
  todayDistribution: {
    present: number;
    absent: number;
    late: number;
    leave: number;
  };
  classWise: Array<{
    className: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    totalStudents: number;
    percentage: number;
  }>;
  monthlyOverview: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
    total: number;
  }>;
}

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6"];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const attendancePerms = usePermissions("attendance");
  const studentPerms = usePermissions("students");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartsData, setChartsData] = useState<AttendanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (status !== "authenticated") return;

      try {
        const [response, statsResponse] = await Promise.all([
          fetch("/api/attendance/today"),
          fetch("/api/attendance/stats"),
        ]);

        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          const errData = await response.json();
          setError(errData.error || "Failed to fetch data");
        }

        if (statsResponse.ok) {
          const statsResult = await statsResponse.json();
          setChartsData(statsResult);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-red-600">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const stats = data?.stats || {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    marked: 0,
  };

  const presentPercentage =
    stats.marked > 0 ? Math.round((stats.present / stats.marked) * 100) : 0;

  const statCards = [
    {
      title: "Total Students",
      value: stats.total,
      icon: Users,
      color: "bg-blue-500/10",
      iconColor: "text-blue-500",
      textColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-l-blue-500",
    },
    {
      title: "Today's Present",
      value: `${presentPercentage}%`,
      subtitle: `${stats.present} students`,
      icon: CheckCircle,
      color: "bg-green-500/10",
      iconColor: "text-green-500",
      textColor: "text-green-600 dark:text-green-400",
      borderColor: "border-l-green-500",
    },
    {
      title: "Absent Count",
      value: stats.absent,
      icon: XCircle,
      color: "bg-red-500/10",
      iconColor: "text-red-500",
      textColor: "text-red-600 dark:text-red-400",
      borderColor: "border-l-red-500",
    },
    {
      title: "Late Count",
      value: stats.late,
      icon: Clock,
      color: "bg-amber-500/10",
      iconColor: "text-amber-500",
      textColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-l-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of attendance for {session?.user?.school_id}
          </p>
        </div>
        <div className="flex gap-2">
          {attendancePerms.canAdd && (
            <Link href="/attendance/mark">
              <Button>
                <CalendarCheck className="mr-2 h-4 w-4" />
                Mark Attendance
              </Button>
            </Link>
          )}
          {studentPerms.canAdd && (
            <Link href="/students">
              <Button variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className={`border-l-4 ${stat.borderColor}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${stat.textColor}`}>
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Last 7 Days Trend</CardTitle>
            <CardDescription>Daily attendance statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#22c55e" name="Present" />
                  <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                  <Bar dataKey="late" fill="#f59e0b" name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Today&apos;s attendance status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data || []).slice(0, 8).map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">
                      {student.roll_number}
                    </TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.class_name}</TableCell>
                    <TableCell>
                      {student.status ? (
                        <Badge
                          variant={
                            student.status === "present"
                              ? "present"
                              : student.status === "absent"
                                ? "absent"
                                : student.status === "late"
                                  ? "late"
                                  : "leave"
                          }
                        >
                          {student.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Marked</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Weekly Attendance Trend - Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
            <CardDescription>
              Attendance percentage over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartsData?.weeklyTrend || []}>
                  <defs>
                    <linearGradient
                      id="colorPresent"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorAbsent"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#f3f4f6",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorPresent)"
                    name="Present"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorAbsent)"
                    name="Absent"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorLate)"
                    name="Late"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Distribution - Pie/Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Attendance Distribution</CardTitle>
            <CardDescription>
              Present, absent, late &amp; leave breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Present",
                        value: chartsData?.todayDistribution?.present || 0,
                      },
                      {
                        name: "Absent",
                        value: chartsData?.todayDistribution?.absent || 0,
                      },
                      {
                        name: "Late",
                        value: chartsData?.todayDistribution?.late || 0,
                      },
                      {
                        name: "Leave",
                        value: chartsData?.todayDistribution?.leave || 0,
                      },
                    ].filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {[
                      {
                        name: "Present",
                        value: chartsData?.todayDistribution?.present || 0,
                      },
                      {
                        name: "Absent",
                        value: chartsData?.todayDistribution?.absent || 0,
                      },
                      {
                        name: "Late",
                        value: chartsData?.todayDistribution?.late || 0,
                      },
                      {
                        name: "Leave",
                        value: chartsData?.todayDistribution?.leave || 0,
                      },
                    ]
                      .filter((d) => d.value > 0)
                      .map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#f3f4f6",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Class-wise Attendance - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Class-wise Attendance</CardTitle>
            <CardDescription>
              Attendance percentage per class today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData?.classWise || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    unit="%"
                  />
                  <YAxis
                    dataKey="className"
                    type="category"
                    width={80}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#f3f4f6",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name,
                    ]}
                  />
                  <Bar
                    dataKey="percentage"
                    fill="#3b82f6"
                    name="Attendance %"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Overview - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
            <CardDescription>
              Attendance stats over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData?.monthlyOverview || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#f3f4f6",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="present"
                    fill="#22c55e"
                    name="Present"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="absent"
                    fill="#ef4444"
                    name="Absent"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="late"
                    fill="#f59e0b"
                    name="Late"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Modules */}
      {session?.user?.role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Navigate to key modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {[
                {
                  name: "Fees",
                  href: "/fees",
                  icon: CreditCard,
                  color:
                    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                },
                {
                  name: "Exams",
                  href: "/exams",
                  icon: PenTool,
                  color:
                    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                },
                {
                  name: "Salary",
                  href: "/salary",
                  icon: DollarSign,
                  color:
                    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                },
                {
                  name: "Transport",
                  href: "/transport",
                  icon: BusFront,
                  color:
                    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                },
                {
                  name: "Library",
                  href: "/library",
                  icon: Library,
                  color:
                    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
                },
                {
                  name: "Hostel",
                  href: "/hostel",
                  icon: BedDouble,
                  color:
                    "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
                },
                {
                  name: "Academics",
                  href: "/departments",
                  icon: BookOpen,
                  color:
                    "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
                },
                {
                  name: "Workload",
                  href: "/faculty-workload",
                  icon: Briefcase,
                  color:
                    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                },
              ].map((mod) => (
                <Link key={mod.name} href={mod.href}>
                  <div
                    className={`flex flex-col items-center gap-2 rounded-lg p-4 transition-all hover:scale-105 ${mod.color}`}
                  >
                    <mod.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{mod.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Attendance Alert */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Attention Required</CardTitle>
          </div>
          <CardDescription className="text-amber-700">
            Students with less than 75% attendance this month need attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700">
            Run the monthly report to identify students with low attendance and
            take necessary action.
          </p>
          <Link href="/reports">
            <Button variant="warning" size="sm" className="mt-4">
              View Reports
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
