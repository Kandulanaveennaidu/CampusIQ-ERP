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
import { showSuccess, showError, confirmAlert } from "@/lib/alerts";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Shield,
  Send,
  Flame,
  CloudRain,
  Lock,
  HeartPulse,
  Megaphone,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

interface EmergencyAlert {
  alert_id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  sent_by: string;
  sent_at: string;
  status: string;
}

const ALERT_TYPES = [
  { value: "fire", label: "Fire Emergency", icon: Flame },
  { value: "weather", label: "Weather Alert", icon: CloudRain },
  { value: "security", label: "Security Threat", icon: Lock },
  { value: "medical", label: "Medical Emergency", icon: HeartPulse },
  { value: "evacuation", label: "Evacuation Notice", icon: AlertTriangle },
  { value: "general", label: "General Alert", icon: Megaphone },
];

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  critical: {
    color: "text-red-700",
    bg: "bg-red-100 border-red-300",
    label: "CRITICAL",
  },
  high: {
    color: "text-orange-700",
    bg: "bg-orange-100 border-orange-300",
    label: "HIGH",
  },
  medium: {
    color: "text-yellow-700",
    bg: "bg-yellow-100 border-yellow-300",
    label: "MEDIUM",
  },
  low: {
    color: "text-blue-700",
    bg: "bg-blue-100 border-blue-300",
    label: "LOW",
  },
};

export default function EmergencyPage() {
  const { data: session } = useSession();
  const { canAdd, canEdit } = usePermissions("emergency");
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    type: "general",
    title: "",
    message: "",
    severity: "medium",
  });

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/emergency${params}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data || []);
        setStats(data.stats || { total: 0, active: 0, critical: 0 });
      }
    } catch {
      showError("Error", "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSend = async () => {
    if (!form.title || !form.message) {
      showError("Error", "Title and message are required");
      return;
    }

    if (form.severity === "critical") {
      const confirmed = await confirmAlert(
        "Send Critical Alert?",
        "This will notify everyone immediately.",
        "Yes, send alert",
        "warning",
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Alert Sent", "Emergency alert broadcast successfully");
        setDialogOpen(false);
        setForm({
          type: "general",
          title: "",
          message: "",
          severity: "medium",
        });
        fetchAlerts();
      } else {
        showError("Error", data.error);
      }
    } catch {
      showError("Error", "Failed to send alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const res = await fetch("/api/emergency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId, status: "resolved" }),
      });
      if (res.ok) {
        showSuccess("Success", "Alert resolved");
        fetchAlerts();
      }
    } catch {
      showError("Error", "Failed to resolve alert");
    }
  };

  const getAlertIcon = (type: string) => {
    const alertType = ALERT_TYPES.find((t) => t.value === type);
    if (alertType) {
      const Icon = alertType.icon;
      return <Icon className="h-5 w-5" />;
    }
    return <AlertTriangle className="h-5 w-5" />;
  };

  const isAdmin = session?.user?.role === "admin" || canAdd;

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
            Emergency Alerts
          </h1>
          <p className="text-gray-500 mt-1">
            Broadcast & manage emergency alerts
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Send className="h-4 w-4 mr-2" />
                Send Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Send Emergency Alert
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Alert Type *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severity *</Label>
                  <Select
                    value={form.severity}
                    onValueChange={(v) => setForm({ ...form, severity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">
                        🔴 Critical - Immediate danger
                      </SelectItem>
                      <SelectItem value="high">
                        🟠 High - Urgent action needed
                      </SelectItem>
                      <SelectItem value="medium">
                        🟡 Medium - Stay alert
                      </SelectItem>
                      <SelectItem value="low">
                        🔵 Low - Informational
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="e.g. Fire Drill at 2 PM"
                  />
                </div>
                <div>
                  <Label>Message *</Label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    placeholder="Detailed message for staff & students..."
                  />
                </div>

                {form.severity === "critical" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <strong>Warning:</strong> Critical alerts will immediately
                    notify all staff, teachers, and create a system-wide
                    notification.
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={submitting}
                >
                  {submitting ? "Sending..." : "🚨 Broadcast Alert"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active Critical Alert Banner */}
      {stats.critical > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-lg flex items-center gap-3 animate-pulse">
          <AlertTriangle className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-bold">
              {stats.critical} Active Critical Alert(s)
            </p>
            <p className="text-sm opacity-90">Immediate attention required</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.total - stats.active}
                </p>
                <p className="text-sm text-gray-500">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.critical}</p>
                <p className="text-sm text-gray-500">Critical Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "active", "resolved"].map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-4">
        {alerts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30 text-green-500" />
              <p className="text-gray-500 font-medium">No emergency alerts</p>
              <p className="text-sm text-gray-400 mt-1">
                All clear! No alerts to display.
              </p>
            </CardContent>
          </Card>
        )}

        {alerts.map((alert) => {
          const severity =
            SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
          return (
            <Card
              key={alert.alert_id}
              className={`border-l-4 ${alert.status === "active" ? severity.bg : "border-gray-200 opacity-75"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={severity.color}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {alert.title}
                        <Badge
                          className={
                            alert.status === "active"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {alert.status}
                        </Badge>
                        <Badge className={severity.bg + " " + severity.color}>
                          {severity.label}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {ALERT_TYPES.find((t) => t.value === alert.type)
                          ?.label || alert.type}
                      </p>
                    </div>
                  </div>
                  {canEdit && alert.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => handleResolve(alert.alert_id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Sent by: <strong>{alert.sent_by}</strong>
                  </span>
                  <span>
                    {alert.sent_at
                      ? new Date(alert.sent_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
