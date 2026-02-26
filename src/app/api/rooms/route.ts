import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Room from "@/lib/models/Room";
import RoomBooking from "@/lib/models/RoomBooking";
import { requireAuth, requireRole } from "@/lib/permissions";
import {
  addRoomSchema,
  bookRoomSchema,
  validationError,
} from "@/lib/validators";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("rooms:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const date = searchParams.get("date");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );

    await connectDB();

    if (type === "rooms") {
      const rooms = await Room.find({ school: session!.user.school_id }).lean();
      const data = rooms.map((r) => ({
        room_id: r._id.toString(),
        school_id: r.school.toString(),
        room_name: r.room_name,
        room_type: r.room_type,
        capacity: r.capacity || "",
        floor: r.floor || "",
        facilities: r.facilities || "",
        status: r.status,
      }));
      return NextResponse.json({ data });
    }

    const bookingQuery: Record<string, unknown> = {
      school: session!.user.school_id,
    };
    if (date) bookingQuery.date = date;

    const total = await RoomBooking.countDocuments(bookingQuery);
    const bookings = await RoomBooking.find(bookingQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const rooms = await Room.find({ school: session!.user.school_id }).lean();

    const data = bookings.map((b) => ({
      booking_id: b._id.toString(),
      school_id: b.school.toString(),
      room_name: b.room_name,
      room_type: b.room_type || "",
      booked_by: b.booked_by?.toString() || "",
      booked_by_name: b.booked_by_name || "",
      date: b.date,
      start_time: b.start_time,
      end_time: b.end_time,
      purpose: b.purpose || "",
      attendees: b.attendees || "",
      equipment_needed: b.equipment_needed || "",
      status: b.status,
      created_at: b.createdAt?.toISOString() || "",
    }));

    const roomData = rooms.map((r) => ({
      room_id: r._id.toString(),
      room_name: r.room_name,
      room_type: r.room_type,
      capacity: r.capacity || "",
      status: r.status,
    }));

    return NextResponse.json({
      data,
      rooms: roomData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logError("GET", "/api/rooms", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("rooms:write");
    if (error) return error;

    const body = await request.json();
    const { action } = body;

    await connectDB();

    if (action === "add_room") {
      const { error: roleError } = await requireRole("admin");
      if (roleError) return roleError;

      const parsed = addRoomSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const { room_name, room_type, capacity, floor, facilities } = parsed.data;

      const room = await Room.create({
        school: session!.user.school_id,
        room_name,
        room_type,
        capacity: capacity ? Number(capacity) : 0,
        floor: floor || "",
        facilities: facilities || "",
        status: "available",
      });

      await audit({
        action: "create",
        entity: "room",
        entityId: room._id.toString(),
        schoolId: session!.user.school_id,
        userId: session!.user.id || "",
        userName: session!.user.name,
        userRole: session!.user.role,
      });

      emitActivity({
        type: "room:created",
        title: "New Room Added",
        message: `Room "${room_name}" has been added`,
        module: "rooms",
        entityId: room._id.toString(),
        actionUrl: "/rooms",
        session: session!,
      });

      return NextResponse.json({
        message: "Room added",
        data: { room_id: room._id.toString() },
      });
    }

    // Default: book a room
    const parsed = bookRoomSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const {
      room_name,
      date,
      start_time,
      end_time,
      purpose,
      attendees,
      equipment_needed,
    } = parsed.data;

    const conflict = await RoomBooking.findOne({
      school: session!.user.school_id,
      room_name,
      date,
      status: { $ne: "cancelled" },
      start_time: { $lt: end_time },
      end_time: { $gt: start_time },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Room is already booked for this time slot" },
        { status: 409 },
      );
    }

    const room = await Room.findOne({
      room_name,
      school: session!.user.school_id,
    }).lean();

    const booking = await RoomBooking.create({
      school: session!.user.school_id,
      room_name,
      room_type: room?.room_type || "",
      booked_by: session!.user.id,
      booked_by_name: session!.user.name || "",
      date,
      start_time,
      end_time,
      purpose: purpose || "",
      attendees: attendees || "",
      equipment_needed: equipment_needed || "",
      status: "confirmed",
    });

    await audit({
      action: "create",
      entity: "room_booking",
      entityId: booking._id.toString(),
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    emitActivity({
      type: "room:booked",
      title: "Room Booked",
      message: `Room "${room_name}" booked for ${date} (${start_time}-${end_time})`,
      module: "rooms",
      entityId: booking._id.toString(),
      actionUrl: "/rooms",
      session: session!,
    });

    return NextResponse.json({
      message: "Room booked successfully",
      data: { booking_id: booking._id.toString() },
    });
  } catch (error) {
    logError("POST", "/api/rooms", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("rooms:write");
    if (error) return error;

    const body = await request.json();
    const { booking_id, action } = body;

    if (!booking_id) {
      return NextResponse.json(
        { error: "booking_id is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const allowedActions = ["cancel", "confirm", "complete"];
    const newStatus = allowedActions.includes(action)
      ? action === "cancel"
        ? "cancelled"
        : action === "confirm"
          ? "confirmed"
          : "completed"
      : null;
    if (!newStatus) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${allowedActions.join(", ")}` },
        { status: 400 },
      );
    }
    const result = await RoomBooking.findOneAndUpdate(
      { _id: booking_id, school: session!.user.school_id },
      { status: newStatus },
    );

    if (!result) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    await audit({
      action: "update",
      entity: "room_booking",
      entityId: booking_id,
      schoolId: session!.user.school_id,
      userId: session!.user.id || "",
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { action: newStatus },
    });

    emitActivity({
      type: "room:booking_updated",
      title: "Room Booking Updated",
      message: `Room booking has been ${newStatus}`,
      module: "rooms",
      entityId: booking_id,
      actionUrl: "/rooms",
      session: session!,
    });

    return NextResponse.json({ message: "Booking updated" });
  } catch (error) {
    logError("PUT", "/api/rooms", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
