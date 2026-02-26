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
import { useClasses } from "@/hooks/use-classes";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Filter,
  Calendar,
  AlertTriangle,
  Bell,
  FileText,
  Eye,
} from "lucide-react";

interface CircularItem {
  _id: string;
  title: string;
  content: string;
  type: "circular" | "announcement" | "notice";
  priority: "low" | "medium" | "high" | "urgent";
  targetAudience: string[];
  attachments: { name: string; url: string; type: string }[];
  publishDate: string;
  expiryDate: string | null;
  isPublished: boolean;
  createdBy: { _id: string; name: string; email: string } | null;
  createdAt: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700",
  medium:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  circular: FileText,
  announcement: Megaphone,
  notice: Bell,
};

const STATIC_AUDIENCES = ["all", "teachers", "students", "parents"];

const defaultForm = {
  title: "",
  content: "",
  type: "circular" as const,
  priority: "medium" as const,
  targetAudience: ["all"],
  publishDate: new Date().toISOString().split("T")[0],
  expiryDate: "",
  isPublished: true,
};

export default function CircularsPage() {
  useSession();
  const { canAdd, canEdit, canDelete } = usePermissions("circulars");
  const { classes } = useClasses(); // classLabel available if needed
  const AUDIENCE_OPTIONS = [...STATIC_AUDIENCES, ...classes];
  const [circulars, setCirculars] = useState<CircularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<CircularItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const fetchCirculars = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      const res = await fetch(`/api/circulars?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setCirculars(json.data || []);
      } else {
        showError("Error", json.error || "Failed to load circulars");
      }
    } catch {
      showError("Error", "Failed to load circulars");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterPriority]);

  useEffect(() => {
    fetchCirculars();
  }, [fetchCirculars]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (c: CircularItem) => {
    setEditingId(c._id);
    setForm({
      title: c.title,
      content: c.content,
      type: c.type,
      priority: c.priority,
      targetAudience: c.targetAudience,
      publishDate: c.publishDate
        ? new Date(c.publishDate).toISOString().split("T")[0]
        : "",
      expiryDate: c.expiryDate
        ? new Date(c.expiryDate).toISOString().split("T")[0]
        : "",
      isPublished: c.isPublished,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showError("Validation", "Title and content are required");
      return;
    }

    try {
      const url = editingId ? `/api/circulars/${editingId}` : "/api/circulars";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiryDate: form.expiryDate || null,
        }),
      });
      const json = await res.json();

      if (res.ok) {
        showSuccess(
          editingId ? "Updated!" : "Created!",
          json.message || "Circular saved successfully",
        );
        setDialogOpen(false);
        fetchCirculars();
      } else {
        showError("Error", json.error || "Failed to save circular");
      }
    } catch {
      showError("Error", "Failed to save circular");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete(
      "Delete Circular",
      "This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/circulars/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        showSuccess("Deleted!", json.message || "Circular deleted");
        fetchCirculars();
      } else {
        showError("Error", json.error || "Failed to delete circular");
      }
    } catch {
      showError("Error", "Failed to delete circular");
    }
  };

  const toggleAudience = (value: string) => {
    setForm((prev) => {
      const current = prev.targetAudience;
      if (current.includes(value)) {
        return {
          ...prev,
          targetAudience: current.filter((a) => a !== value),
        };
      }
      return { ...prev, targetAudience: [...current, value] };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="h-7 w-7" />
            Circulars & Announcements
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage circulars, announcements, and notices
          </p>
        </div>
        {canAdd && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Circular
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filters:
              </span>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="notice">Notice</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Circulars Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : circulars.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No circulars found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {canAdd
                ? "Create your first circular to get started."
                : "No circulars available at the moment."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {circulars.map((c) => {
            const TypeIcon = TYPE_ICONS[c.type] || FileText;
            return (
              <Card
                key={c._id}
                className="hover:shadow-lg transition-shadow cursor-pointer border dark:border-gray-700"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TypeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <CardTitle className="text-base leading-tight truncate">
                        {c.title}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${PRIORITY_STYLES[c.priority]}`}
                    >
                      {c.priority === "urgent" && (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {c.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {c.content}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {c.targetAudience.map((a) => (
                      <Badge key={a} variant="secondary" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.publishDate).toLocaleDateString()}
                    </span>
                    <span>{c.createdBy?.name || "System"}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t dark:border-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewItem(c);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                        onClick={() => handleDelete(c._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewItem && TYPE_ICONS[viewItem.type]
                ? (() => {
                    const Icon = TYPE_ICONS[viewItem.type];
                    return <Icon className="h-5 w-5" />;
                  })()
                : null}
              {viewItem?.title}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={PRIORITY_STYLES[viewItem.priority]}
                >
                  {viewItem.priority}
                </Badge>
                <Badge variant="secondary">{viewItem.type}</Badge>
                {viewItem.targetAudience.map((a) => (
                  <Badge key={a} variant="outline">
                    {a}
                  </Badge>
                ))}
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{viewItem.content}</p>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-3 space-y-1">
                <p>
                  Published: {new Date(viewItem.publishDate).toLocaleString()}
                </p>
                {viewItem.expiryDate && (
                  <p>
                    Expires: {new Date(viewItem.expiryDate).toLocaleString()}
                  </p>
                )}
                <p>By: {viewItem.createdBy?.name || "System"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Circular" : "New Circular"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Enter circular title"
              />
            </div>

            <div>
              <Label>Content *</Label>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.content}
                onChange={(e) =>
                  setForm((p) => ({ ...p, content: e.target.value }))
                }
                placeholder="Enter circular content"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      type: v as "circular" | "announcement" | "notice",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circular">Circular</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="notice">Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      priority: v as "low" | "medium" | "high" | "urgent",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Publish Date</Label>
                <Input
                  type="date"
                  value={form.publishDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, publishDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expiryDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Target Audience</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AUDIENCE_OPTIONS.map((a) => (
                  <Badge
                    key={a}
                    variant={
                      form.targetAudience.includes(a) ? "default" : "outline"
                    }
                    className="cursor-pointer select-none"
                    onClick={() => toggleAudience(a)}
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingId ? "Update" : "Publish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
