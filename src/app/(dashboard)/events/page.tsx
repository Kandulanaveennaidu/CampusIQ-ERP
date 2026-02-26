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
  GraduationCap,
  Trophy,
  Music,
  Users,
  Sun,
  ClipboardList,
  MoreHorizontal,
  MapPin,
  Clock,
  Filter,
} from "lucide-react";

interface EventItem {
  _id: string;
  title: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string;
  organizer: { _id: string; name: string; email: string } | null;
  participants: string[];
  color: string;
  isRecurring: boolean;
  recurringPattern: string;
  status: string;
  createdBy: { _id: string; name: string } | null;
  createdAt: string;
}

const EVENT_TYPES = [
  {
    value: "academic",
    label: "Academic",
    icon: GraduationCap,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  {
    value: "sports",
    label: "Sports",
    icon: Trophy,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  {
    value: "cultural",
    label: "Cultural",
    icon: Music,
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  {
    value: "meeting",
    label: "Meeting",
    icon: Users,
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  {
    value: "holiday",
    label: "Holiday",
    icon: Sun,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  {
    value: "exam",
    label: "Exam",
    icon: ClipboardList,
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  {
    value: "other",
    label: "Other",
    icon: MoreHorizontal,
    color: "bg-muted text-foreground dark:bg-card dark:text-gray-200",
  },
];

const EVENT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#14b8a6",
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

const defaultForm = {
  title: "",
  description: "",
  type: "other",
  startDate: "",
  endDate: "",
  allDay: true,
  location: "",
  color: "#3b82f6",
  status: "scheduled",
};

export default function EventCalendarPage() {
  useSession();
  const { canAdd, canEdit, canDelete } = usePermissions("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState(defaultForm);

  const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const typeParam = filterType !== "all" ? `&type=${filterType}` : "";
      const res = await fetch(`/api/events?month=${monthStr}${typeParam}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data || []);
      }
    } catch {
      showError("Error", "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [monthStr, filterType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSave = async () => {
    if (!form.title || !form.startDate || !form.endDate) {
      showError("Error", "Title, start date, and end date are required");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      showError("Error", "End date must be after start date");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingEvent
        ? `/api/events/${editingEvent._id}`
        : "/api/events";
      const method = editingEvent ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(
          "Success",
          editingEvent ? "Event updated" : "Event created",
        );
        setDialogOpen(false);
        setEditingEvent(null);
        setForm(defaultForm);
        fetchEvents();
      } else {
        showError("Error", data.error);
      }
    } catch {
      showError("Error", "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete("this event");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Success", "Event deleted");
        setDetailOpen(false);
        setSelectedEvent(null);
        fetchEvents();
      } else {
        const data = await res.json();
        showError("Error", data.error || "Failed to delete");
      }
    } catch {
      showError("Error", "Failed to delete event");
    }
  };

  const openCreate = (dateStr?: string) => {
    setEditingEvent(null);
    setForm({
      ...defaultForm,
      startDate: dateStr || new Date().toISOString().split("T")[0],
      endDate: dateStr || new Date().toISOString().split("T")[0],
    });
    setDialogOpen(true);
  };

  const openEdit = (e: EventItem) => {
    setEditingEvent(e);
    setForm({
      title: e.title,
      description: e.description,
      type: e.type,
      startDate: new Date(e.startDate).toISOString().split("T")[0],
      endDate: new Date(e.endDate).toISOString().split("T")[0],
      allDay: e.allDay,
      location: e.location,
      color: e.color,
      status: e.status,
    });
    setDetailOpen(false);
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const openDetail = (e: EventItem) => {
    setSelectedEvent(e);
    setDetailOpen(true);
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

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dateObj = new Date(dateStr + "T00:00:00");
    return events.filter((e) => {
      const start = new Date(
        new Date(e.startDate).toISOString().split("T")[0] + "T00:00:00",
      );
      const end = new Date(
        new Date(e.endDate).toISOString().split("T")[0] + "T00:00:00",
      );
      return dateObj >= start && dateObj <= end;
    });
  };

  const getTypeInfo = (type: string) => {
    return (
      EVENT_TYPES.find((t) => t.value === type) ||
      EVENT_TYPES[EVENT_TYPES.length - 1]
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
          <h1 className="text-2xl font-bold text-foreground">Event Calendar</h1>
          <p className="text-muted-foreground dark:text-muted-foreground mt-1">
            Manage institution events, activities & schedules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canAdd && (
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {EVENT_TYPES.map((et) => {
          const count = events.filter((e) => e.type === et.value).length;
          return (
            <Card
              key={et.value}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() =>
                setFilterType(filterType === et.value ? "all" : et.value)
              }
            >
              <CardContent className="p-3 text-center">
                <et.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground dark:text-muted-foreground" />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  {et.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Calendar */}
      <Card>
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
                className="text-center text-xs font-semibold text-muted-foreground dark:text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="h-24 md:h-28" />;
              }
              const dayEvents = getEventsForDay(day);
              const today = isToday(day);
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              return (
                <div
                  key={day}
                  className={`h-24 md:h-28 border rounded-lg p-1 text-sm cursor-pointer transition-colors ${
                    today
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-gray-100 dark:border-border hover:bg-muted/50 dark:hover:bg-card"
                  } ${dayEvents.length > 0 ? "bg-blue-50/30 dark:bg-blue-950/20" : ""}`}
                  onClick={() => canAdd && openCreate(dateStr)}
                >
                  <div
                    className={`text-xs font-medium mb-0.5 ${today ? "text-primary font-bold" : "text-foreground dark:text-foreground"}`}
                  >
                    {day}
                  </div>
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e._id}
                      className="text-[10px] px-1 py-0.5 rounded truncate mb-0.5 cursor-pointer text-white font-medium"
                      style={{ backgroundColor: e.color || "#3b82f6" }}
                      title={e.title}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        openDetail(e);
                      }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Events in {MONTH_NAMES[currentMonth.getMonth()]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No events this month</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => {
                const typeInfo = getTypeInfo(e.type);
                return (
                  <div
                    key={e._id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 dark:hover:bg-card dark:border-border cursor-pointer transition-colors"
                    onClick={() => openDetail(e)}
                  >
                    <div
                      className="w-1 h-full min-h-[40px] rounded-full"
                      style={{ backgroundColor: e.color || "#3b82f6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate text-foreground">
                          {e.title}
                        </span>
                        <Badge
                          className={`${typeInfo.color} text-[10px] shrink-0`}
                        >
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(e.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {e.startDate !== e.endDate && (
                          <>
                            {" "}
                            -{" "}
                            {new Date(e.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </>
                        )}
                      </div>
                      {e.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {e.location}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
              Legend:
            </span>
            {EVENT_TYPES.map((et) => (
              <div key={et.value} className="flex items-center gap-1.5">
                <et.icon className="h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground" />
                <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                  {et.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedEvent?.color || "#3b82f6" }}
              />
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={getTypeInfo(selectedEvent.type).color}>
                  {getTypeInfo(selectedEvent.type).label}
                </Badge>
                <Badge
                  variant={
                    selectedEvent.status === "scheduled"
                      ? "outline"
                      : selectedEvent.status === "cancelled"
                        ? "destructive"
                        : "default"
                  }
                >
                  {selectedEvent.status}
                </Badge>
              </div>
              {selectedEvent.description && (
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  {selectedEvent.description}
                </p>
              )}
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {new Date(selectedEvent.startDate).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                  {selectedEvent.startDate !== selectedEvent.endDate && (
                    <>
                      {" "}
                      —{" "}
                      {new Date(selectedEvent.endDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </>
                  )}
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedEvent.location}
                  </div>
                )}
              </div>
              {(canEdit || canDelete) && (
                <div className="flex gap-2 pt-2">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(selectedEvent)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(selectedEvent._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingEvent(null);
            setForm(defaultForm);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Add Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Event description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Main Auditorium"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label>All Day</Label>
              <button
                type="button"
                onClick={() => setForm({ ...form, allDay: !form.allDay })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.allDay ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${form.allDay ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : editingEvent
                  ? "Update Event"
                  : "Create Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
