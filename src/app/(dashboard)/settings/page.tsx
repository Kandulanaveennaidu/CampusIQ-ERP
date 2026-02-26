"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, School, Bell, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface SchoolInfo {
  school_id: string;
  school_name: string;
  address: string;
  phone: string;
  email: string;
  admin_email: string;
  plan: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { canEdit } = usePermissions("settings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({
    attendance_time_start: "09:00",
    attendance_time_end: "10:00",
    late_threshold_minutes: "15",
    working_days: "Mon,Tue,Wed,Thu,Fri,Sat",
    notification_enabled: "true",
    low_attendance_threshold: "75",
    academic_year: "2025-2026",
    sms_notifications: "false",
    email_notifications: "true",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const result = await response.json();
          if (result.school) setSchool(result.school);
          if (result.settings) {
            setSettings((prev) => ({ ...prev, ...result.settings }));
          }
        }
      } catch {
        console.error("Failed to fetch settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        showSuccess(
          "Settings Saved",
          "Your settings have been updated successfully.",
        );
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      showError("Error", "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const isAdmin = session?.user?.role === "admin" || canEdit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your institution settings and preferences
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        )}
      </div>

      {/* Institution Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-blue-600" />
            <CardTitle>Institution Information</CardTitle>
          </div>
          <CardDescription>
            Your institution&apos;s basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Institution ID</Label>
              <Input value={school?.school_id || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Institution Name</Label>
              <Input value={school?.school_name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <Input value={school?.admin_email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={school?.phone || ""} disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input value={school?.address || ""} disabled />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact support to update institution information
          </p>
        </CardContent>
      </Card>

      {/* Attendance Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <CardTitle>Attendance Settings</CardTitle>
          </div>
          <CardDescription>
            Configure attendance timing and rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Attendance Start Time</Label>
              <Input
                type="time"
                value={settings.attendance_time_start}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    attendance_time_start: e.target.value,
                  })
                }
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Attendance End Time</Label>
              <Input
                type="time"
                value={settings.attendance_time_end}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    attendance_time_end: e.target.value,
                  })
                }
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Late Threshold (minutes)</Label>
              <Input
                type="number"
                value={settings.late_threshold_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    late_threshold_minutes: e.target.value,
                  })
                }
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Low Attendance Alert (%)</Label>
              <Input
                type="number"
                value={settings.low_attendance_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    low_attendance_threshold: e.target.value,
                  })
                }
                disabled={!isAdmin}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <CardTitle>Academic Settings</CardTitle>
          </div>
          <CardDescription>
            Configure academic year and working days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select
                value={settings.academic_year}
                onValueChange={(v) =>
                  setSettings({ ...settings, academic_year: v })
                }
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2025-2026">2025-2026</SelectItem>
                  <SelectItem value="2026-2027">2026-2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Working Days</Label>
              <Input
                value={settings.working_days}
                onChange={(e) =>
                  setSettings({ ...settings, working_days: e.target.value })
                }
                placeholder="Mon,Tue,Wed,Thu,Fri,Sat"
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Comma separated: Mon,Tue,Wed,Thu,Fri,Sat
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>In-App Notifications</Label>
              <Select
                value={settings.notification_enabled}
                onValueChange={(v) =>
                  setSettings({ ...settings, notification_enabled: v })
                }
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email Notifications</Label>
              <Select
                value={settings.email_notifications}
                onValueChange={(v) =>
                  setSettings({ ...settings, email_notifications: v })
                }
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
