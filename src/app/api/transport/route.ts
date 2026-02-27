import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import Transport from "@/lib/models/Transport";
import Student from "@/lib/models/Student";
import { transportSchema, validationError } from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";
import { escapeRegex } from "@/lib/utils";
import { notifyTransportUpdate } from "@/lib/twilio-notifications";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("transport:read");
    if (error) return error;

    await connectDB();
    const schoolId = session!.user.school_id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const routeName = searchParams.get("route");

    const query: Record<string, unknown> = { school: schoolId };
    if (status) query.status = status;
    if (routeName)
      query.routeName = { $regex: escapeRegex(routeName), $options: "i" };

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );

    const [vehicles, total] = await Promise.all([
      Transport.find(query)
        .populate("assignedStudents", "name class_name roll_number")
        .sort({ routeName: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transport.countDocuments(query),
    ]);

    logRequest("GET", "/api/transport", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      data: vehicles,
      total,
      page,
      limit,
    });
  } catch (err) {
    logError("GET", "/api/transport", err);
    return NextResponse.json(
      { error: "Failed to fetch transport" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("transport:write");
    if (error) return error;

    const body = await request.json();
    const parsed = transportSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const vehicle = await Transport.create({
      school: schoolId,
      vehicleNumber: parsed.data.vehicle_number,
      vehicleType: parsed.data.vehicle_type,
      capacity: parsed.data.capacity,
      driverName: parsed.data.driver_name,
      driverPhone: parsed.data.driver_phone,
      driverLicense: parsed.data.driver_license,
      routeName: parsed.data.route_name,
      routeStops: parsed.data.route_stops.map((s) => ({
        stopName: s.stop_name,
        pickupTime: s.pickup_time,
        dropTime: s.drop_time,
        order: s.order,
      })),
    });

    createAuditLog({
      school: schoolId,
      action: "create",
      entity: "transport",
      entityId: vehicle._id.toString(),
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: {
        vehicleNumber: parsed.data.vehicle_number,
        route: parsed.data.route_name,
      },
    });

    logRequest("POST", "/api/transport", session!.user.id, schoolId);

    emitActivity({
      type: "transport:updated",
      title: "New Transport Route Added",
      message: `Vehicle ${parsed.data.vehicle_number} added on route ${parsed.data.route_name}`,
      module: "transport",
      entityId: vehicle._id.toString(),
      actionUrl: "/transport",
      session: session!,
    });

    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (err) {
    logError("POST", "/api/transport", err);
    return NextResponse.json(
      { error: "Failed to create transport" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("transport:write");
    if (error) return error;

    const body = await request.json();
    const { vehicle_id, action, student_id, ...updates } = body;

    if (!vehicle_id) {
      return NextResponse.json(
        { error: "vehicle_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // CRITICAL: Scope by school for multi-tenant isolation
    const vehicle = await Transport.findOne({
      _id: vehicle_id,
      school: schoolId,
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (action === "assign_student" && student_id) {
      if (!vehicle.assignedStudents.includes(student_id)) {
        vehicle.assignedStudents.push(student_id);
      }
      // Notify parent about transport assignment
      try {
        const student = await Student.findById(student_id)
          .select("name parent_phone")
          .lean();
        if (student?.parent_phone) {
          notifyTransportUpdate(
            student.parent_phone,
            student.name,
            vehicle.routeName,
            vehicle.vehicleNumber,
            "assigned to",
          ).catch(() => {});
        }
      } catch {
        /* best-effort */
      }
    } else if (action === "remove_student" && student_id) {
      vehicle.assignedStudents = vehicle.assignedStudents.filter(
        (s) => s.toString() !== student_id,
      );
      // Notify parent about transport removal
      try {
        const student = await Student.findById(student_id)
          .select("name parent_phone")
          .lean();
        if (student?.parent_phone) {
          notifyTransportUpdate(
            student.parent_phone,
            student.name,
            vehicle.routeName,
            vehicle.vehicleNumber,
            "removed from",
          ).catch(() => {});
        }
      } catch {
        /* best-effort */
      }
    } else {
      if (updates.driver_name) vehicle.driverName = updates.driver_name;
      if (updates.driver_phone) vehicle.driverPhone = updates.driver_phone;
      if (updates.route_name) vehicle.routeName = updates.route_name;
      if (updates.capacity) vehicle.capacity = updates.capacity;
      if (updates.status) vehicle.status = updates.status;
      if (updates.route_stops) {
        vehicle.routeStops = updates.route_stops.map(
          (s: Record<string, unknown>) => ({
            stopName: s.stop_name,
            pickupTime: s.pickup_time,
            dropTime: s.drop_time,
            order: s.order,
          }),
        );
      }
    }

    await vehicle.save();

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "transport",
      entityId: vehicle_id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { action: action || "update" },
    });

    logRequest(
      "PUT",
      "/api/transport",
      session!.user.id,
      session!.user.school_id,
    );

    emitActivity({
      type: "transport:updated",
      title: "Transport Updated",
      message: `Vehicle ${vehicle.vehicleNumber} on route ${vehicle.routeName} was updated`,
      module: "transport",
      entityId: vehicle_id,
      actionUrl: "/transport",
      session: session!,
    });

    return NextResponse.json({ success: true, data: vehicle });
  } catch (err) {
    logError("PUT", "/api/transport", err);
    return NextResponse.json(
      { error: "Failed to update transport" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("transport:manage");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Vehicle ID required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    // CRITICAL: Scope by school for multi-tenant isolation
    const deleted = await Transport.findOneAndDelete({
      _id: id,
      school: schoolId,
    });
    if (!deleted) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "transport",
      entityId: id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
    });

    logRequest("DELETE", "/api/transport", session!.user.id, schoolId);

    emitActivity({
      type: "transport:updated",
      title: "Transport Vehicle Removed",
      message: `Vehicle ${deleted.vehicleNumber} has been removed`,
      module: "transport",
      entityId: id,
      actionUrl: "/transport",
      session: session!,
    });

    return NextResponse.json({ success: true, message: "Vehicle deleted" });
  } catch (err) {
    logError("DELETE", "/api/transport", err);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 },
    );
  }
}
