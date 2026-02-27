"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError, confirmDelete } from "@/lib/alerts";
import { usePermissions } from "@/hooks/use-permissions";
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  GraduationCap,
  Globe,
  MapPin,
} from "lucide-react";

interface Holiday {
  holiday_id: string;
  date: string;
  name: string;
  type: string;
  description: string;
  created_at: string;
}

const HOLIDAY_TYPES = [
  {
    value: "national",
    label: "National Holiday",
    icon: Globe,
    color: "bg-red-100 text-red-800",
  },
  {
    value: "regional",
    label: "Regional Holiday",
    icon: MapPin,
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "school",
    label: "Institution Holiday",
    icon: GraduationCap,
    color: "bg-green-100 text-green-800",
  },
  {
    value: "exam",
    label: "Exam Day",
    icon: CalendarDays,
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "event",
    label: "Institution Event",
    icon: PartyPopper,
    color: "bg-orange-100 text-orange-800",
  },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HolidayCalendarPage() {
  useSession();
  const { canAdd, canEdit, canDelete } = usePermissions("holidays");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "",
    type: "school",
    description: "",
  });

  const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/holidays?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.data || []);
      }
    } catch {
      showError("Error", "Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleSave = async () => {
    if (!form.date || !form.name || !form.type) {
      showError("Error", "Date, name, and type are required");
      return;
    }
    setSubmitting(true);
    try {
      const method = editingHoliday ? "PUT" : "POST";
      const body = editingHoliday
        ? { holiday_id: editingHoliday.holiday_id, ...form }
        : form;

      const res = await fetch("/api/holidays", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(
          "Success",
          editingHoliday ? "Holiday updated" : "Holiday added",
        );
        setDialogOpen(false);
        setEditingHoliday(null);
        setForm({
          date: new Date().toISOString().split("T")[0],
          name: "",
          type: "school",
          description: "",
        });
        fetchHolidays();
      } else {
        showError("Error", data.error);
      }
    } catch {
      showError("Error", "Failed to save holiday");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete("this holiday");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Success", "Holiday deleted");
        fetchHolidays();
      }
    } catch {
      showError("Error", "Failed to delete");
    }
  };

  const openEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setForm({
      date: h.date,
      name: h.name,
      type: h.type,
      description: h.description,
    });
    setDialogOpen(true);
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  // Calendar generation
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstDayOfWeek = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getHolidaysForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return holidays.filter((h) => h.date === dateStr);
  };

  const getTypeColor = (type: string) => {
    return (
      HOLIDAY_TYPES.find((t) => t.value === type)?.color ||
      "bg-muted text-foreground"
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Holiday Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            View & manage institution holidays and events
          </p>
        </div>
        {canAdd && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingHoliday(null);
                setForm({
                  date: new Date().toISOString().split("T")[0],
                  name: "",
                  type: "school",
                  description: "",
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Holiday Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Diwali, Sports Day"
                  />
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOLIDAY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Optional description"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingHoliday
                      ? "Update Holiday"
                      : "Add Holiday"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {HOLIDAY_TYPES.map((ht) => {
          const count = holidays.filter((h) => h.type === ht.value).length;
          return (
            <Card key={ht.value}>
              <CardContent className="p-3 text-center">
                <ht.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{ht.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle>
                {MONTH_NAMES[currentMonth.getMonth()]}{" "}
                {currentMonth.getFullYear()}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="h-20" />;
                }
                const dayHolidays = getHolidaysForDay(day);
                const today = isToday(day);
                return (
                  <div
                    key={day}
                    className={`h-20 border rounded-lg p-1 text-sm ${
                      today
                        ? "border-primary bg-primary/5"
                        : "border-gray-100 hover:bg-muted/50"
                    } ${dayHolidays.length > 0 ? "bg-amber-50/50" : ""}`}
                  >
                    <div
                      className={`text-xs font-medium mb-0.5 ${
                        today ? "text-primary font-bold" : "text-foreground"
                      }`}
                    >
                      {day}
                    </div>
                    {dayHolidays.slice(0, 2).map((h) => (
                      <div
                        key={h.holiday_id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate mb-0.5 cursor-pointer ${getTypeColor(h.type)}`}
                        title={`${h.name} - ${h.description || h.type}`}
                        onClick={() => canEdit && openEdit(h)}
                      >
                        {h.name}
                      </div>
                    ))}
                    {dayHolidays.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayHolidays.length - 2} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Holiday List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Holidays in {MONTH_NAMES[currentMonth.getMonth()]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {holidays.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No holidays this month</p>
              </div>
            )}
            {holidays.map((h) => (
              <div
                key={h.holiday_id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{h.name}</span>
                    <Badge className={`${getTypeColor(h.type)} text-[10px]`}>
                      {h.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(h.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </p>
                  {h.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {h.description}
                    </p>
                  )}
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex gap-1 ml-2">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(h)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(h.holiday_id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-muted-foreground">Legend:</span>
            {HOLIDAY_TYPES.map((ht) => (
              <div key={ht.value} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${ht.color.split(" ")[0]}`} />
                <span className="text-xs text-muted-foreground">{ht.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
