"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError, confirmDelete } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  routeName: string;
  routeStops: Array<{
    stopName: string;
    pickupTime: string;
    dropTime: string;
    order: number;
  }>;
  assignedStudents: Array<{ _id: string; name: string; class_name: string }>;
  status: string;
}

export default function TransportPage() {
  const { canAdd, canDelete } = usePermissions("transport");
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    vehicle_number: "",
    vehicle_type: "bus",
    capacity: 40,
    driver_name: "",
    driver_phone: "",
    driver_license: "",
    route_name: "",
    route_stops: [{ stop_name: "", pickup_time: "", drop_time: "", order: 1 }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/transport");
      if (res.ok) {
        const d = await res.json();
        setVehicles(d.data || []);
      }
    } catch {
      showError("Error", "Failed to fetch transport data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createVehicle = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showSuccess("Success", "Vehicle added");
        setShowDialog(false);
        setForm({
          vehicle_number: "",
          vehicle_type: "bus",
          capacity: 40,
          driver_name: "",
          driver_phone: "",
          driver_license: "",
          route_name: "",
          route_stops: [
            { stop_name: "", pickup_time: "", drop_time: "", order: 1 },
          ],
        });
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to add vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    const confirmed = await confirmDelete("vehicle");
    if (!confirmed) return;
    try {
      await fetch(`/api/transport?id=${id}`, { method: "DELETE" });
      showSuccess("Deleted", "Vehicle deleted successfully");
      fetchData();
    } catch {
      showError("Error", "Failed to delete vehicle");
    }
  };

  const addStop = () => {
    setForm({
      ...form,
      route_stops: [
        ...form.route_stops,
        {
          stop_name: "",
          pickup_time: "",
          drop_time: "",
          order: form.route_stops.length + 1,
        },
      ],
    });
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
            Transport Management
          </h1>
          <p className="text-slate-500">
            Manage institution buses, routes and drivers
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Vehicles</p>
            <p className="text-2xl font-bold text-blue-600">
              {vehicles.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active Routes</p>
            <p className="text-2xl font-bold text-green-600">
              {vehicles.filter((v) => v.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Capacity</p>
            <p className="text-2xl font-bold text-purple-600">
              {vehicles.reduce((s, v) => s + v.capacity, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <Card
            key={v._id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedVehicle(v)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{v.vehicleNumber}</CardTitle>
                <Badge
                  variant={v.status === "active" ? "present" : "secondary"}
                >
                  {v.status}
                </Badge>
              </div>
              <CardDescription>{v.routeName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="capitalize">{v.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Driver:</span>
                  <span>{v.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Capacity:</span>
                  <span>
                    {v.assignedStudents?.length || 0}/{v.capacity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stops:</span>
                  <span>{v.routeStops?.length || 0}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                {canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteVehicle(v._id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vehicle Detail Dialog */}
      <Dialog
        open={!!selectedVehicle}
        onOpenChange={() => setSelectedVehicle(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedVehicle?.vehicleNumber} - {selectedVehicle?.routeName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Driver:</span>{" "}
                {selectedVehicle?.driverName}
              </div>
              <div>
                <span className="text-slate-500">Phone:</span>{" "}
                {selectedVehicle?.driverPhone}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Route Stops
              </h4>
              <div className="space-y-2">
                {selectedVehicle?.routeStops
                  ?.sort((a, b) => a.order - b.order)
                  .map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded border p-2 text-sm"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {s.order}
                      </span>
                      <span className="flex-1 font-medium">{s.stopName}</span>
                      <span className="text-slate-500">
                        {s.pickupTime} → {s.dropTime}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">
                Assigned Students (
                {selectedVehicle?.assignedStudents?.length || 0})
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedVehicle?.assignedStudents?.map((s) => (
                  <div key={s._id} className="text-sm">
                    {s.name} - {s.class_name}
                  </div>
                ))}
                {(!selectedVehicle?.assignedStudents ||
                  selectedVehicle.assignedStudents.length === 0) && (
                  <p className="text-sm text-slate-500">No students assigned</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Vehicle Number</Label>
                <Input
                  value={form.vehicle_number}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_number: e.target.value })
                  }
                  placeholder="AP 01 AB 1234"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Input
                  value={form.vehicle_type}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: e.target.value })
                  }
                  placeholder="bus"
                />
              </div>
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Driver Name</Label>
                <Input
                  value={form.driver_name}
                  onChange={(e) =>
                    setForm({ ...form, driver_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Driver Phone</Label>
                <Input
                  value={form.driver_phone}
                  onChange={(e) =>
                    setForm({ ...form, driver_phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Driver License</Label>
              <Input
                value={form.driver_license}
                onChange={(e) =>
                  setForm({ ...form, driver_license: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Route Name</Label>
              <Input
                value={form.route_name}
                onChange={(e) =>
                  setForm({ ...form, route_name: e.target.value })
                }
                placeholder="Route A - City Center"
              />
            </div>

            <div>
              <Label>Route Stops</Label>
              <div className="space-y-2 mt-1">
                {form.route_stops.map((stop, i) => (
                  <div key={i} className="grid grid-cols-4 gap-1">
                    <Input
                      placeholder="Stop Name"
                      value={stop.stop_name}
                      onChange={(e) => {
                        const stops = [...form.route_stops];
                        stops[i].stop_name = e.target.value;
                        setForm({ ...form, route_stops: stops });
                      }}
                      className="col-span-2"
                    />
                    <Input
                      placeholder="Pickup"
                      value={stop.pickup_time}
                      onChange={(e) => {
                        const stops = [...form.route_stops];
                        stops[i].pickup_time = e.target.value;
                        setForm({ ...form, route_stops: stops });
                      }}
                    />
                    <Input
                      placeholder="Drop"
                      value={stop.drop_time}
                      onChange={(e) => {
                        const stops = [...form.route_stops];
                        stops[i].drop_time = e.target.value;
                        setForm({ ...form, route_stops: stops });
                      }}
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addStop}
                className="mt-2"
              >
                + Add Stop
              </Button>
            </div>

            <Button
              onClick={createVehicle}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Saving..." : "Add Vehicle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
