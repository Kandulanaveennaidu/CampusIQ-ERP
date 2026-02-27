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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showSuccess, showError } from "@/lib/alerts";
import {
  Building2,
  Calendar,
  Clock,
  Plus,
  Users,
  X,
  MapPin,
  Monitor,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

interface Room {
  room_id: string;
  room_name: string;
  room_type: string;
  capacity: string;
  floor: string;
  facilities: string;
  status: string;
}

interface Booking {
  booking_id: string;
  room_name: string;
  room_type: string;
  booked_by_name: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  attendees: string;
  equipment_needed: string;
  status: string;
  created_at: string;
}

export default function RoomBookingPage() {
  const { data: session } = useSession();

  const { canAdd, canDelete } = usePermissions("rooms");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"rooms" | "bookings">("rooms");

  // Booking form
  const [bookingForm, setBookingForm] = useState({
    room_name: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "10:00",
    purpose: "",
    attendees: "",
    equipment_needed: "",
  });

  // Add room form
  const [roomForm, setRoomForm] = useState({
    room_name: "",
    room_type: "lab",
    capacity: "",
    floor: "",
    facilities: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsRes, bookingsRes] = await Promise.all([
        fetch("/api/rooms?type=rooms"),
        fetch(`/api/rooms?date=${selectedDate}`),
      ]);
      if (roomsRes.ok) {
        const rd = await roomsRes.json();
        setRooms(rd.data || []);
      }
      if (bookingsRes.ok) {
        const bd = await bookingsRes.json();
        setBookings(bd.data || []);
      }
    } catch {
      showError("Error", "Failed to load room data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBookRoom = async () => {
    if (!bookingForm.room_name || !bookingForm.date) {
      showError("Error", "Please fill required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingForm),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Success", "Room booked successfully!");
        setBookingDialogOpen(false);
        setBookingForm({
          room_name: "",
          date: new Date().toISOString().split("T")[0],
          start_time: "09:00",
          end_time: "10:00",
          purpose: "",
          attendees: "",
          equipment_needed: "",
        });
        fetchData();
      } else {
        showError("Error", data.error || "Booking failed");
      }
    } catch {
      showError("Error", "Failed to book room");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRoom = async () => {
    if (!roomForm.room_name || !roomForm.room_type) {
      showError("Error", "Room name and type are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_room", ...roomForm }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Success", "Room added!");
        setAddRoomDialogOpen(false);
        setRoomForm({
          room_name: "",
          room_type: "lab",
          capacity: "",
          floor: "",
          facilities: "",
        });
        fetchData();
      } else {
        showError("Error", data.error || "Failed to add room");
      }
    } catch {
      showError("Error", "Failed to add room");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await fetch("/api/rooms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, action: "cancel" }),
      });
      if (res.ok) {
        showSuccess("Success", "Booking cancelled");
        fetchData();
      }
    } catch {
      showError("Error", "Failed to cancel booking");
    }
  };

  const getRoomBookings = (roomName: string) => {
    return bookings.filter(
      (b) => b.room_name === roomName && b.status !== "cancelled",
    );
  };

  const isAdmin = session?.user?.role === "admin" || canAdd;

  const roomTypeIcons: Record<string, string> = {
    lab: "🔬",
    auditorium: "🎭",
    sports: "🏀",
    library: "📚",
    conference: "🤝",
    classroom: "📝",
  };

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-muted text-foreground",
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
            Room & Facility Booking
          </h1>
          <p className="text-muted-foreground mt-1">
            Book labs, auditoriums & facilities
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
            {canAdd && (
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Book Room
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Book a Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Room *</Label>
                  <Select
                    value={bookingForm.room_name}
                    onValueChange={(v) =>
                      setBookingForm({ ...bookingForm, room_name: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms
                        .filter((r) => r.status === "available")
                        .map((r) => (
                          <SelectItem key={r.room_id} value={r.room_name}>
                            {roomTypeIcons[r.room_type] || "🏢"} {r.room_name}{" "}
                            (Cap: {r.capacity})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={bookingForm.date}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Purpose</Label>
                    <Select
                      value={bookingForm.purpose}
                      onValueChange={(v) =>
                        setBookingForm({ ...bookingForm, purpose: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Class">Class</SelectItem>
                        <SelectItem value="Lab Session">Lab Session</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Event">Event</SelectItem>
                        <SelectItem value="Exam">Exam</SelectItem>
                        <SelectItem value="Workshop">Workshop</SelectItem>
                        <SelectItem value="Practice">Practice</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time *</Label>
                    <Input
                      type="time"
                      value={bookingForm.start_time}
                      onChange={(e) =>
                        setBookingForm({
                          ...bookingForm,
                          start_time: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>End Time *</Label>
                    <Input
                      type="time"
                      value={bookingForm.end_time}
                      onChange={(e) =>
                        setBookingForm({
                          ...bookingForm,
                          end_time: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Expected Attendees</Label>
                  <Input
                    type="number"
                    value={bookingForm.attendees}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        attendees: e.target.value,
                      })
                    }
                    placeholder="Number of attendees"
                  />
                </div>
                <div>
                  <Label>Equipment Needed</Label>
                  <Input
                    value={bookingForm.equipment_needed}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        equipment_needed: e.target.value,
                      })
                    }
                    placeholder="Projector, Whiteboard, etc."
                  />
                </div>
                <Button
                  onClick={handleBookRoom}
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? "Booking..." : "Book Room"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isAdmin && (
            <Dialog
              open={addRoomDialogOpen}
              onOpenChange={setAddRoomDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building2 className="h-4 w-4 mr-2" />
                  Add Room
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Room Name *</Label>
                    <Input
                      value={roomForm.room_name}
                      onChange={(e) =>
                        setRoomForm({ ...roomForm, room_name: e.target.value })
                      }
                      placeholder="e.g. Computer Lab 2"
                    />
                  </div>
                  <div>
                    <Label>Room Type *</Label>
                    <Select
                      value={roomForm.room_type}
                      onValueChange={(v) =>
                        setRoomForm({ ...roomForm, room_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lab">🔬 Lab</SelectItem>
                        <SelectItem value="auditorium">
                          🎭 Auditorium
                        </SelectItem>
                        <SelectItem value="sports">🏀 Sports Hall</SelectItem>
                        <SelectItem value="library">📚 Library</SelectItem>
                        <SelectItem value="conference">
                          🤝 Conference Room
                        </SelectItem>
                        <SelectItem value="classroom">📝 Classroom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Capacity</Label>
                      <Input
                        type="number"
                        value={roomForm.capacity}
                        onChange={(e) =>
                          setRoomForm({ ...roomForm, capacity: e.target.value })
                        }
                        placeholder="40"
                      />
                    </div>
                    <div>
                      <Label>Floor</Label>
                      <Input
                        value={roomForm.floor}
                        onChange={(e) =>
                          setRoomForm({ ...roomForm, floor: e.target.value })
                        }
                        placeholder="Ground Floor"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Facilities</Label>
                    <Input
                      value={roomForm.facilities}
                      onChange={(e) =>
                        setRoomForm({ ...roomForm, facilities: e.target.value })
                      }
                      placeholder="Projector, AC, Whiteboard"
                    />
                  </div>
                  <Button
                    onClick={handleAddRoom}
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Adding..." : "Add Room"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rooms.length}</p>
                <p className="text-sm text-muted-foreground">Total Rooms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {bookings.filter((b) => b.status === "confirmed").length}
                </p>
                <p className="text-sm text-muted-foreground">Today&apos;s Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {rooms.filter((r) => r.status === "available").length}
                </p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {rooms.filter((r) => r.status === "maintenance").length}
                </p>
                <p className="text-sm text-muted-foreground">Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle & Date Filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "rooms" ? "default" : "outline"}
            onClick={() => setViewMode("rooms")}
            size="sm"
          >
            <Building2 className="h-4 w-4 mr-1" />
            Rooms
          </Button>
          <Button
            variant={viewMode === "bookings" ? "default" : "outline"}
            onClick={() => setViewMode("bookings")}
            size="sm"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Bookings
          </Button>
        </div>
        {viewMode === "bookings" && (
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        )}
      </div>

      {/* Rooms Grid View */}
      {viewMode === "rooms" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const roomBookings = getRoomBookings(room.room_name);
            return (
              <Card
                key={room.room_id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {roomTypeIcons[room.room_type] || "🏢"}
                        {room.room_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground capitalize mt-1">
                        {room.room_type}
                      </p>
                    </div>
                    <Badge
                      className={
                        room.status === "available"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {room.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {room.capacity || "N/A"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {room.floor || "N/A"}
                    </span>
                  </div>
                  {room.facilities && (
                    <div className="flex items-start gap-1 text-sm text-muted-foreground">
                      <Monitor className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{room.facilities}</span>
                    </div>
                  )}

                  {/* Today's bookings for this room */}
                  {roomBookings.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        TODAY&apos;S BOOKINGS
                      </p>
                      {roomBookings.slice(0, 3).map((b) => (
                        <div
                          key={b.booking_id}
                          className="flex justify-between items-center text-xs py-1"
                        >
                          <span className="text-foreground">
                            {b.start_time} - {b.end_time}
                          </span>
                          <span className="text-muted-foreground truncate max-w-[120px]">
                            {b.booked_by_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setBookingForm({
                        ...bookingForm,
                        room_name: room.room_name,
                      });
                      setBookingDialogOpen(true);
                    }}
                    disabled={room.status !== "available"}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Book This Room
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {rooms.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No rooms available</p>
              {isAdmin && (
                <p className="text-sm mt-1">Add rooms using the button above</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bookings Table View */}
      {viewMode === "bookings" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Booked By</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Attendees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.booking_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.room_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {booking.room_type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{booking.booked_by_name}</TableCell>
                    <TableCell>
                      {booking.start_time} - {booking.end_time}
                    </TableCell>
                    <TableCell>{booking.purpose || "-"}</TableCell>
                    <TableCell>{booking.attendees || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusColors[booking.status] ||
                          "bg-muted text-foreground"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {booking.status === "confirmed" && canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCancelBooking(booking.booking_id)
                          }
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-muted-foreground">
                        No bookings for {selectedDate}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
