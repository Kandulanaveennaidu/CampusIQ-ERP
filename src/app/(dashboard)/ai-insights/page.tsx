"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  Brain,
  Activity,
  Shield,
  Eye,
  RefreshCw,
  Download,
  Search,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RiskStudent {
  student_id: string;
  name: string;
  rollNumber: string;
  class_name: string;
  attendanceRate: number;
  lateRate: number;
  absentRate: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
}

interface InsightsData {
  summary: {
    totalStudents: number;
    avgAttendance: number;
    riskDistribution: Record<string, number>;
    period: number;
  };
  students: RiskStudent[];
  dailyTrends: {
    date: string;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
  }[];
  anomalies: { date: string; attendanceRate: number }[];
  recommendations: string[];
}

const RISK_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

export default function AIInsightsPage() {
  const { data: session } = useSession();
  const { canView: _canView } = usePermissions("ai_insights");
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [className, setClassName] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period: String(period) });
      if (className) params.set("class", className);
      const res = await fetch(`/api/ai-insights?${params}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period, className]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        No insights data available.
      </div>
    );
  }

  const filteredStudents = data.students.filter((s) => {
    if (filterRisk !== "all" && s.riskLevel !== filterRisk) return false;
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !s.rollNumber.includes(search)
    )
      return false;
    return true;
  });

  const riskPieData = Object.entries(data.summary.riskDistribution).map(
    ([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      value: v,
      color: RISK_COLORS[k as keyof typeof RISK_COLORS],
    }),
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="h-7 w-7 text-indigo-600" />
            AI Attendance Insights
          </h1>
          <p className="text-gray-500 mt-1">
            ML-powered dropout risk prediction & attendance anomaly detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <option value={7}>Last 7 days</option>
            <option value={15}>Last 15 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <input
            type="text"
            placeholder="Class (e.g. 10A)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-32 dark:bg-gray-800 dark:border-gray-700"
          />
          <button
            onClick={fetchInsights}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Analyze
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold">{data.summary.totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-lg ${data.summary.avgAttendance >= 80 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}
            >
              {data.summary.avgAttendance >= 80 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Attendance</p>
              <p className="text-2xl font-bold">
                {data.summary.avgAttendance}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">At-Risk Students</p>
              <p className="text-2xl font-bold text-red-600">
                {(data.summary.riskDistribution.critical || 0) +
                  (data.summary.riskDistribution.high || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Anomalous Days</p>
              <p className="text-2xl font-bold">{data.anomalies.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="attendanceRate"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.2}
                name="Attendance %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={riskPieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {riskPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
        <h3 className="font-semibold mb-4">Daily Breakdown</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.dailyTrends.slice(-14)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="presentCount"
              fill="#22c55e"
              name="Present"
              stackId="a"
            />
            <Bar dataKey="lateCount" fill="#f59e0b" name="Late" stackId="a" />
            <Bar
              dataKey="absentCount"
              fill="#ef4444"
              name="Absent"
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600" /> AI Recommendations
          </h3>
          <ul className="space-y-2">
            {data.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Student Risk Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
        <div className="p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="font-semibold">Student Risk Analysis</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border rounded-lg px-3 py-2 text-sm w-48 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Risks</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left p-3 font-medium">Student</th>
                <th className="text-left p-3 font-medium">Class</th>
                <th className="text-center p-3 font-medium">Attendance</th>
                <th className="text-center p-3 font-medium">Late %</th>
                <th className="text-center p-3 font-medium">Risk Score</th>
                <th className="text-center p-3 font-medium">Risk Level</th>
                <th className="text-center p-3 font-medium">Days</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.slice(0, 50).map((s) => (
                <tr
                  key={s.student_id}
                  className="border-t hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <td className="p-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">
                      Roll: {s.rollNumber}
                    </div>
                  </td>
                  <td className="p-3">{s.class_name}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`font-semibold ${s.attendanceRate >= 80 ? "text-green-600" : s.attendanceRate >= 60 ? "text-yellow-600" : "text-red-600"}`}
                    >
                      {s.attendanceRate}%
                    </span>
                  </td>
                  <td className="p-3 text-center">{s.lateRate}%</td>
                  <td className="p-3 text-center">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{
                          width: `${s.riskScore}%`,
                          backgroundColor: RISK_COLORS[s.riskLevel],
                        }}
                      />
                    </div>
                    <span className="text-xs">{s.riskScore}/100</span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        s.riskLevel === "critical"
                          ? "bg-red-100 text-red-700"
                          : s.riskLevel === "high"
                            ? "bg-orange-100 text-orange-700"
                            : s.riskLevel === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                      }`}
                    >
                      {s.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-center text-xs">
                    <span className="text-green-600">{s.presentDays}P</span> /
                    <span className="text-red-600"> {s.absentDays}A</span> /
                    <span className="text-yellow-600"> {s.lateDays}L</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="text-center p-8 text-gray-500">
              No students match the filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
