"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Calendar,
  Clock,
  Shuffle,
  Save,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface SlotData {
  period: number;
  subject: string;
  teacher: string;
  room: string;
}

interface TimetableResult {
  class_name: string;
  section?: string;
  academicYear?: string;
  periodsPerDay: number;
  workingDays: string[];
  timetable: Record<string, SlotData[]>;
  subjectDistribution: Record<string, Record<string, number>>;
  conflicts: string[];
  stats: {
    totalSlots: number;
    filledSlots: number;
    subjectsScheduled: number;
    utilization: number;
  };
}

const DAY_COLORS: Record<string, string> = {
  Monday: "bg-blue-50 dark:bg-blue-950",
  Tuesday: "bg-green-50 dark:bg-green-950",
  Wednesday: "bg-yellow-50 dark:bg-yellow-950",
  Thursday: "bg-purple-50 dark:bg-purple-950",
  Friday: "bg-pink-50 dark:bg-pink-950",
  Saturday: "bg-orange-50 dark:bg-orange-950",
};

const SUBJECT_COLORS = [
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
];

export default function TimetableGeneratorPage() {
  const { data: session } = useSession();
  const { canView: _canView } = usePermissions("timetable");
  const [result, setResult] = useState<TimetableResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [periodsPerDay, setPeriodsPerDay] = useState(8);

  const subjectColorMap = new Map<string, string>();
  let colorIdx = 0;
  function getSubjectColor(subject: string) {
    if (!subjectColorMap.has(subject)) {
      subjectColorMap.set(
        subject,
        SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length],
      );
      colorIdx++;
    }
    return subjectColorMap.get(subject)!;
  }

  const generate = useCallback(async () => {
    if (!className) return;
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/timetable-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_name: className,
          section,
          academicYear,
          periodsPerDay,
        }),
      });
      if (res.ok) setResult(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [className, section, academicYear, periodsPerDay]);

  const saveTimetable = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/timetable-generator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_name: result.class_name,
          section: result.section,
          academicYear: result.academicYear,
          timetable: result.timetable,
        }),
      });
      if (res.ok) setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <Shuffle className="h-7 w-7 text-indigo-600" />
            Smart Timetable Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered constraint-based auto-scheduling
          </p>
        </div>
      </div>

      {/* Config Panel */}
      <div className="bg-card rounded-xl p-6 shadow-sm border">
        <h3 className="font-semibold mb-4">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class *</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. 10"
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card dark:border-border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Section</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. A"
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card dark:border-border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2024-2025"
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card dark:border-border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Periods/Day
            </label>
            <select
              value={periodsPerDay}
              onChange={(e) => setPeriodsPerDay(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card dark:border-border"
            >
              {[6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n} periods
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={generate}
            disabled={!className || loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4" />
            )}
            {loading ? "Generating..." : "Generate Timetable"}
          </button>
          {result && (
            <>
              <button
                onClick={generate}
                className="border px-4 py-2 rounded-lg text-sm hover:bg-muted/50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Re-generate
              </button>
              <button
                onClick={saveTimetable}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? "Saved!" : "Save to DB"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {result.stats.utilization}%
              </p>
              <p className="text-xs text-muted-foreground">Utilization</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold">
                {result.stats.filledSlots}/{result.stats.totalSlots}
              </p>
              <p className="text-xs text-muted-foreground">Slots Filled</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold">
                {result.stats.subjectsScheduled}
              </p>
              <p className="text-xs text-muted-foreground">Subjects</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-sm border text-center">
              <p
                className={`text-2xl font-bold ${result.conflicts.length === 0 ? "text-green-600" : "text-red-600"}`}
              >
                {result.conflicts.length}
              </p>
              <p className="text-xs text-muted-foreground">Conflicts</p>
            </div>
          </div>

          {/* Conflicts */}
          {result.conflicts.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <h4 className="font-medium text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Conflicts
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-red-600">
                {result.conflicts.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Timetable Grid */}
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">
                Generated Timetable — Class {result.class_name}
                {result.section ? ` ${result.section}` : ""}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 dark:bg-card">
                    <th className="p-3 text-left font-medium w-24">Day</th>
                    {Array.from({ length: result.periodsPerDay }, (_, i) => (
                      <th key={i} className="p-3 text-center font-medium">
                        P{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.workingDays.map((day) => (
                    <tr
                      key={day}
                      className={`border-t ${DAY_COLORS[day] || ""}`}
                    >
                      <td className="p-3 font-medium">{day}</td>
                      {Array.from({ length: result.periodsPerDay }, (_, i) => {
                        const slot = result.timetable[day]?.find(
                          (s) => s.period === i + 1,
                        );
                        return (
                          <td key={i} className="p-2 text-center">
                            {slot ? (
                              <div
                                className={`rounded-lg p-2 ${getSubjectColor(slot.subject)}`}
                              >
                                <div className="font-medium text-xs">
                                  {slot.subject}
                                </div>
                                <div className="text-[10px] opacity-75">
                                  {slot.teacher}
                                </div>
                                <div className="text-[10px] opacity-60">
                                  {slot.room}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subject Distribution */}
          <div className="bg-card rounded-xl p-5 shadow-sm border">
            <h3 className="font-semibold mb-3">
              Subject Distribution (periods per day)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Subject</th>
                    {result.workingDays.map((d) => (
                      <th key={d} className="p-2 text-center">
                        {d.slice(0, 3)}
                      </th>
                    ))}
                    <th className="p-2 text-center font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.subjectDistribution).map(
                    ([sub, days]) => {
                      const total = Object.values(days).reduce(
                        (a, b) => a + b,
                        0,
                      );
                      return (
                        <tr key={sub} className="border-t">
                          <td className="p-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${getSubjectColor(sub)}`}
                            >
                              {sub}
                            </span>
                          </td>
                          {result.workingDays.map((d) => (
                            <td key={d} className="p-2 text-center">
                              {days[d] || 0}
                            </td>
                          ))}
                          <td className="p-2 text-center font-bold">{total}</td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
