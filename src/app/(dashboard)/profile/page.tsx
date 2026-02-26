"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Calendar,
  Shield,
  Save,
  Loader2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  subject?: string;
  classes?: string;
  role: string;
  plan?: string;
  joining_date?: string;
  created_at?: string;
  status?: string;
}

export default function ProfilePage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _session } = useSession();
  const { canEdit } = usePermissions("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    subject: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const result = await res.json();
          setProfile(result.data);
          setFormData({
            name: result.data.name || "",
            phone: result.data.phone || "",
            address: result.data.address || "",
            subject: result.data.subject || "",
          });
        }
      } catch {
        console.error("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const result = await res.json();
        setProfile({ ...profile, ...result.data });
        showSuccess("Saved", "Profile updated successfully");
      } else {
        throw new Error("Failed");
      }
    } catch {
      showError("Error", "Failed to update profile");
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

  if (!profile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-500">Profile not found</p>
      </div>
    );
  }

  const isAdmin = profile.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-slate-500">Manage your account information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <User className="h-10 w-10" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">{profile.name}</h2>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <Badge className="mt-2" variant={isAdmin ? "default" : "secondary"}>
              <Shield className="mr-1 h-3 w-3" />
              {isAdmin ? "Administrator" : "Teacher"}
            </Badge>
            {profile.plan && (
              <Badge className="mt-2" variant="outline">
                {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}{" "}
                Plan
              </Badge>
            )}
            <div className="mt-4 w-full border-t pt-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.address}</span>
                  </div>
                )}
                {profile.subject && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen className="h-4 w-4" />
                    <span>{profile.subject}</span>
                  </div>
                )}
                {(profile.joining_date || profile.created_at) && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined{" "}
                      {new Date(
                        profile.joining_date || profile.created_at || "",
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile.email} disabled className="bg-slate-50" />
                <p className="text-xs text-slate-400">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                />
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Institution address"
                  />
                </div>
              )}

              {!isAdmin && (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="Subject specialty"
                  />
                </div>
              )}

              {!isAdmin && profile.classes && (
                <div className="space-y-2">
                  <Label>Assigned Classes</Label>
                  <Input
                    value={profile.classes}
                    disabled
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-slate-400">
                    Class assignments are managed by admin
                  </p>
                </div>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Account ID</p>
              <p className="mt-1 font-mono text-sm">{profile.id}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Role</p>
              <p className="mt-1 text-sm capitalize">{profile.role}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Status</p>
              <p className="mt-1 text-sm capitalize">
                {profile.status || "Active"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
