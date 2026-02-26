"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserPlus,
  LogIn,
  LogOut,
  Search,
  Clock,
  Users,
  Loader2,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface Visitor {
  visitor_id: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_email: string;
  purpose: string;
  host_name: string;
  host_type: string;
  student_id: string;
  id_proof: string;
  check_in: string;
  check_out: string;
  badge_number: string;
  status: string;
  notes: string;
  created_at: string;
}

interface Stats {
  total_today: number;
  checked_in: number;
  checked_out: number;
  pre_registered: number;
}

const emptyForm = {
  visitor_name: "",
  visitor_phone: "",
  visitor_email: "",
  purpose: "",
  host_name: "",
  host_type: "teacher",
  student_id: "",
  id_proof: "",
  notes: "",
  pre_register: false,
};

export default function VisitorsPage() {
  const { canAdd, canEdit } = usePermissions("visitors");
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_today: 0,
    checked_in: 0,
    checked_out: 0,
    pre_registered: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchVisitors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/visitors?${params}`);
      if (res.ok) {
        const result = await res.json();
        setVisitors(result.data || []);
        setStats(result.stats || stats);
      }
    } catch {
      console.error("Failed to fetch visitors");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const result = await res.json();
        showSuccess(
          formData.pre_register ? "Pre-Registered" : "Checked In",
          `Badge: ${result.data.badge_number}`,
        );
        setShowDialog(false);
        setFormData(emptyForm);
        fetchVisitors();
      } else {
        throw new Error("Failed");
      }
    } catch {
      showError("Error", "Failed to register visitor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (
    visitorId: string,
    action: "check_in" | "check_out" | "cancel",
  ) => {
    try {
      const res = await fetch("/api/visitors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_id: visitorId, action }),
      });
      if (res.ok) {
        showSuccess(
          "Updated",
          `Visitor ${action.replace("_", " ")} successfully`,
        );
        fetchVisitors();
      }
    } catch {
      showError("Error", "Failed to update visitor");
    }
  };

  const filtered = visitors.filter(
    (v) =>
      (v.visitor_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.purpose || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.host_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.badge_number || "").toLowerCase().includes(search.toLowerCase()),
  );

  const statusColors: Record<string, string> = {
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-slate-100 text-slate-800",
    pre_registered: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Visitor Management
          </h1>
          <p className="text-slate-500">
            Track and manage all visitors to your institution
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Register Visitor
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_today}</p>
                <p className="text-xs text-slate-500">Today&apos;s Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <LogIn className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.checked_in}</p>
                <p className="text-xs text-slate-500">Currently Inside</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <LogOut className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.checked_out}</p>
                <p className="text-xs text-slate-500">Checked Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pre_registered}</p>
                <p className="text-xs text-slate-500">Pre-Registered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search visitors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="pre_registered">Pre-Registered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-slate-500">
              <p>No visitors found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Badge</TableHead>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.visitor_id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {v.badge_number}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{v.visitor_name}</p>
                          {v.visitor_phone && (
                            <p className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="h-3 w-3" />
                              {v.visitor_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {v.purpose}
                      </TableCell>
                      <TableCell>{v.host_name || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {v.check_in
                          ? new Date(v.check_in).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {v.check_out
                          ? new Date(v.check_out).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            statusColors[v.status] || "bg-slate-100"
                          }`}
                        >
                          {v.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {v.status === "pre_registered" && canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleAction(v.visitor_id, "check_in")
                              }
                            >
                              <LogIn className="mr-1 h-3 w-3" />
                              In
                            </Button>
                          )}
                          {v.status === "checked_in" && canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleAction(v.visitor_id, "check_out")
                              }
                            >
                              <LogOut className="mr-1 h-3 w-3" />
                              Out
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Visitor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visitor Name *</Label>
                <Input
                  value={formData.visitor_name}
                  onChange={(e) =>
                    setFormData({ ...formData, visitor_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.visitor_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, visitor_phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.visitor_email}
                  onChange={(e) =>
                    setFormData({ ...formData, visitor_email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ID Proof</Label>
                <Input
                  placeholder="e.g. Aadhaar, PAN"
                  value={formData.id_proof}
                  onChange={(e) =>
                    setFormData({ ...formData, id_proof: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Purpose of Visit *</Label>
              <Select
                value={formData.purpose || ""}
                onValueChange={(v) => setFormData({ ...formData, purpose: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Parent-Teacher Meeting">
                    Parent-Teacher Meeting
                  </SelectItem>
                  <SelectItem value="Student Pickup">Student Pickup</SelectItem>
                  <SelectItem value="Admission Inquiry">
                    Admission Inquiry
                  </SelectItem>
                  <SelectItem value="Fee Payment">Fee Payment</SelectItem>
                  <SelectItem value="Official Meeting">
                    Official Meeting
                  </SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meeting With (Host)</Label>
                <Input
                  placeholder="Teacher/Staff name"
                  value={formData.host_name}
                  onChange={(e) =>
                    setFormData({ ...formData, host_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Related Student ID</Label>
                <Input
                  placeholder="e.g. STU001"
                  value={formData.student_id}
                  onChange={(e) =>
                    setFormData({ ...formData, student_id: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pre_register"
                checked={formData.pre_register}
                onChange={(e) =>
                  setFormData({ ...formData, pre_register: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="pre_register" className="text-sm">
                Pre-register (visitor will check in later)
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {formData.pre_register ? "Pre-Register" : "Check In Visitor"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
