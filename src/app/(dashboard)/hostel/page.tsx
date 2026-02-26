"use client";

import { useEffect, useState, useCallback } from "react";
import { BedDouble, Plus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError, confirmAlert } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface HostelInfo {
  _id: string;
  name: string;
  type: string;
  totalRooms: number;
  totalBeds: number;
}

interface HostelSummary {
  hostel_id: string;
  name: string;
  type: string;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
}

interface Allocation {
  _id: string;
  hostelName: string;
  roomNumber: string;
  bedNumber: string;
  studentName: string;
  className: string;
  checkInDate: string;
  monthlyFee: number;
  status: string;
}

export default function HostelPage() {
  const { canAdd, canDelete } = usePermissions("hostel");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "allocations">("overview");
  const [hostels, setHostels] = useState<HostelInfo[]>([]);
  const [summaryData, setSummaryData] = useState<HostelSummary[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [showHostelDialog, setShowHostelDialog] = useState(false);
  const [showAllocDialog, setShowAllocDialog] = useState(false);
  const [hostelForm, setHostelForm] = useState({
    name: "",
    type: "boys",
    total_rooms: 20,
    total_beds: 80,
    warden_phone: "",
    facilities: [] as string[],
  });
  const [allocForm, setAllocForm] = useState({
    hostel_id: "",
    room_number: "",
    bed_number: "",
    student_id: "",
    check_in_date: "",
    monthly_fee: 0,
  });
  const [students, setStudents] = useState<
    Array<{ _id: string; name: string; class_name: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [hRes, sRes, aRes] = await Promise.all([
        fetch("/api/hostel?type=hostels"),
        fetch("/api/hostel?type=summary"),
        fetch("/api/hostel?type=allocations"),
      ]);

      if (hRes.ok) {
        const d = await hRes.json();
        setHostels(d.data || []);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        setSummaryData(d.data || []);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setAllocations(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch hostel data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const d = await res.json();
        setStudents(d.data || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStudents();
  }, [fetchData, fetchStudents]);

  const createHostel = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/hostel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_hostel", ...hostelForm }),
      });
      if (res.ok) {
        showSuccess("Success", "Hostel created");
        setShowHostelDialog(false);
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to create hostel");
    } finally {
      setSubmitting(false);
    }
  };

  const allocateStudent = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/hostel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "allocate", ...allocForm }),
      });
      if (res.ok) {
        showSuccess("Success", "Student allocated");
        setShowAllocDialog(false);
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to allocate student");
    } finally {
      setSubmitting(false);
    }
  };

  const vacateStudent = async (allocationId: string) => {
    const confirmed = await confirmAlert(
      "Vacate Student",
      "Are you sure you want to vacate this student?",
      "Yes, Vacate",
      "warning",
    );
    if (!confirmed) return;
    try {
      const res = await fetch("/api/hostel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vacate", allocation_id: allocationId }),
      });
      if (res.ok) {
        showSuccess("Success", "Student vacated");
        fetchData();
      }
    } catch {
      showError("Error", "Failed to vacate student");
    }
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
            Hostel Management
          </h1>
          <p className="text-muted-foreground">
            Manage hostels and student allocations
          </p>
        </div>
        <div className="flex gap-2">
          {canAdd && (
            <Button onClick={() => setShowHostelDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Hostel
            </Button>
          )}
          {canAdd && (
            <Button variant="outline" onClick={() => setShowAllocDialog(true)}>
              <BedDouble className="mr-2 h-4 w-4" />
              Allocate Student
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["overview", "allocations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaryData.map((h) => (
            <Card key={h.hostel_id}>
              <CardHeader className="pb-2">
                <CardTitle>{h.name}</CardTitle>
                <CardDescription className="capitalize">
                  {h.type} Hostel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Beds:</span>
                    <span className="font-medium">{h.total_beds}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Occupied:</span>
                    <span className="font-medium text-amber-600">
                      {h.occupied_beds}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium text-green-600">
                      {h.available_beds}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${h.occupancy_rate}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {h.occupancy_rate}% Occupancy
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {summaryData.length === 0 && (
            <p className="col-span-3 text-center text-muted-foreground py-8">
              No hostels created yet
            </p>
          )}
        </div>
      )}

      {tab === "allocations" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Hostel</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground"
                    >
                      No allocations
                    </TableCell>
                  </TableRow>
                ) : (
                  allocations.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell className="font-medium">
                        {a.studentName}
                      </TableCell>
                      <TableCell>{a.className}</TableCell>
                      <TableCell>{a.hostelName}</TableCell>
                      <TableCell>{a.roomNumber}</TableCell>
                      <TableCell>{a.bedNumber}</TableCell>
                      <TableCell>
                        {a.checkInDate
                          ? new Date(a.checkInDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        ₹{(a.monthlyFee ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.status === "active" ? "present" : "secondary"
                          }
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.status === "active" && canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => vacateStudent(a._id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Hostel Dialog */}
      <Dialog open={showHostelDialog} onOpenChange={setShowHostelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Hostel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={hostelForm.name}
                onChange={(e) =>
                  setHostelForm({ ...hostelForm, name: e.target.value })
                }
                placeholder="Boys Hostel A"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={hostelForm.type}
                onValueChange={(v) => setHostelForm({ ...hostelForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["boys", "girls", "co-ed"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Total Rooms</Label>
                <Input
                  type="number"
                  value={hostelForm.total_rooms}
                  onChange={(e) =>
                    setHostelForm({
                      ...hostelForm,
                      total_rooms: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Total Beds</Label>
                <Input
                  type="number"
                  value={hostelForm.total_beds}
                  onChange={(e) =>
                    setHostelForm({
                      ...hostelForm,
                      total_beds: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Warden Phone</Label>
              <Input
                value={hostelForm.warden_phone}
                onChange={(e) =>
                  setHostelForm({ ...hostelForm, warden_phone: e.target.value })
                }
              />
            </div>
            <Button
              onClick={createHostel}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Creating..." : "Create Hostel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allocate Dialog */}
      <Dialog open={showAllocDialog} onOpenChange={setShowAllocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Hostel</Label>
              <Select
                value={allocForm.hostel_id || undefined}
                onValueChange={(v) =>
                  setAllocForm({ ...allocForm, hostel_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hostel" />
                </SelectTrigger>
                <SelectContent>
                  {hostels.map((h) => (
                    <SelectItem key={h._id} value={h._id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student</Label>
              <Select
                value={allocForm.student_id || undefined}
                onValueChange={(v) =>
                  setAllocForm({ ...allocForm, student_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} - {s.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Room Number</Label>
                <Input
                  value={allocForm.room_number}
                  onChange={(e) =>
                    setAllocForm({ ...allocForm, room_number: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Bed Number</Label>
                <Input
                  value={allocForm.bed_number}
                  onChange={(e) =>
                    setAllocForm({ ...allocForm, bed_number: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Check-in Date</Label>
              <Input
                type="date"
                value={allocForm.check_in_date}
                onChange={(e) =>
                  setAllocForm({ ...allocForm, check_in_date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Monthly Fee (₹)</Label>
              <Input
                type="number"
                value={allocForm.monthly_fee}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    monthly_fee: Number(e.target.value),
                  })
                }
              />
            </div>
            <Button
              onClick={allocateStudent}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Allocating..." : "Allocate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
